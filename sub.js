import { initializeBrowser, closeBrowser } from './utils/puppeteerClient.js';
import mangaQueue from './queues/mangaQueue.js';
import chapterQueue from './queues/chapterQueue.js';

await initializeBrowser();


process.on('SIGTERM', async () => {
    await closeBrowser();

    await chapterQueue.close();
    await mangaQueue.close();
});