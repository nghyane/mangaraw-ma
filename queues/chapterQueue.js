import Queue from 'bull';
import queueOptions from '../config/queueOptions.js';


const chapterQueue = new Queue('chapter', queueOptions);

chapterQueue.process(async (job, done) => {
    // check time running
    const start = new Date();

    const module = await import(`../modules/${job.data.module}/index.js`);

    const images = await module.getChapterImages(job.data.chapter.url);

    const end = new Date() - start;

    console.log(images);
    console.info('Execution time: %dms', end);


    done();
});

export default chapterQueue;