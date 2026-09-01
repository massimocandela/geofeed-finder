import Geofeed from "./geofeed";

export default class CsvParser {

    // Splits a CSV line according to RFC 4180: quoted fields may contain commas,
    // and a doubled quote inside a quoted field is a literal quote.
    #splitLine = (line) => {
        const fields = [];
        let field = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inQuotes) {
                if (char === '"') {
                    if (line[i + 1] === '"') {
                        field += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else if (char === '"' && field.trim() === "") {
                field = "";
                inQuotes = true;
            } else if (char === ",") {
                fields.push(field);
                field = "";
            } else {
                field += char;
            }
        }

        fields.push(field);

        return fields.map(i => i.trim());
    };

    parse = (inetnum, content) => {
        const out = [];

        if (content) {

            const lines = content.split(/\r?\n/)
                .filter(i => !!i && !i.startsWith("#") && i.trim() !== "")
                .slice(0, 100000); // Avoid files with more than 100k entries (prevent abuses)

            for (let l of lines ?? []) {
                const [prefix, country, region, city, zip] = this.#splitLine(l.replace(/\t/g, " "));

                if (!!prefix) {
                    try {
                        const geofeed = new Geofeed(inetnum, prefix, country, region, city, zip);

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