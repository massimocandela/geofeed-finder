class Util {

    static testGeofeedRemark(remark) {
        return /^Geofeed:?\s+https?:\/\/\S+/gi.test(remark);
    }

    static testGeofeedRemarkStrict(remark) {
        return /\sGeofeed https?:\/\/\S+/g.test(remark);
    }

    static matchGeofeedFile(remark) {
        return remark.match(/\bhttps?:\/\/\S+/gi) || [];
    }

    static checkHtmlContent(content) {
        return /<a|<div|<span|<style|<link/gi.test(content)
    }

    static getParsedGithubUrl(file) {
        let parsedUrl;
        (file.startsWith('https://github.com/') ||
            file.startsWith('http://github.com/') ||
            file.startsWith('github.com/')) ?
            parsedUrl = file.replace('/blob/', '/raw/') : parsedUrl = file;
        return parsedUrl;
    }
}

export default Util;