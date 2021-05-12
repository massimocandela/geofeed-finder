import ipUtils from "ip-sub";

const checkPrefix = (prefix) => {
    if (!prefix.includes("/")) {
        prefix += (ipUtils.getAddressFamily(prefix) === 4) ? "/32" : "/128";
    }

    return (ipUtils.isValidPrefix(prefix)) ? prefix.toLowerCase() : null;
};

class Geofeed {
    constructor(inetnum, prefix, country, region, city, zip) {
        this.inetnum = inetnum.toLowerCase();
        this.prefix = checkPrefix(prefix);
        this.country = country ? country.toUpperCase() : null;
        this.region = region ? region.toUpperCase() : null;
        this.zip = zip || null;
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
                    out.push(new Geofeed(inetnum, ...line.split(",").map(i => i.trim())));
                }
            }
        }
        return out;
    }
}