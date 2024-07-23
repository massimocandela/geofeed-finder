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
        if (file.startsWith('https://github.com/') || file.startsWith('github.com/')) {
            return file.replace('github.com', 'raw.githubusercontent.com').replace('/blob', '');
        }

        return file;
    }
}

export default Util;