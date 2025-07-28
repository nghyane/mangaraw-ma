import puppeteer from 'puppeteer';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const getChromePath = () => {
    // If CHROME_PATH is explicitly set, use it
    if (process.env.CHROME_PATH) {
        return process.env.CHROME_PATH;
    }

    const platform = process.platform;

    // Common Chrome/Chromium paths for different platforms
    const chromePaths = {
        darwin: [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        ],
        linux: [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
        ],
        win32: [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        ]
    };

    const pathsToCheck = chromePaths[platform] || [];

    // Check if any of the common paths exist
    for (const path of pathsToCheck) {
        if (existsSync(path)) {
            return path;
        }
    }

    // Try to find Chrome using system commands
    try {
        if (platform === 'darwin') {
            // On macOS, try to find Chrome using mdfind
            const result = execSync('mdfind "kMDItemCFBundleIdentifier == \'com.google.Chrome\'"', { encoding: 'utf8' }).trim();
            if (result) {
                const chromePath = `${result.split('\n')[0]}/Contents/MacOS/Google Chrome`;
                if (existsSync(chromePath)) {
                    return chromePath;
                }
            }
        } else if (platform === 'linux') {
            // On Linux, try which command
            const result = execSync('which google-chrome || which chromium-browser || which chromium', { encoding: 'utf8' }).trim();
            if (result && existsSync(result)) {
                return result;
            }
        }
    } catch (error) {
        console.warn('Could not auto-detect Chrome path:', error.message);
    }

    // Fallback: let Puppeteer use its bundled Chromium
    return null;
};

const CHROME_PATH = getChromePath();
let browserPromise = null;

const initializeBrowser = async () => {
    if (!browserPromise) {
        const launchOptions = {
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
        };

        // Only set executablePath if we found a Chrome installation
        if (CHROME_PATH) {
            launchOptions.executablePath = CHROME_PATH;
            console.log('Using Chrome at:', CHROME_PATH);
        } else {
            console.log('Using Puppeteer bundled Chromium');
        }

        browserPromise = puppeteer.launch(launchOptions).catch((error) => {
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
