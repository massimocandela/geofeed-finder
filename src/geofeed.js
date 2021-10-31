import validator from "geofeed-validator";
import ipUtils from "ip-sub";

export default class Geofeed {
    constructor(inetnum, prefix, country, region, city, zip) {
        this.inetnum = inetnum.toLowerCase();
        this.prefix = ipUtils.toPrefix(prefix);
        this.country = country ? country.toUpperCase() : null;
        this.region = region ? region.toUpperCase() : null;
        this.zip = zip || null;
        this.city = city;
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
            .replace(/"/g,"");
    }
}