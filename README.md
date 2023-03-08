# geofeed-finder

**This utility discovers and retrieves geofeed files from whois data. Additionally, it validates the ownership of the prefixes, manages the cache, and validates the ISO codes. See [RFC9092](https://datatracker.ietf.org/doc/draft-ietf-opsawg-finding-geofeeds/).**

To use the compiled version (linux, mac, windows), see [releases](https://github.com/massimocandela/geofeed-finder/releases/). Otherwise, you can just download the code and do `npm ci` and `npm run serve` to run it.



#### How to setup a geofeed
Add a remark/comment in your inetnum/NetRange as follows:
```
Geofeed https://url_to_geofeed/file.csv
```

Example of result
```bash
$whois 209.212.224.1

NetRange:       209.212.224.0 - 209.212.239.255
CIDR:           209.212.224.0/20
NetName:        NTTA-209-212-224
NetHandle:      NET-209-212-224-0-1
Parent:         NET209 (NET-209-0-0-0-0)
NetType:        Direct Allocation
OriginAS:       AS2914
Organization:   NTT America, Inc. (NTTAM-1)
RegDate:        1998-04-17
Updated:        2020-12-18
Comment:        Geofeed https://geo.ip.gin.ntt.net/geofeeds/geofeeds.csv
```




## Geofeed-finder usage examples

#### If you just added a geofeed link in your inetnum/NetRange and you want to test that everything is fine:

* Run the binary `./geofeed-finder-linux-x64 -t YOUR_PREFIX`

> The -t option is not a prefix to geolocation lookup mechanism, but a test that your geofeed file is linked and constructed properly. This command will (1) find the parent inetnum for your prefix; (2) return all the geofeeds available for it; and (3) validate CSV format and ISO codes and report errors.

#### If you want to retrieve all the geofeeds in a RIR:

* Run the binary `./geofeed-finder-linux-x64 -i ripe`
* See the final geofeed file in `result.csv`

You can select multiple RIRs: `./geofeed-finder-linux-x64 -i ripe,apnic`


#### If you want to discover geofeeds across all RIRs:

* Run the binary `./geofeed-finder-linux-x64`
* See the final geofeed file in `result.csv`

The final geofeed file is a file containing all the geofeeds discovered in whois data.
Each entry is a prefix or IP which has been selected according to the draft (e.g. accepted only if contained by parent inetnum, priority to longest prefix match, etc.)

The application accepts the following parameters:

| Parameter| Description  |
|-|-|
|-i| Include RIRs (comma-separated list)| 
|-v| Show version number| 
|-o| Output file | 
|-t| Test specific inetnum using RDAP | 
|-s| Silent mode, don't print errors | 
|-c| Whois cache validity (in days) | 
|-g| Geofeed file cache validity (in days) | 
|-k| Keep entries with invalid ISO codes | 
|-u| Keep invalid subdivisions (accept invalid ISO regions/subdivisions, but keep validating the rest) | 
|-r| Remove invalid subdivisions but keep the rest of the geofeed if valid | 
|-z| Include Zip codes. Zip codes are deprecated in geofeed and by default are excluded from the output | 
|-d| Download timeout. Interrupt downloading a geofeed file after seconds |
|-a| A comma-separated list of address families (default: 4,6) |
|-l| Cache directory (default: .cache) |

Use `-h` for more options.


Downloading data from ARIN whois takes longer. 
This is because the other RIRs publicly provide anonymized bulk whois data.
Instead, ARIN requires authorization to access bulk whois data. 
If you have such authorization, soon there will be an option to use ARIN bulk data, otherwise rdap is used (default, which doesn't require authorization.)


### Logs

All the logs, including ISO codes error are reported in `logs/`.

## Use geofeed-finder in your code

Install it:

```bash
npm install geofeed-finder
```

Import it:

```js
import GeofeedFinder from "geofeed-finder";
```

Use it:

```js
const options = {
    include: ["ripe", "apnic"], // The RIRs to explore (default: ripe, apnic, lacnic, afrinic, arin),
    whoisCacheDays: 3, // Cache days for whois data (default: 3)
    geofeedCacheDays: 7, // Cache days for geofeed files without cache headers set (default: 7)
    af: [4, 6], // Address family (default, both 4 and 6)
    includeZip: true | false, // Allow for zip codes in the final output (default: false)
    silent: true | false, // Don't log in console (default: false)
    keepNonIso: true | false, // Don't validate ISO codes (default: false)
    keepInvalidSubdivisions: true | false, // Don't validate ISO codes of the subdivisions (default: false)
    removeInvalidSubdivisions: true | false, // Remove invalid subdivisions but keep the rest of the geofeed if valid (default: false)
    test: "ip/prefix", // Test specific ip/prefix using RDAP
    output: "result.csv", // Output file (default: "result.csv")
    downloadTimeout: 5 // Interrupt downloading a geofeed file after seconds (default: 10)
};

new GeofeedFinder(options) // The options dict is optional, you can just do new GeofeedFinder()
    .getGeofeeds()
    .then(geofeeds => { 
        // Do something with the geofeeds 
        // An array of objects { prefix, country, region, city }
    });
```



