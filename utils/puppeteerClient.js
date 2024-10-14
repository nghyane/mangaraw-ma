import puppeteer from 'puppeteer';

const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/chromium-browser';
let browserPromise = null;

const initializeBrowser = async () => {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--enable-features=NetworkService',
                '--ignore-certificate-errors',
                '--disable-infobars',
                '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees,AudioServiceOutOfProcess,WebXR,WebXRGamepadSupport,OpenVR',
            ],
        }).catch((error) => {
            browserPromise = null;
            console.error('Error initializing Puppeteer:', error);
            throw new Error('Failed to initialize Puppeteer browser.');
        });
    }

    const browser = await browserPromise;

    if (!browser) {
        throw new Error('Failed to initialize Puppeteer browser.');
    }

    return browser;
};

const getInitializedBrowser = async () => {
    if (!browserPromise) {
        throw new Error('Puppeteer browser is not initialized. Call initializeBrowser first.');
    }

    const browser = await browserPromise;

    if (!browser) {
        throw new Error('Puppeteer browser is not initialized.');
    }

    return browser;
};

const closeBrowser = async () => {
    if (browserPromise) {
        const browser = await browserPromise;
        if (browser) {
            await browser.close();
            browserPromise = null;
        }
    }
};

export { initializeBrowser, getInitializedBrowser, closeBrowser };
