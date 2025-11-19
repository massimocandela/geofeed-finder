import batchPromises from "batch-promises";
import axios from "redaxios";
import WhoisParser from "bulk-whois-parser";
import LongestPrefixMatch from "longest-prefix-match";
import CsvParser from "./csvParser";
import md5 from "md5";
import fs from "fs";
import moment from "moment";
import ipUtils from "ip-sub";
import {explicitTransferCheck, lessSpecific} from "whois-wrapper";

require("events").EventEmitter.defaultMaxListeners = 200;

export default class Finder {
    constructor(params) {
        const defaults = {
            cacheDir: ".cache/",
            whoisCacheDays: 3,
            geofeedCacheDays: 7,
            af: [4, 6],
            includeZip: false,
            silent: false,
            keepNonIso: false,
            keepInvalidSubdivisions: false,
            removeInvalidSubdivisions: false,
            include: ["ripe", "afrinic", "apnic", "arin", "lacnic"],
            output: "result.csv",
            test: null,
            downloadTimeout: 14,
            daysWhoisSuballocationsCache: 7, // Cannot be less than this
            skipSuballocations: false,
            compileSuballocationLocally: false
        };
        this.params = {
            ...defaults,
            ...(params ?? {})
        };
        this.logger = this.params.logger;
        this.cacheDir = this.params.cacheDir.split("/").filter(i => !!i).join("/") + "/";
        this.csvParser = new CsvParser();
        this.startTime = moment();

        this.cacheHeadersIndexFileName = this.cacheDir + "cache-index.json";
        this._importCacheHeaderIndex();

        this.connectors = defaults.include.filter(key => this.params.include.includes(key));

        this.whois = new WhoisParser({
            cacheDir: this.cacheDir,
            repos: this.connectors,
            daysWhoisSuballocationsCache: this.params.daysWhoisSuballocationsCache,
            skipSuballocations: this.params.skipSuballocations,
            defaultCacheDays: this.params.whoisCacheDays,
            compileSuballocationLocally: this.params.compileSuballocationLocally,
            userAgent: "geofeed-finder",
            deleteCorruptedCacheFile: true
        });
    };


    filterFunction = (inetnum) => {

        if (inetnum.geofeed && this.matchGeofeedFile(inetnum.geofeed).length) {
            return true;
        }

        if (inetnum?.remarks?.length > 0) {
            return inetnum.remarks.some(this.testGeofeedRemark);
        }

        return false;
    };

    getBlocks = () => {
        const selector = this.params.af
            .map(i => i === 4 ? "inetnum" : "inet6num");

        return this.whois
            .getObjects(selector, this.filterFunction, ["inetnum", "inet6num", "remarks", "geofeed", "last-updated"])
            .then(blocks => blocks.flat().filter(i => !!i.inetnum || !!i.inet6num))
            .catch(this.logger.log);
    };

    _getFileName = (file) => {
        return this.cacheDir + md5(file);
    };

    _setGeofeedCacheHeaders = (response, cachedFile) => {
        let setAge = 3600 * 24 * (this.params.geofeedCacheDays || 7); // default 1 week (see draft)

        if (response.headers["cache-control"]) {
            const maxAge = response.headers["cache-control"]
                .split(",")
                .filter(h => h.includes("max-age"))
                .map(h => h.trim())
                .pop();

            let age = maxAge?.split("=")?.pop() ?? 0;
            age = isNaN(age) ? 0 : age;
            setAge = Math.min(Math.max(parseInt(age), 3600), 3600 * 24 * 7); //  Min 1 hour, max 1 week of cache (to avoid random max-age settings)
        }

        this.cacheHeadersIndex[cachedFile] = this.cacheHeadersIndex[cachedFile] ?? moment(this.startTime).add(setAge, "seconds");
    };

    _isCachedGeofeedValid = (cachedFile) => {
        if (this.params.test) {
            return false;
        } else {
            return fs.existsSync(cachedFile) &&
                this.cacheHeadersIndex[cachedFile] &&
                moment(this.cacheHeadersIndex[cachedFile]).isSameOrAfter(this.startTime);
        }
    };

    _importCacheHeaderIndex = () => {
        let tmp;
        if (fs.existsSync(this.cacheHeadersIndexFileName)) {
            tmp = JSON.parse(fs.readFileSync(this.cacheHeadersIndexFileName, "utf-8"));
            for (let key in tmp) {
                tmp[key] = moment(tmp[key]);
            }
        }

        this.cacheHeadersIndex = tmp || {};
    };

    _persistCacheIndex = () => {
        fs.writeFileSync(this.cacheHeadersIndexFileName, JSON.stringify(this.cacheHeadersIndex));
    };

    logEntry = (file, cache) => {
        console.log(`${file} ${cache ? "[cache]" : "[download]"}`);
    };

