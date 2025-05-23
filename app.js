import { initializeBrowser, closeBrowser } from './utils/puppeteerClient.js';
import mangaQueue from './queues/mangaQueue.js';
import chapterQueue from './queues/chapterQueue.js';

import cron from 'node-cron';

await  mangaQueue.obliterate({ force: true });
await chapterQueue.obliterate({ force: true });

await initializeBrowser();

const modules = [
    'mangaraw-ma',
];


cron.schedule('*/5 * * * *', async () => {
    console.log('Running cron');

    for (const modulePath of modules) {
        const module = await import(`./modules/${modulePath}/index.js`);
        const mangaList = await module.getMangaList(1);

        console.log(`Page 1 - ${mangaList.length} mangas`);

        for (const manga of mangaList) {
            mangaQueue.add({
                url: manga.url,
                title: manga.title,
                module: modulePath,
            });
        }
    }
});

for (const modulePath of modules) {
    const module = await import(`./modules/${modulePath}/index.js`);
    for (let i = 1; i <= 3; i++) {
        const mangaList = await module.getMangaList(i);

        console.log(`Page ${i} - ${mangaList.length} mangas`);

        for (const manga of mangaList) {
            mangaQueue.add({
                url: manga.url,
                title: manga.title,
                module: modulePath,
            });
        }
    }
}



process.on( 
    'SIGTERM',
    async () => {
        await chapterQueue.empty();
        await mangaQueue.empty();

        await closeBrowser();

        await chapterQueue.close();
        await mangaQueue.close();
    },
);
