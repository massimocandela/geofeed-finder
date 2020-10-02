import ConnectorRIPE from "./connectors/connectorRIPE";
import ConnectorAFRINIC from "./connectors/connectorAFRINIC";
import ConnectorLACNIC from "./connectors/connectorLACNIC";
import ConnectorAPNIC from "./connectors/connectorAPNIC";
import ConnectorARIN from "./connectors/connectorARIN";

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
        this.downloadsOngoing = {};

        this.connectors = {
            "ripe": new ConnectorRIPE(this.params),
            "afrinic": new ConnectorAFRINIC(this.params),
            "apnic": new ConnectorAPNIC(this.params),
            "arin": new ConnectorARIN(this.params),
            "lacnic": new ConnectorLACNIC(this.params)
        };

    };

    getBlocks = () => {
        return Promise
            .all(Object.keys(this.connectors)
                .filter(key => this.params.include.includes(key))
                .map(key => this.connectors[key].getBlocks()))
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
            console.log(block.inetnum, file, "[cache]");

            return Promise.resolve(fs.readFileSync(cachedFile, 'utf8'));
        } if (this.downloadsOngoing[cachedFile]) {
            console.log(block.inetnum, file, "[cache]");
            return Promise.resolve(this.downloadsOngoing[cachedFile]);
        } else {
            console.log(block.inetnum, file, "[download]");
            this.downloadsOngoing[cachedFile] = axios({
                url: file,
                method: 'GET',
            })
                .then(response => {
                    fs.writeFileSync(cachedFile, response.data);
                    return response.data;
                })
                .catch(error => {
                    console.log("error", file, error.code || error.response.status);
                    return null;
                });

            return this.downloadsOngoing[cachedFile];
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

                // If there is a less specific inetnum contradicting a more specific inetnum
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
