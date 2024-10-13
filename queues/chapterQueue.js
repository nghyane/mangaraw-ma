import Queue from 'bull';
import queueOptions from '../config/queueOptions.js';


const chapterQueue = new Queue('chapter', queueOptions);

chapterQueue.process(async (job, done) => {
    const module = await import(`../modules/${job.data.module}/index.js`);

    await module.getChapterImages(job.data.chapter.url);



    done();
});

export default chapterQueue;