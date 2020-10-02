import Connector from "./connector";
import axios from "axios";
import fs from "fs";
import moment from "moment";
import https from "https";
import ipUtils from "ip-sub";
import cliProgress from "cli-progress";
import batchPromises from "batch-promises";

export default class ConnectorARIN extends Connector {
    constructor(params) {
        super(params)

        this.connectorName = "arin";
        this.cacheDir += this.connectorName + "/";
        this.statFile = "ftp://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest";
        this.cacheFile = [this.cacheDir, "arin.inetnums"].join("/").replace("//", "/");
        this.daysWhoisCache = 7;

        this.httpsAgent = new https.Agent({ keepAlive: true });

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir,  { recursive: true });
        }

    }

    _getStatFile = () => {
        console.log(`Downloading stat file from ARIN`);

        const file = this.getCacheFileName(this.statFile);

        if (fs.existsSync(file)){
            return Promise.resolve(fs.readFileSync(file, 'utf-8'));
        } else {
            return axios({
                url: this.statFile,
                method: 'GET',
            })
                .then(response => {

                    fs.writeFileSync(file, response.data);
                    return response.data;
                });
        }
    };

    _toPrefix = (firstIp, hosts) => {
        const af = ipUtils.getAddressFamily(firstIp);
        let bits = (af === 4) ? 32 - Math.log2(hosts) : hosts;

        return `${firstIp}/${bits}`;
    };

    _createWhoisDump = () => {
        if (this._isCacheValid()) {
            console.log("Using ARIN cached whois data");
            return Promise.resolve(JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8')));
        } else {
            return this._getStatFile()
                .then(data => {
                    const structuredData = data
                        .split("\n")
                        .filter(line => line.includes("ipv4") || line.includes("ipv6") )
                        .map(line => line.split("|"))
                        .map(([rir, cc, type, firstIp, hosts, date, status, hash]) => {
                            return {
                                rir,
                                cc,
                                type,
                                prefix: this._toPrefix(firstIp, hosts),
                                hosts,
                                date,
                                status,
                                hash
                            };
                        })
                        .filter(i => i.rir === "arin" &&
                            ["ipv4", "ipv6"].includes(i.type) &&
                            ["allocated", "assigned"].includes(i.status));

                    return structuredData.reverse();
                })
                .then(this._tranformToTheRestOfTheWorldFormat)
                .then(inetnums => inetnums.filter(i => !!i))
                .then(inetnums => {
                    fs.writeFileSync(this.cacheFile, JSON.stringify(inetnums));

                    return inetnums;
                });
        }
    };

    _getRdapQuery = (prefix) => {
        const url = `https://rdap.arin.net/registry/ip/${prefix}`;
        const file = this.getCacheFileName(url);

        if (fs.existsSync(file)) {
            return Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf-8')));
        } else {
            axios.defaults.httpsAgent = this.httpsAgent;
            return axios({
                url,
                method: 'GET',
                timeout: 20000,
                responseType: 'json'
            })
                .then(answer => {
                    fs.writeFileSync(file, JSON.stringify(answer.data));
                    return answer.data;
                })
                .catch(error => {
                    console.log(`Cannot retrieve ${prefix}`, error.code || error.response.status);
                    return null;
                });
        }
    };

    // Alternative to skip ARIN rdap
    // _getRIPEstatQuery = (firstIp) => {
    //     const url = `https://stat.ripe.net/data/whois/data.json?resource=${firstIp}`;
    //     const file = this.getCacheFileName(url);
    //
    //     if (fs.existsSync(file)) {
    //         return Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf-8')));
    //     } else {
    //         console.log(url);
    //         return axios({
    //             url,
    //             method: 'GET',
    //             responseType: 'json'
    //         })
    //             .then(answer => {
    //                 fs.writeFileSync(file, JSON.stringify(answer.data));
    //                 return answer;
    //             });
    //     }
    // };

    _tranformToTheRestOfTheWorldFormat = (items) => {
        console.log("ARIN is not like the other RIRs: ");
        console.log("(1) inet(6)nums are called NetRanges, and ");
        console.log("(2) there are no public dumps available, obtaining whois data " +
            "requires multiple queries to the whois or authorization to access bulk data (see option -b).");
        console.log(`Retrieving ${items.length} NetRanges from ARIN whois`);

        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        progressBar.start(items.length, 0);

        const singleBatch = (items) => {
            return batchPromises(4, items, item => {
                const prefix = item.prefix;

                return this._getRdapQuery(prefix)
                    .then(data => {
                        progressBar.increment();
                        if (data) {
                            const {startAddress, endAddress, remarks} = data;
                            const inetnum = {};

                            if (remarks) {
                                const remarksArray = remarks.map(remark => (remark.description || []));

                                const geofeeds = [].concat
                                    .apply([], remarksArray)
                                    .filter(d => d.startsWith("Geofeed"));

                                if (geofeeds && geofeeds.length) {
                                    inetnum.inetnum = ipUtils.ipRangeToCidr(startAddress, endAddress);
                                    const geofeedUrl = this.matchGeofeedFile(geofeeds[0]);
                                    if (geofeedUrl && geofeedUrl.length) {
                                        inetnum.file = geofeedUrl[0];
                                        return inetnum;
                                    }
                                }
                            }
                        }
                        return null;
                    });
            })
        }

        const halfList = Math.ceil(items.length/2);
        return Promise
            .all([
                singleBatch(items.slice(0, halfList)),
                singleBatch(items.slice(halfList))
            ])
            .then(inetnums => {
                progressBar.stop();

                return [].concat.apply([], inetnums);
            })
    };

    _isCacheValid = () => {
        if (fs.existsSync(this.cacheFile)) {
            const stats = fs.statSync(this.cacheFile);
            const lastDownloaded = moment(stats.mtime);

            if (moment(lastDownloaded).diff(moment(), 'days') <= this.daysWhoisCache){
                return true;
            }
        }

        return false;
    };

    getBlocks = () => {
        if (this.params.arinBulk) {
            console.log("ARIN bulk whois data not yet supported");
            return Promise.resolve([]);
        } else {
            return this._createWhoisDump();
        }
    }
}