import Connector from "./connector";
import axios from "axios";
import fs from "fs";
import moment from "moment";
import zlib from "zlib";
import readline from "readline";

export default class ConnectorLACNIC extends Connector {
    constructor(params) {
        super(params)

        this.connectorName = "lacnic";
        this.cacheDir += this.connectorName + "/";
        this.dumpUrl = this.params.dumpUrl || "http://ftp.lacnic.net/lacnic/dbase/lacnic.db.gz";
        this.cacheFile = [this.cacheDir, "lacnic.db.gz"].join("/").replace("//", "/");
        this.daysWhoisCache = this.params.defaultCacheDays;

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir,  { recursive: true });
        }

    }

    _matchInetnum = (inetnum) => {
        return inetnum
            .replace("inet6num:", "")
            .replace("inetnum:", "")
            .trim();
    };

    _readLines = (compressedFile) => {
        return new Promise((resolve, reject) => {
            console.log("Parsing LACNIC data");

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
        if (fs.existsSync(this.cacheFile)) {
            const stats = fs.statSync(this.cacheFile);
            const lastDownloaded = moment(stats.mtime);

            if (moment(lastDownloaded).diff(moment(), 'days') <= this.daysWhoisCache){
                return true;
            }
        }

        return false;
    };

    _getDump = () => {

        if (this._isCacheValid()) {
            console.log("Using LACNIC cached whois data");
            return Promise.resolve(this.cacheFile);
        } else {
            console.log("Downloading LACNIC whois data");
            const writer = fs.createWriteStream(this.cacheFile);

            return axios({
                url: this.dumpUrl,
                method: 'GET',
                responseType: 'stream'
            })
                .then( (response) => {

                    response.data.pipe(writer);

                    return new Promise((resolve, reject) => {
                        writer.on('finish', () => resolve(this.cacheFile));
                        writer.on('error', error => {
                            return reject(error, `Delete the cache file ${this.cacheFile}`);
                        });
                    })
                });
        }
    }

    getBlocks = () => {

        return this._getDump()
            .then(file => {
                return this.getCachedBlocks(file)
                    .catch(() => {
                        return this._readLines(file)
                            .then(blocks => {
                                return this.setCachedBlocks(blocks, file)
                                    .then(() => blocks);
                            });
                    });
            });
    }
}