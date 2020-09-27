import ConnectorRIPE from "./connectors/connectorRIPE";
import batchPromises from "batch-promises";
import axios from "axios";
import CsvParser from "./csvParser";
import md5 from "md5";
import fs from "fs";
import ipUtils from "ip-sub";

export default class Finder {
    constructor(params) {
        this.params = params || {};
        this.cacheDir = this.params.cacheDir || ".cache/";
        this.csvParser = new CsvParser();

        this.connectors = [
            new ConnectorRIPE(this.params)
        ];

    };

    getBlocks = () => {
        return Promise
            .all(this.connectors.map(connector => connector.getBlocks()))
            .then(blocks => {
                return [].concat.apply([], blocks).filter(i => !!i.inetnum);
            });
    };

    _getFileName = (file) => {
        return this.cacheDir + md5(file);
    };

    _getGeofeedFile = (block) => {
        const file = block.file;
        const cachedFile = this._getFileName(file);

        if (fs.existsSync(cachedFile)) {
            console.log("Cached", file);

            return Promise.resolve(fs.readFileSync(cachedFile, 'utf8'));
        } else {
            console.log("Downloading", file);
            return axios({
                url: file,
                method: 'GET',
                // responseType: 'text'
            })
                .then(response => {
                    fs.writeFileSync(cachedFile, response.data);
                    return response.data;
                })
                .catch(error => {
                    console.log("error", file, error.code);
                    return null;
                });
        }
    };

    getGeofeedsFiles = (blocks) => {
        const out = []
        return batchPromises(5, blocks, block => {
            return this._getGeofeedFile(block)
                .then(data => {
                    out.push(this.validateGeofeeds(this.csvParser.parse(block.inetnum, data)));
                });
        })
            .then(() => [].concat.apply([], out));
    };

    validateGeofeeds = (geofeeds) => {
        return geofeeds
            .filter(geofeed =>
                geofeed &&
                !!geofeed.inetnum && geofeed.inetnum === geofeed.prefix ||
                ipUtils.isSubnet(geofeed.inetnum, geofeed.prefix)
            );

    };

    setGeofeedPriority = (geofeeds) => {

        const sortedByLessSpecificInetnum = geofeeds
            .sort((a, b) => {
                return ipUtils.sortByPrefixLength(a.inetnum, b.inetnum);
            });

        for (let n=1; n<sortedByLessSpecificInetnum.length; n++) {
            const moreSpecificInetnum = sortedByLessSpecificInetnum[n];
            const moreSpecificInetnumPrefix = moreSpecificInetnum.prefix;

            for (let i=0; i<n; i++) { // For all the less specifics already visited
                const lessSpecificInetnum = sortedByLessSpecificInetnum[i];
                const lessSpecificInetnumPrefix = lessSpecificInetnum.prefix;

                // If there is a less specific inetnum contraddicting a more specific inetnum
                // Contradicting here means, the less specific is declaring something in the more specific range
                if (lessSpecificInetnum.valid) {
                    if (moreSpecificInetnumPrefix === lessSpecificInetnumPrefix ||
                        ipUtils.isSubnet(moreSpecificInetnumPrefix, lessSpecificInetnumPrefix)) {
                        lessSpecificInetnum.valid = false;
                        console.log(`WARNING: prefix:${moreSpecificInetnumPrefix} declared in inetnum:${moreSpecificInetnum.inetnum} conflicts with prefix:${lessSpecificInetnumPrefix} declared in inetnum:${lessSpecificInetnum.inetnum}`);
                    }
                }
            }

        }

        return sortedByLessSpecificInetnum.filter(i => i.valid);
    };

    getGeofeeds = () => {
        return this.getBlocks()
            .then(this.getGeofeedsFiles)
            .then(this.setGeofeedPriority);
    };


}
