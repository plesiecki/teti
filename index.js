const phantom = require('phantom');
const median = require('stats-median');
const percentile = require('stats-percentile');
const mean = require('stats-mean');
const variance = require('stats-variance');

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
                median: twoDigits(median.calc(domInteractiveList)),
                mean: twoDigits(mean.calc(domInteractiveList)),
                p95: twoDigits(percentile.calc(domInteractiveList, 95)),
                variance: twoDigits(variance.calc(domInteractiveList))
            },
            domComplete: {
                median: twoDigits(median.calc(domCompleteList)),
                mean: twoDigits(mean.calc(domCompleteList)),
                p95: twoDigits(percentile.calc(domCompleteList, 95)),
                variance: twoDigits(variance.calc(domCompleteList))
            }
        };
    }

    const data = [];

    for (var i = 1; i <= num; i++) {
        const instance = await phantom.create();
        const page = await instance.createPage();
        await page.open(url);

        const { connectStart, domInteractive, domComplete } = await page.evaluate(function () {
            return window.performance.timing;
        });

        const timing = {
            domInteractive: domInteractive - connectStart,
            domComplete: domComplete - connectStart
        };

        data.push(timing);

        notify(i, timing);
        await instance.exit();
    }

    return analyze(data);
}

module.exports = function (params) {
    return start(params);
};
