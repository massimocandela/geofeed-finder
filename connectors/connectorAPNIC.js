import Connector from "./connector";
import axios from "axios";
import fs from "fs";
import moment from "moment";
import zlib from "zlib";
import readline from "readline";
import ipUtils from "ip-sub";

export default class ConnectorAPNIC extends Connector {
    constructor(params) {
        super(params)

        this.connectorName = "apnic";
        this.cacheDir += this.connectorName + "/";
        this.dumpUrls = this.params.dumpUrls || [
            "https://ftp.apnic.net/apnic/whois/apnic.db.inetnum.gz",
            "https://ftp.apnic.net/apnic/whois/apnic.db.inet6num.gz"
        ];

        this.cacheFiles = this.dumpUrls.map(this.getCacheFileName);
        this.daysWhoisCache = this.params.defaultCacheDays;

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir,  { recursive: true });
        }

    }

    _matchInetnum = (inetnum) => {
        if (inetnum.includes("inet6num")) {
            return inetnum.replace("inet6num:", "").trim();
        } else {
            if (inetnum.includes("-")) {
                const range = inetnum.replace("inetnum:", "").split("-").map(i => i.trim());
                return ipUtils.ipRangeToCidr(...range);
            } else {
                return inetnum.replace("inetnum:", "").trim();
            }
        }
    };

    _readLines = (compressedFile) => {
        return new Promise((resolve, reject) => {
            console.log("Parsing APNIC data");

            let lastInetnum = null;
            const geofeeds = [];

            let lineReader = readline.createInterface({
                input: fs.createReadStream(compressedFile)
                    .pipe(zlib.createGunzip())
                    .on("error", (error) => {
                         console.log(`ERROR: Delete the cache file ${compressedFile}`);
                    })
            });

            lineReader
                .on('line', (line) => {
                    if (line.startsWith("inetnum:") || line.startsWith("inet6num:")) {
                        lastInetnum = line;
                    } else if (line.startsWith("remarks:") && line.includes("Geofeed")) {

                        const geofeedUrl = this.matchGeofeedFile(line);

                        if (geofeedUrl && geofeedUrl.length) {
                            const inetnum = this._matchInetnum(lastInetnum);

                            geofeeds.push({
                                inetnum,
                                file: geofeedUrl[0]
                            });
                        }
                    }
                })
                .on("error", (error) => {
                    return reject(error, `Delete the cache file ${compressedFile}`);
                })
                .on("close", () => {
                    resolve(geofeeds);
                })

        });

    }

    _isCacheValid = () => {
        if (this.cacheFiles.every(fs.existsSync)) {
            const stats = fs.statSync(this.cacheFiles[0]);
            const lastDownloaded = moment(stats.mtime);

            if (moment(lastDownloaded).diff(moment(), 'days') <= this.daysWhoisCache){
                return true;
            }
        }

        return false;
    };

    _getDumpFile = (url) => {
        const cacheFile = this.getCacheFileName(url);
        const writer = fs.createWriteStream(cacheFile);

        return axios({
            url,
            method: 'GET',
            responseType: 'stream'
        })
            .then( (response) => {

                response.data.pipe(writer);

                return new Promise((resolve, reject) => {
                    writer.on('finish', () => {
                        resolve(cacheFile);
                        writer.end();
                    });
                    writer.on('error', error => {
                        return reject(error, `Delete the cache file ${cacheFile}`);
                    });
                })
            });
    }

    _getDump = () => {

        if (this._isCacheValid()) {
            console.log("Using APNIC cached whois data");
            return Promise.resolve(this.cacheFiles);
        } else {
            console.log("Downloading APNIC whois data");

            return Promise
                .all(this.dumpUrls.map(this._getDumpFile));
        }
    }

    getBlocks = () => {

        return this._getDump()
            .then(files => {
                return Promise.all(files
                    .map(file => {
                        return this.getCachedBlocks(file)
                            .catch(() => {
                                return this._readLines(file)
                                    .then(blocks => {
                                        return this.setCachedBlocks(blocks, file)
                                            .then(() => blocks);
                                    });
                            });
                    }))
                    .then((blocks) => [].concat.apply([], blocks));
            });
    }
}