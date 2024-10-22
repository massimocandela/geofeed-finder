import ipUtils from 'ip-sub';
import batchPromises from 'batch-promises';
import moment from 'moment/moment';
import axios from 'redaxios';
import brembo from 'brembo';

export default class RDAP {
    constructor() {}

    testGeofeedRemarkStrict = (remark) => {
        return /^Geofeed https?:\/\/\S+/g.test(remark);
    };

    matchGeofeedFile = (remark) => {
        return remark.match(/\bhttps?:\/\/\S+/gi) || [];
    };

    getRdap = (prefix) => {
        return axios({
            url: brembo.build("https://rdap.org", {
                path: ["ip", prefix]
            }),
            method: 'GET'
        })
            .then(data => data.data)
            .then(({startAddress, endAddress, remarks}) => {

                const prefixes = ipUtils.ipRangeToCidr(startAddress, endAddress);

                return prefixes
                    .map(inetnum => ({
                        inetnum,
                        items: remarks.map(({description}) => description).flat()
                    }));
            })
            .catch(() => {
                return [];
            });
    }

    getGeofeed = (prefix) => {

        const [ip, bits] = ipUtils.getIpAndCidr(prefix);
        const af = ipUtils.getAddressFamily(ip);

        const prefixes = [ip];

        for (let i=bits; i >=16; i--) {
            prefixes.push(ipUtils._expandIP(ipUtils.fromBinary(ipUtils.applyNetmask([ip, i].join("/"), af), af), af) + `/${i}`);
        }

        let answers = [];
        return batchPromises(1, prefixes, prefix => {
            return this.getRdap(prefix)
                .then(data => {
                    for (let item of data) {
                        if (item.items.length && item.items.find(i => i.toLowerCase().startsWith("geofeed"))) {
                            item.items = item.items.filter(i => i.toLowerCase().startsWith("geofeed"))
                            answers.push(item);
                        }
                    }
                });
        })
            .then(() => {
                const index = {};
                for (let a of answers) {
                    index[a.prefix] = a;
                }

                return Object.values(index);
            })
            .then(answers => {
                let index = {};

                answers
                    .forEach(({inetnum, items}) => {

                        items
                            .map(remark => {
                                const geofeedFile = this.matchGeofeedFile(remark);

                                if (geofeedFile && !this.testGeofeedRemarkStrict(remark)) {
                                    console.log(`Error: the remark MUST be in the format: Geofeed https://url/file.csv. Uppercase G, no colon, no quotes, and one space.`);
                                }

                                return geofeedFile;
                            })
                            .flat()
                            .forEach(geofeed => {
                                if (geofeed) {
                                    index[`${inetnum}-${geofeed}`] = {
                                        inetnum,
                                        geofeed,
                                        lastUpdate: moment() // It doesn't matter in this case
                                    };
                                }
                            });
                    })

                return Object.values(index);
            });
    }

}