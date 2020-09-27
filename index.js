import Finder from "./finder"
import fs from "fs";

const finder = new Finder();

const toGeofeed = (geofeedsObjects) => {
    return geofeedsObjects
        .map(g => `${g.prefix},${g.country},${g.region},${g.city}`)
        .join("\n");
}

finder
    .getGeofeeds()
    .then(data => {
        fs.writeFileSync("result.csv", toGeofeed(data));
    })
    .then(() => console.log("Done! See result.csv"));

