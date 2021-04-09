# geofeed-finder

This utility discovers and retrieves geofeed files from whois data according to [draft-ietf-opsawg-finding-geofeeds](https://datatracker.ietf.org/doc/draft-ietf-opsawg-finding-geofeeds/).

To use the compiled version (linux, mac, windows), see [releases](https://github.com/massimocandela/geofeed-finder/releases/).

Otherwise, you can just download the code and do `npm install` and `npm run serve` to run it.

The utility automatically manages the cache.

### Usage Example

#### If you created a geofeed in whois data and you want to test that everything is fine

* Run the binary `./geofeed-finder-linux-x64 -t YOUR_PREFIX`

#### If you want to retrieve all the geofeeds in a RIR:

* Run the binary `./geofeed-finder-linux-x64 -i ripe`
* See the final geofeed file in `result.csv`

You can select multiple RIRs: `./geofeed-finder-linux-x64 -i ripe,apnic`


#### If you want to discover geofeeds across all RIRs:

* Run the binary `./geofeed-finder-linux-x64`
* See the final geofeed file in `result.csv`

The final geofeed file is a file containing all the geofeeds discovered in whois data.
Each entry is a prefix or IP which has been selected according to the draft (e.g. accepted only if contained by parent inetnum, priority to longest prefix match, etc.)


Downloading data from ARIN whois takes longer. 
This is because the other RIRs publicly provide anonymized bulk whois data.
Instead, ARIN requires authorization to access bulk whois data. 
If you have such authorization, soon there will be an option to use ARIN bulk data, otherwise rdap is used (default, which doesn't require authorization.)


> Run ./geofeed-finder-linux-x64 -h for more options


### Use geofeed-finder in your code

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
    include: ["ripe", "apnic"] // The sources to explore (default: ripe, apnic, lacnic, afrinic, arin)
};

new GeofeedFinder(options)
    .getGeofeeds()
    .then(geofeeds => { 
        // Do something with the geofeeds 
        // An array of objects { prefix, country, region, city }
    });

```



