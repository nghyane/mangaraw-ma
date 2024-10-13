import Queue from 'bull';
import queueOptions from '../config/queueOptions.js';
import chapterQueue from './chapterQueue.js';

const mangaQueue = new Queue('manga', queueOptions);

mangaQueue.process(async (job, done) => {
    const module = await import(`../modules/${job.data.module}/index.js`);
    const manga = await module.getManga(job.data.url);


    for (const chapter of manga.chapters) {
        chapterQueue.add({
            chapter,
            manga: {
                title: manga.title,
            },
            module: job.data.module,
        });

        break;
    }

    done();
});


export default mangaQueue;
