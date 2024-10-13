import puppeteer from 'puppeteer';

const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/chromium-browser';
let browser = null;

const initializeBrowser = async () => {
    if (!browser) {
        try {
            browser = await puppeteer.launch({
                executablePath: CHROME_PATH,
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        } catch (error) {
            throw error;
        } finally {
            if (!browser) {
                throw new Error('Failed to initialize Puppeteer browser.');
            }
        }
    }
};

const getInitializedBrowser = () => {
    if (!browser) {
        throw new Error('Puppeteer browser is not initialized. Call initializeBrowser first.');
    }

    return browser;
};

const closeBrowser = async () => {
    if (browser) {
        await browser.close();
        browser = null;
    }
};

export { initializeBrowser, getInitializedBrowser, closeBrowser };
