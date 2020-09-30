# geofeed-finder

This utility discovers and retrieves geofeed files from whois data according to [draft-ymbk-opsawg-finding-geofeeds](https://datatracker.ietf.org/doc/draft-ymbk-opsawg-finding-geofeeds/).

> To use the compiled version (linux, mac, windows), see [releases](https://github.com/massimocandela/geofeed-finder/releases/).

Otherwise, you can just download the code and do `npm install` and `npm run serve` to run it.

The utility automatically manages the cache (so you can just run it how many times you like).
This is a *prototype* temporarily working only with RIPE data.

# Usage Example

* Run the binary `./geofeed-finder-linux-x64`
* See the final geofeed file in `result.csv`

The final geofeed file is a file containing all the geofeeds discovered in whois data.
Each entry is a prefix or IP which has been selected according to the draft (e.g. accepted only if contained by parent inetnum, priority to longest prefix match, etc.)
