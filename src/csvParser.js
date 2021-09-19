import Geofeed from "./geofeed";

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