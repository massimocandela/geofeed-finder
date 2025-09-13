import Finder from "./finder";
import fs from "fs";
import yargs from "yargs";
import FileLogger from "fast-file-logger";

const toGeofeed = (geofeedsObjects) => geofeedsObjects.join("\n");

const logger = new FileLogger({
    logRotatePattern: "YYYY-MM-DD",
    filename: "error-%DATE%.log",
    symLink: false,
    directory: "./logs",
    maxRetainedFiles: 100,
    maxFileSizeMB: 100,
    compressOnRotation: false,
    label: "geofeed-finder",
    useUTC: true,
    format: ({data, timestamp}) => `${timestamp} ${data}`
});

const params = yargs(process.argv.slice(2))
    .version(false)
    .usage("Usage: $0 <command> [options]")
    .command("$0", "Run Geofeed finder (default)", (yargs) => {
        yargs
            .option("version", {
                alias: "v",
                type: "boolean",
                description: "Show version number"
            })
            .option("af", {
                alias: "a",
                type: "string",
                default: "4,6",
                description: "Address family"
            })
            .option("output", {
                alias: "o",
                type: "string",
                default: "result.csv",
                description: "Output file"
            })
            .option("test", {
                alias: "t",
                type: "string",
                description: "Test specific inetnum using RDAP"
            })
            .option("cache-whois", {
                alias: "c",
                type: "number",
                default: 3,
                description: "Number of days whois cache validity"
            })
            .option("cache-geofeed", {
                alias: "g",
                type: "number",
                default: 3,
                description: "Number of days geofeed file cache validity"
            })
            .option("cache-location", {
                alias: "l",
                type: "string",
                default: ".cache/",
                description: "Cache directory location"
            })
            .option("silent", {
                alias: "s",
                type: "boolean",
                description: "Silent mode, don't print errors"
            })
            .option("keep-invalid-subdivisions", {
                alias: "u",
                type: "boolean",
                description: "Keep invalid subdivisions (accept invalid ISO regions/subdivisions)"
            })
            .option("remove-invalid-subdivisions", {
                alias: "r",
                type: "boolean",
                description: "Remove invalid subdivisions but keep the rest of the geofeed if valid"
            })
            .option("arin-bulk", {
                alias: "b",
                type: "boolean",
                description: "Use bulk whois data for ARIN: https://www.arin.net/reference/research/bulkwhois/"
            })
            .option("arin-skip-suballocations", {
                alias: "p",
                type: "boolean",
                description: "Do not fetch ARIN's sub allocations. You will save considerable time but have a potentially partial output."
            })
            .option("detect-suballocations-locally", {
                alias: "q",
                type: "boolean",
                description: "Detect ARIN's sub allocations locally instead of downloading a dump file."
            })
            .option("include-zip", {
                alias: "z",
                type: "boolean",
                description: "Zip codes are deprecated in geofeed and by default are excluded from the output."
            })
            .option("keep-non-iso", {
                alias: "k",
                type: "boolean",
                description: "Keep entries with invalid ISO codes"
            })
            .option("download-timeout", {
                alias: "d",
                type: "number",
                description: "Interrupt downloading a geofeed file after seconds"
            })
            .option("include", {
                alias: "i",
                type: "string",
                default: "ripe,apnic,lacnic,afrinic,arin",
                description: "Include RIRs (comma-separated list)"
            });
    })
    .help("h")
    .alias("h", "help")
    .epilog("Copyright (c) 2020, Massimo Candela")
    .parse();
const options = {
    logger,
    cacheDir: params.l || ".cache/",
    whoisCacheDays: parseInt(params.c),
    daysWhoisSuballocationsCache: 30, // Cannot be less than 7
    compileSuballocationLocally: !!params.q,
    skipSuballocations: !!params.p,
    geofeedCacheDays: parseInt(params.g),
    arinBulk: params.b,
    af: params.a.toString().split(",").map(i => parseInt(i)),
    includeZip: !!params.z,
    silent: !!params.s,
    keepNonIso: !!params.k,
    keepInvalidSubdivisions: !!params.u,
    removeInvalidSubdivisions: !!params.r,
    include: (params.i ?? "ripe,apnic,lacnic,afrinic,arin").split(","),
    output: params.o || "result.csv",
    test: params.t || null,
    downloadTimeout: params.d || 10 // 0 is not a valid value
};

new Finder(options)
    .getGeofeeds()
    .then(data => {
        if (!!options.test) {
            if (/<a|<div|<span|<style|<link/gi.test(data)) {
                console.log(`Error: is not CSV but HTML, stop with this nonsense!`);
            } else {
                console.log(toGeofeed(data));
            }
        } else {

            fs.writeFileSync(options.output, "");
            const out = fs.createWriteStream(options.output, {
                flags: "a"
            });

            for (let line of data ?? []) {
                out.write(line + "\n");
            }
            out.end();

            console.log(`Done! See ${options.output}`);
        }
    })
    .catch(error => {
        logger.log(error.message);
    });