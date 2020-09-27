import { Address4 as v4, Address6 as v6 } from 'ip-address';
import ipUtils from "ip-sub";

const cidrToRange = (cidr) => {
    if (typeof(cidr) === "string") {
        const af = ipUtils.getAddressFamily(cidr);
        const addr = (af === 4) ? new v4(cidr) : new v6(cidr);

        if (af == 6) {
            console.log([addr.startAddress().address, addr.endAddress().address]);
        }
        return [addr.startAddress().address, addr.endAddress().address];
    }
};

export default function ipRangeToCidr(ip1, ip2){

    const af = ip1.includes(":") ? 6 : 4;
    let blockSize, ipSizeCheck, splitChar;

    if (af === 4) {
        blockSize = 8;
        ipSizeCheck = 32;
        splitChar = ".";
    } else {
        blockSize = 16;
        ipSizeCheck = 64;
        splitChar = ":";
    }



    const ip1Blocks = ip1.split(splitChar);
    const ip2Blocks = ip2.split(splitChar);

    let bits = 0;

    for (let n=0; n<= ip1Blocks.length; n++) {
        if (ip1Blocks[n] === ip2Blocks[n]) {
            break;
        } else {
            bits += blockSize;
        }
    }


    for (let b=bits; b <= ipSizeCheck; b++){
        const tested = `${ip1}/${b}`;
        const range = cidrToRange(tested);
        if (range[0] === ip1 && range[1] === ip2) {
            return tested;
        }
    }

    console.log("Cannot parse inetnum", ip1, ip2);
    return null;
}
