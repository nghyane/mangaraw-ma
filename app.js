import { initializeBrowser, closeBrowser } from './utils/puppeteerClient.js';

import mangaQueue from './queues/mangaQueue.js';

await initializeBrowser();

mangaQueue.empty();

const modules = [
    'mangaraw-ma',
];

modules.forEach(async (modulePath) => {
    const module = await import(`./modules/${modulePath}/index.js`);
    const mangaList = await module.getMangaList();

    for (const manga of mangaList) {
        mangaQueue.add({
            url: manga.url,
            title: manga.title,
            module: modulePath,
        });

        break;
    }
});


process.on('SIGINT', async () => {
    await closeBrowser();
});