import pLimit from "p-limit";
import Queue from 'bull';
import fs from "fs";
import queueOptions from '../config/queueOptions.js';
import redisClient from '../utils/redisClient.js';
import { uploadImage, deleteFile } from "../utils/bunnyClient.js";
import { API_PUSH_CHAPTER } from '../config/apiCrawler.js';


const chapterQueue = new Queue('chapter', queueOptions);

chapterQueue.process(async (job, done) => {
    const limit = pLimit(15);
    console.log(`${job.data.manga.title} - ${job.data.chapter.title}`); 

    const module = await import(`../modules/${job.data.module}/index.js`);
    const images = await module.getChapterImages(job.data.chapter.url, `./images/${job.data.manga.id}/${job.data.chapter.index}`).catch((error) => {
        console.error(
            error,
        );
    });

    if (!images || images.length === 0) {
        return done();
    }

    const promises = images.map((image) => {
        return limit(async () => {
            const upload = await uploadImage(image.imagePath, `${job.data.manga.id}/${job.data.chapter.index}/${image.index}.png`);

            if (upload.HttpCode >= 300) {
                throw new Error('Upload image failed');
            }

            return `/${job.data.manga.id}/${job.data.chapter.index}/${image.index}.png`;
        });
    });

    try {
        await Promise.all(promises);
    } catch (error) {
        await deleteFile(`/${job.data.manga.id}/${job.data.chapter.index}/`);

        console.error(error);

        return done();
    }

    
    await fetch(`${API_PUSH_CHAPTER}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            manga_id: Number.parseInt(job.data.manga.id),
            title: job.data.chapter.title,
            index: Number.parseInt(job.data.chapter.index),
            image_urls: images.map((_image, index) => {
                return {
                    index,
                    url: `https://storage.mangaraw.plus/${job.data.manga.id}/${job.data.chapter.index}/${index}.png`,
                };
            }),
            source_link: job.data.chapter.url,
        }),
    }).then(async (response) => {
        if (response.status >= 300) {
            throw new Error('HTTP error while pushing chapter');
        }

        return response.json();
    }).then((response) => {
        if (!response.success) {
            throw new Error('Failed to push chapter');
        }

        console.log(`Chapter ${job.data.chapter.title} pushed`);
    }).catch((error) => {
        console.error(
            error,
        );
    });

    fs.rm(`./images/${job.data.manga.id}/${job.data.chapter.index}`, { recursive: true }, (error) => {
        if (error) {

            console.error(
                error,
                'Failed to remove images',
            );
        }
    });

    return done();
});


export default chapterQueue;