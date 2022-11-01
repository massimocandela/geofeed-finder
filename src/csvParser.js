import Geofeed from "./geofeed";

export default class CsvParser {

    parse = (inetnum, content) => {
        const out = [];

        if (content) {

            const lines = content.split(/\r?\n/).filter(i => !!i && !i.startsWith("#") && i.trim() !== "");

            for (let l of lines ?? []) {
                const [prefix, country, region, city, zip] = l.split(",").map(i => i.trim());

                out.push(new Geofeed(inetnum, prefix, country, region, city, zip));
            }
        }

        return out;
    }
}