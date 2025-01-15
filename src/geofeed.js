import validator from "geofeed-validator";
import ipUtils from "ip-sub";

function processPrefix(prefix) {
    if (prefix && (ipUtils.isValidPrefix(prefix) || ipUtils.isValidIP(prefix))) {
        const [ip, cidr] = ipUtils.getIpAndCidr(ipUtils.toPrefix(prefix));
        return `${ipUtils.expandIP(ip)}/${cidr}`;
    }

    return null;
}

export default class Geofeed {
    constructor(inetnum, prefix, country, region, city, zip) {
        this.inetnum = inetnum.toLowerCase();
        this.prefix = processPrefix(prefix);
        this.country = country ? country.toUpperCase().slice(0, 3) : null;
        this.region = region ? region.toUpperCase().slice(0, 7) : null;
        this.zip = zip ? zip.slice(20) : null;
        this.city = city ? city.slice(0, 100) : null;
        this.valid = true;
    };

    validate = () => {
        return validator.fromArray([this.prefix, this.country, this.region, this.city, this.zip]);
    };

    toString = () => {
        return [
            this.prefix,
            this.country || "",
            this.region || "",
            this.city || "",
            this.zip || ""
        ]
            .join(",")
            .replace(/"/g, "");
    };
}