import Finder from "./finder"
import fs from "fs";
import yargs from 'yargs';

const toGeofeed = (geofeedsObjects) => {
    return geofeedsObjects
        .map(g => `${g.prefix},${g.country},${g.region},${g.city}`)
        .join("\n");
}

const params = yargs
    .usage('Usage: $0 <command> [options]')

    .command('$0', 'Run Geofeed finder (default)', function () {
        yargs
            .alias('v', 'version')
            .nargs('v', 0)
            .describe('v', 'Show version number')

            .alias('o', 'output')
            .nargs('o', 1)
            .default('o', 'result.csv')
            .describe('o', 'Output file')

            .alias('b', 'arin-bulk')
            .nargs('b', 0)
            .describe('b', 'Use bulk whois data for ARIN: https://www.arin.net/reference/research/bulkwhois/')

            .alias('i', 'include')
            .nargs('i', 1)
            .default('i', 'ripe,apnic,lacnic,afrinic,arin')
            .describe('i', 'Include RIRs (comma-separated list)')
    })
    .help('h')
    .alias('h', 'help')
    .epilog('Copyright (c) 2020, Massimo Candela')
    .argv;

const options = {
    arinBulk: params.b,
    include: ((params.i) ? params.i : "ripe,apnic,lacnic,afrinic,arin").split(","),
    output: params.o || "result.csv"
};

new Finder(options)
    .getGeofeeds()
    .then(data => {
        fs.writeFileSync(options.output, toGeofeed(data));
    })
    .then(() => console.log(`Done! See ${options.output}`));

