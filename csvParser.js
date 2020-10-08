import ipUtils from "ip-sub";


const checkPrefix = (prefix) => {
    if (!prefix.includes("/")) {
        prefix += (ipUtils.getAddressFamily(prefix) === 4) ? "/32" : "/128";
    }

    return prefix;
};

class Geofeed {
    constructor(inetnum, prefix, country, region, city) {
        this.inetnum = inetnum;
        this.prefix = checkPrefix(prefix);
        this.country = country;
        this.region = region;
        this.city = city;
        this.valid = true;
    }
}
export default class CsvParser {

    parse = (inetnum, content) => {
        const out = [];

        if (content) {
            const lines = content.split(/\r\n|\r|\n/);

            for (let line of lines) {
                if (line !== "" && !line.includes("#")) {
                    out.push(new Geofeed(inetnum, ...line.split(",")));
                }
            }
        }
        return out;
    }
}