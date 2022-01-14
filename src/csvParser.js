import Geofeed from "./geofeed";
import { parse } from 'csv-parse/sync';

export default class CsvParser {

    parse = (inetnum, content) => {
        const out = [];

        if (content) {

            const lines = parse(content, {
                columns: ["prefix", "country", "region", "city", "zip"],
                delimiter: ',',
                comment: "#",
                trim: true,
                relax_column_count: true,
                relax_column_count_less: true,
                skip_empty_lines: true,
                skip_records_with_error: true,
            });

            for (let line of lines) {
                out.push(new Geofeed(inetnum, line.prefix, line.country, line.region, line.city, line.zip));
            }
        }
        return out;
    }
}