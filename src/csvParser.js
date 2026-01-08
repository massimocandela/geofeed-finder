import Geofeed from "./geofeed";

export default class CsvParser {

    parse = (inetnum, content) => {
        const out = [];

        if (content) {

            const lines = content.split(/\r?\n/)
                .filter(i => !!i && !i.startsWith("#") && i.trim() !== "")
                .slice(0, 100000); // Avoid files with more than 100k entries (prevent abuses)

            for (let l of lines ?? []) {
                const [prefix, country, region, city, zip] = l.replace("\t", " ").split(",").map(i => i.trim());

                if (!!prefix) {
                    try {
                        const baseInetnum = inetnum || prefix;
                        const geofeed = new Geofeed(baseInetnum, prefix, country, region, city, zip);

                        out.push(geofeed);
                    } catch (e) {
                        // Nothing
                    }
                }
            }
        }

        return out;
    };
}
