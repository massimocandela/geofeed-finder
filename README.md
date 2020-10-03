# geofeed-finder

This utility discovers and retrieves geofeed files from whois data according to [draft-ymbk-opsawg-finding-geofeeds](https://datatracker.ietf.org/doc/draft-ymbk-opsawg-finding-geofeeds/).

> To use the compiled version (linux, mac, windows), see [releases](https://github.com/massimocandela/geofeed-finder/releases/).

Otherwise, you can just download the code and do `npm install` and `npm run serve` to run it.

The utility automatically manages the cache (so you can just run it how many times you like).

## Usage Example


#### If you just want to test the tool (try on one RIR):

* Run the binary `./geofeed-finder-linux-x64 -i ripe`
* See the final geofeed file in `result.csv`

You can select the RIRs you want to discover geofeeds from:

`./geofeed-finder-linux-x64 -i ripe,apnic`


#### If you want to discover geofeeds across all RIRs:

* Run the binary `./geofeed-finder-linux-x64`
* See the final geofeed file in `result.csv`

The final geofeed file is a file containing all the geofeeds discovered in whois data.
Each entry is a prefix or IP which has been selected according to the draft (e.g. accepted only if contained by parent inetnum, priority to longest prefix match, etc.)


Downloading data from ARIN whois takes longer. 
This is because the other RIRs publicly provide anonymized bulk whois data.
Instead, ARIN requires authorization to access bulk whois data. 
If you have such authorization, soon there will be an option to use ARIN bulk data, otherwise rdap is used 
(default, which doesn't require such authorization.)


> Run ./geofeed-finder-linux-x64 -h for more options