    _getGeofeedFile = (file) => {

        const abortTimeout = parseInt(this.params.downloadTimeout) * 1000;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.logger.log(`Error: ${file} timeout`);
                resolve(null);
            }, abortTimeout);

            const resolveAndClear = (data) => {
                resolve(data);
                clearTimeout(timeout);
            };

            const cachedFile = this._getFileName(file);

            if (this._isCachedGeofeedValid(cachedFile)) {

                this.logEntry(file, true);
                resolveAndClear();

            } else {

                if (fs.existsSync(cachedFile)) {
                    fs.unlinkSync(cachedFile);
                }

                this.logEntry(file, false);

                axios({
                    url: file,
                    method: "GET",
                    timeout: abortTimeout
                })
                    .then(response => {
                        const data = response.data;
                        if (/<a|<div|<span|<style|<link/gi.test(data)) {
                            const message = `Error: ${file} is not CSV but HTML, stop with this nonsense!`;
                            this.logger.log(message);
                            console.log(message);
                            resolveAndClear(null);
                        } else {
                            fs.writeFileSync(cachedFile, data);
                            this._setGeofeedCacheHeaders(response, cachedFile);

                            resolveAndClear();
                        }
                    })
                    .catch(error => {
                        this.logger.log(`Error: ${file} ${error?.message ?? "Unknown error"}`);
                        resolveAndClear();
                    });
            }
        })
            .then(() => {}) // Avoid empty logs
            .catch(() => {}); // Avoid empty logs
    };


    getGeofeedsFiles = (blocks) => {
        const out = [];
        const uniqueBlocks = [...new Set(blocks.map(i => i.geofeed))];
        const half = Math.floor(uniqueBlocks.length / 2);

        // pre load all files
        return Promise.all([
            batchPromises(10, uniqueBlocks.slice(0, half), file => this._getGeofeedFile(file)),
            batchPromises(10, uniqueBlocks.slice(half), file => this._getGeofeedFile(file))
        ])
            .then(() => {

                console.log("All files downloaded. Processing files.");

                for (let block of blocks) {
                    const cachedFile = this._getFileName(block.geofeed);

                    try {
                        const data = fs.readFileSync(cachedFile, "utf8");

                        if (data && data.length) {
                            out.push(this.validateGeofeeds(this.csvParser.parse(block.inetnum, data)));
                        }
                    } catch (error) {
                        // Nothing - these are files that are not CSV
                    }
                }

                const data = out.flat();

                for (let g of data) {
                    if (!this.params.includeZip) {
                        g.zip = null;
                    }
                    g.af = ipUtils.getAddressFamily(g.prefix);
                }


                return data;
            });
    };

    validateGeofeeds = (geofeeds) => {
        return geofeeds
            .filter(geofeed => !!geofeed?.inetnum && !!geofeed?.prefix)
            .filter(geofeed => {
                let errors = geofeed.validate();

                if (this.params.keepInvalidSubdivisions || this.params.removeInvalidSubdivisions) {
                    const noSubErrors = errors.filter(i => !i.includes("Not valid Subdivision Code") && !i.includes("The Subdivision is not inside the Country"));

                    if (this.params.removeInvalidSubdivisions && noSubErrors.length !== errors.length) {
                        geofeed.region = null; // If there is an error in the region and removeInvalidSubdivisions=true, remove the region
                    }

                    errors = noSubErrors; // Ignore subdivision errors.
                }

                if (errors.length > 0) {
                    const message = `${geofeed} ${errors.join(", ")}`;
                    if (this.params.test) {
                        console.log(message);
                    }
                    this.logger.log(message);
                }

                return this.params.keepNonIso || errors.length === 0;
            });

    };

    getMostUpdatedInetnums = (inetnums) => {
        const index = {};
        for (let inetnum of inetnums) {
            index[inetnum.inetnum] = (!index[inetnum.inetnum] || index[inetnum.inetnum].lastUpdate < inetnum.lastUpdate) ?
                inetnum :
                index[inetnum.inetnum];
        }

        return Object.values(index);
    };

    setGeofeedPriority = (geofeeds = []) => {
        console.log("Validating prefix ownership");

        return [
            ...this.params.af.includes(4) ? this._setGeofeedPriority(geofeeds.filter(i => i.af === 4)) : [],
            ...this.params.af.includes(6) ? this._setGeofeedPriority(geofeeds.filter(i => i.af === 6)) : []
        ].flat();
    };

    _setGeofeedPriority = (geofeeds = []) => {
        const longestPrefixMatch = new LongestPrefixMatch();

        let tmp = {};
        for (let inetnum of [...new Set(geofeeds.map(i => i.inetnum))]) {
            longestPrefixMatch.addPrefix(inetnum, inetnum);
        }

        for (let geofeed of geofeeds) {
            const inetnum = longestPrefixMatch.getMatch(geofeed.prefix, false);
            if (inetnum && inetnum.length === 1 && geofeed.inetnum === inetnum[0]) {
                tmp[geofeed.prefix] ??= geofeed;
            }
        }

        return Object.values(tmp);
    };

    testGeofeedRemark = (remark) => {
        return /^Geofeed:?\s+https?:\/\/\S+/gi.test(remark);
    };

    testGeofeedRemarkStrict = (remark) => {
        return /^Geofeed https?:\/\/\S+/gi.test(remark);
    };


    matchGeofeedFile = (remark) => {
        return remark.match(/\bhttps?:\/\/\S+/gi) || [];
    };

    translateObject = (object) => {
        let inetnum = object.inetnum || object.inet6num;
        let remarks = object.remarks ?? [];
        let geofeedField = object?.geofeed?.length ? this.matchGeofeedFile(object.geofeed).pop() : null;

        let inetnums = [inetnum];
        if (!inetnum.includes("/")) {
            const ips = inetnum.split("-").map(ip => ip.trim());
            inetnums = ipUtils.ipRangeToCidr(ips[0], ips[1]);
        }

        const lastUpdate = moment(object["last-updated"]);
        const remark = remarks.find(i => i.toLowerCase().startsWith("geofeed"));

        let geofeed = null;
        if (geofeedField) {
            geofeed = geofeedField;
        } else if (remark) {
            geofeed = this.matchGeofeedFile(remark).pop();
        }

        return inetnums
            .map(inetnum => {

                return {
                    inetnum,
                    geofeed,
                    lastUpdate
                };
            });
    };

    getGeofeedInetnumPairs = () => {
        try {
            if (this.params.test) {
                const prefix = ipUtils.toPrefix(this.params.test.toString().trim());

                if (!ipUtils.isValidPrefix(prefix) && !ipUtils.isValidIP(prefix)) {
                    throw new Error("The input must be an IP or a prefix");
                }

                const index = {};

                return Promise.all([
                    lessSpecific({flag: "h", query: prefix}, (data) => {
                        const flat = data.map(i => i.data).flat().flat().flat();
                        const geofeedAttributes = flat.filter(i => i.key.toLowerCase() === "geofeed");
                        const remarks = flat.filter(i => ["remarks", "comment"].includes(i.key.toLowerCase()));
                        return [...geofeedAttributes, ...remarks].length > 0;
                    }, 12)
                        .then(data => data.map(i => i.data).flat()),
                    explicitTransferCheck({flag: "h", query: prefix}).then(data => data.flat().map(i => i?.data).filter(i => !!i).flat())
                ])
                    .then(answers => answers.flat())
                    .then(answers => {

                        const items = answers.filter(i => i.find(i => ["inetnum", "inet6num", "netrange"].includes(i.key.toLowerCase())) && (i.find(i => i.key === "geofeed") || i.find(i => ["remarks", "comment"].includes(i.key.toLowerCase()) && i.value?.some(this.testGeofeedRemark))));

                        const rangeToPrefix = (inetnum) => {
                            return inetnum?.includes("-")
                                ? ipUtils.ipRangeToCidr(...inetnum?.split("-").map(n => n.trim()))
                                : [inetnum];
                        };

                        for (let item of items) {
                            const inetnums = rangeToPrefix(item.find(i => ["inetnum", "inet6num", "netrange"].includes(i.key.toLowerCase()))?.value);
                            const geofeedAttributes = item.find(i => i.key === "geofeed")?.value;
                            const remarks = item.find(i => ["remarks", "comment"].includes(i.key.toLowerCase()) && i.value?.some(this.testGeofeedRemark))?.value.find(this.testGeofeedRemark);

                            const geofeed = this.matchGeofeedFile(geofeedAttributes ?? remarks)?.[0];

                            if (geofeed) {
                                const strict = !remarks || this.testGeofeedRemarkStrict(remarks);

                                if (!strict) {
                                    console.log(`Error: the remark MUST be in the format: Geofeed https://url/file.csv. Uppercase G, no colon, no quotes, and one space. Current remarks: ${strict}`);
                                }

                                inetnums.forEach(inetnum => {
                                    index[`${inetnum}-${geofeed}`] = {
                                        inetnum,
                                        geofeedAttribute: !!geofeedAttributes,
                                        isRemark: !!remarks,
                                        geofeed,
                                        strict,
                                        whois: item,
                                        lastUpdate: moment() // It doesn't matter in this case
                                    };
                                });
                            }
                        }

                        return Object.values(index);
                    });

            } else {
                return this.getBlocks()
                    .then((objects = []) => objects.map(this.translateObject).flat())
                    .then(this.getMostUpdatedInetnums);
            }
        } catch (error) {
            return Promise.reject(error);
        }
    };

    getGeofeeds = () => {
        return this.getGeofeedInetnumPairs()
            .then(this.getGeofeedsFiles)
            .then(data => {
                this._persistCacheIndex();
                return this.params.test ? data : this.setGeofeedPriority(data);
            });
    };

}
