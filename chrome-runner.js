const chrome = require('chrome-remote-interface');
const { ChromeLauncher } = require('lighthouse/lighthouse-cli/chrome-launcher');

module.exports = async function (url) {

    function launchChrome(headless = true) {
        const launcher = new ChromeLauncher({
            port: 9222,
            autoSelectChrome: true,
            additionalFlags: [
                '--window-size=412,732',
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

    function onPageLoad(Runtime) {
        const js = 'JSON.stringify(window.performance.timing)';

        return Runtime.evaluate({ expression: js })
            .then(data => {
                const { connectStart, domInteractive, domComplete } = JSON.parse(data.result.value);
                return { connectStart, domInteractive, domComplete };
            });
    }

    const launcher = await launchChrome();

    return new Promise((resolve) => {
        chrome(protocol => {
            const { Page, Runtime } = protocol;

            Promise.all([ Page.enable(), Runtime.enable() ]).then(() => {
                Page.navigate({ url });
                Page.loadEventFired(() => {
                    onPageLoad(Runtime).then((data) => {
                        protocol.close();
                        launcher.kill();
                        resolve(data);
                    });
                });
            });

        }).on('error', err => {
            throw Error('Cannot connect to Chrome:' + err);
        });
    });
};