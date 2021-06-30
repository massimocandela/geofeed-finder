import Finder from "./finder"
import fs from "fs";
import yargs from 'yargs';

const toGeofeed = (geofeedsObjects) => {
    return geofeedsObjects
        // .map(g => `${g.prefix || ""},${g.country || ""},${g.region || ""},${g.city || ""},${g.zip || ""},`)
        .join("\n");
};

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

            .alias('t', 'test')
            .nargs('t', 1)
            .describe('t', 'Test specific inetnum using RDAP')

            .alias('b', 'arin-bulk')
            .nargs('b', 0)
            .describe('b', 'Use bulk whois data for ARIN: https://www.arin.net/reference/research/bulkwhois/')

            // .alias('z', 'include-zip')
            // .nargs('z', 0)
            // .describe('z', 'Zip codes are deprecated in geofeed and by default are excluded from the output.')

            .alias('k', 'keep-non-iso')
            .nargs('k', 0)
            .describe('k', 'Keep entries with invalid ISO codes')

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
    defaultCacheDays: 7,
    arinBulk: params.b,
    includeZip: params.z || false,
    keepNonIso: params.k || false,
    include: ((params.i) ? params.i : "ripe,apnic,lacnic,afrinic,arin").split(","),
    output: params.o || "result.csv",
    test: params.t || null,
};

new Finder(options)
    .getGeofeeds()
    .then(data => {
        if (!!options.test) {
            console.log(toGeofeed(data));
        } else {
            fs.writeFileSync(options.output, toGeofeed(data));
            console.log(`Done! See ${options.output}`)
        }
    });