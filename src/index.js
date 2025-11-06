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


const params = yargs
    .usage("Usage: $0 <command> [options]")

    .command("$0", "Run Geofeed finder (default)", function () {
        yargs
            .alias("v", "version")
            .nargs("v", 0)
            .describe("v", "Show version number")

            .alias("a", "af")
            .nargs("a", 1)
            .default("a", "4,6")
            .describe("a", "Address family")

            .alias("o", "output")
            .nargs("o", 1)
            .default("o", "result.csv")
            .describe("o", "Output file")

            .alias("t", "test")
            .nargs("t", 1)
            .describe("t", "Test specific inetnum using RDAP")

            .alias("c", "cache-whois")
            .nargs("c", 1)
            .default("c", 3)
            .describe("c", "Number of days whois cache validity")

            .alias("g", "cache-geofeed")
            .nargs("g", 1)
            .default("g", 3)
            .describe("g", "Number of days geofeed file cache validity")

            .alias("l", "cache-location")
            .nargs("l", 1)
            .default("l", ".cache/")
            .describe("l", "Cache directory location")

            .alias("s", "silent")
            .nargs("s", 0)
            .describe("s", "Silent mode, don't print errors")

            .alias("u", "keep-invalid-subdivisions")
            .nargs("u", 0)
            .describe("u", "Keep invalid subdivisions (accept invalid ISO regions/subdivisions)")

            .alias("r", "remove-invalid-subdivisions")
            .nargs("r", 0)
            .describe("r", "Remove invalid subdivisions but keep the rest of the geofeed if valid")

            .alias("b", "arin-bulk")
            .nargs("b", 0)
            .describe("b", "Use bulk whois data for ARIN: https://www.arin.net/reference/research/bulkwhois/")

            .alias("p", "arin-skip-suballocations")
            .nargs("p", 0)
            .describe("p", "Do not fetch ARIN's sub allocations. You will save considerable time but have a potentially partial output.")

            .alias("q", "detect-suballocations-locally")
            .nargs("q", 0)
            .describe("q", "Detect ARIN's sub allocations locally instead of downloading a dump file.")

            .alias("z", "include-zip")
            .nargs("z", 0)
            .describe("z", "Zip codes are deprecated in geofeed and by default are excluded from the output.")

            .alias("k", "keep-non-iso")
            .nargs("k", 0)
            .describe("k", "Keep entries with invalid ISO codes")

            .alias("d", "download-timeout")
            .nargs("d", 1)
            .describe("d", "Interrupt downloading a geofeed file after seconds")

            .alias("i", "include")
            .nargs("i", 1)
            .default("i", "ripe,apnic,lacnic,afrinic,arin")
            .describe("i", "Include RIRs (comma-separated list)");
    })
    .help("h")
    .alias("h", "help")
    .epilog("Copyright (c) 2020, Massimo Candela")
    .argv;

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

        return new Promise((resolve, reject) => {
            try {
                if (!!options.test) {
                    if (/<a|<div|<span|<style|<link/gi.test(data)) {
                        console.log(`Error: is not CSV but HTML, stop with this nonsense!`);
                    } else {
                        console.log(toGeofeed(data));
                    }
                    resolve();

                } else {

                    fs.writeFileSync(options.output, "");
                    const out = fs.createWriteStream(options.output, {
                        flags: "a"
                    });

                    for (let line of data ?? []) {
                        out.write(line + "\n", "UTF8");
                    }

                    out.end();

                    out.on("finish", () => {
                        console.log(`Done! See ${options.output}`);
                        resolve();
                    });

                    out.on("error", reject);
                }
            } catch (error) {
                reject(error);
            }
        });

    })
    .catch(error => {
        logger.log(error.message);
    });