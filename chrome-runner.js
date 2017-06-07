const chrome = require('chrome-remote-interface');
const { ChromeLauncher } = require('lighthouse/lighthouse-cli/chrome-launcher');

module.exports = async function (url) {

    function launchChrome(headless = true) {
        const launcher = new ChromeLauncher({
            port: 9222,
            autoSelectChrome: true,
            additionalFlags: [
                '--window-size=375,667',
                '--disable-gpu',
                headless ? '--headless' : ''
            ]
        });

        return launcher.run().then(() => launcher).catch(err => {
            return launcher.kill().then(() => {
                throw err;
            }, console.error);
        });
    }

    const launcher = await launchChrome();

    return new Promise(resolve => {
        chrome(async protocol => {
            const { Page, Runtime } = protocol;
            await Promise.all([ Page.enable(), Runtime.enable() ]);
            Page.navigate({ url });
            Page.loadEventFired(async () => {
                const timing = await Runtime.evaluate({
                    expression: 'JSON.stringify(window.performance.timing)'
                });
                const firstPaint = await Runtime.evaluate({
                    expression: `
                        JSON.stringify(performance.getEntriesByType("paint").find(e => e.name === "first-paint"))
                    `
                });
                protocol.close();
                launcher.kill();
                resolve({
                    timing: JSON.parse(timing.result.value),
                    firstPaint: JSON.parse(firstPaint.result.value).startTime
                });
            });
        }).on('error', err => {
            throw Error('Cannot connect to Chrome:' + err);
        });
    });
};
