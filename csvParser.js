import {Address4 as v4, Address6 as v6} from "ip-address";
import ipUtils from "ip-sub";


const cidrToRange = (cidr) => {
    if (typeof(cidr) === "string") {
        const af = ipUtils.getAddressFamily(cidr);
        const addr = (af === 4) ? new v4(cidr) : new v6(cidr);

        return [addr.startAddress().address, addr.endAddress().address];
    }
};

class Geofeed {
    constructor(inetnum, prefix, country, region, city) {
        // this.inetnum = cidrToRange(inetnum);
        this.inetnum = inetnum;
        // this.prefixRange = cidrToRange(prefix);
        this.prefix = prefix;
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