import ipUtils from "ip-sub";
import iso3166a from "iso-3166-1";
import iso3166b from "iso-3166-2";

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
    };

    validate = () => {
        const out = [];
        const validCountry = !this.country || iso3166a.whereAlpha2(this.country.toLowerCase());
        const validRegion = !this.region || iso3166b.subdivision(this.region);
        const validCombination = !this.country || !this.region || !!validCountry && !!validRegion && validRegion.countryCode === this.country;

        if (!validCountry) {
            out.push("Not valid Country Code (iso-3166-1)");
        }

        if (!validRegion) {
            out.push("Not valid Subdivision Code (iso-3166-2)");
        }

        if (validCountry && validRegion && !validCombination) {
            out.push("The Subdivision is not inside the Country");
        }

        return out;
    };

    toString = () => {
        return [
            this.prefix,
            this.country || "",
            this.region || "",
            this.city || "",
            this.zip || ""
        ].join(",");
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