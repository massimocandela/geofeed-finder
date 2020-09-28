import md5 from "md5";
import fs from "fs";
import moment from "moment";


export default class Connector {
    constructor(params) {
        this.params = params || {};
        this.connectorName = "connector";
        this.cacheDir = this.params.cacheDir || ".cache/";
    }

    getBlocks = () => {
        return Promise.reject("Missing implementation");
    }

    getCachedBlocks = (file) => {
        const fileName = this.cacheDir + this.connectorName + "-" + md5(file);

        if (fs.existsSync(fileName)) {
            const content = JSON.parse(fs.readFileSync(fileName, 'utf8'));
            if (!content || content.length === 0) {
                return Promise.reject();
            } else {
                return Promise.resolve(content);
            }
        } else {
            return Promise.reject();
        }

    }

    setCachedBlocks = (blocks, file) => {
        const fileName = this.cacheDir + this.connectorName + "-" + md5(file);
        fs.writeFileSync(fileName, JSON.stringify(blocks));
        return Promise.resolve();
    }



}