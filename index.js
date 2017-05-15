const phantom = require('phantom');
const median = require('stats-median');

function twoDigits(value) {
    return (value / 1000).toFixed(2) * 1;
}

async function start({ url, num, notify }) {

    function getTimings(data) {
        return function (name) {
            return data
              .map(timing => timing[name])
              .filter(timing => timing > 0)
              .sort();
        };
    }

    function analyze(data) {
        const domInteractiveList = getTimings(data)('domInteractive');
        const domCompleteList = getTimings(data)('domComplete');

        return {
            raw: data,
            domInteractive: {
                median: twoDigits(median.calc(domInteractiveList))
            },
            domComplete: {
                median: twoDigits(median.calc(domCompleteList))
            }
        };
    }

    const data = [];

    for (var i = 1; i <= num; i++) {
        notify(i);

        const instance = await phantom.create();
        const page = await instance.createPage();
        await page.open(url);

        const { connectStart, domInteractive, domComplete } = await page.evaluate(function () {
            return window.performance.timing;
        });

        data.push({
            domInteractive: domInteractive - connectStart,
            domComplete: domComplete - connectStart
        });

        await instance.exit();
    }

    return analyze(data);
}

module.exports = function (params) {
    return start(params);
};
