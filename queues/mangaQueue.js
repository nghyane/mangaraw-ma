import Queue from 'bull';
import queueOptions from '../config/queueOptions.js';
import chapterQueue from './chapterQueue.js';
import redisClient from '../utils/redisClient.js';
import { API_CHECK_MANGA, API_PUSH_MANGA } from '../config/apiCrawler.js';
import { uploadImage } from "../utils/bunnyClient.js";

const mangaQueue = new Queue('manga', queueOptions);

mangaQueue.process(async (job, done) => {
    const lockKey = `manga:${Buffer.from(job.data.url).toString('base64')}`;
    if (await redisClient.exists(lockKey)) {
        return done();
    }

    await redisClient.set(lockKey, '1', 'EX', 500); 

    const module = await import(`../modules/${job.data.module}/index.js`);
    const manga = await module.getManga(job.data.url).catch((error) => {
        console.error(
            error,
        );
    });

    if (!manga) {
        return done();
    }

    let existManga = null;

    const response = await fetch(`${API_CHECK_MANGA}?name=${encodeURIComponent(manga.title)}`).then((response) => {
        return response.json();
    }).catch((error) => {
        console.error(error, manga);

        return {
            exists: false,
            skip: true,
            data: null,
        };
    });



    if (!response.exists) {
        console.info('Manga not exists', manga.title);

        const sanitizedTitle = manga.title
            .substring(0, 100)
            .toLowerCase();

        const imagePath = `uploads/images/${sanitizedTitle}.png`;

        const cover_image = await uploadImage(manga.cover_image, imagePath)
            .then((response) => {
                if (response.HttpCode >= 300) {
                    throw new Error('Upload cover failed');
                }

                return `https://storage.mangaraw.plus/${imagePath}`;
            })
            .catch((error) => {
                console.error(
                    error,
                );
            });

        if (!cover_image) {
            return done();
        }

        manga.cover_image = cover_image;

        const pushResponse = await fetch(API_PUSH_MANGA, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(manga),
        }).then((response) => {
            if (response.status >= 300) {
                throw new Error('HTTP error while pushing manga', response.text());
            }

            return response.json();
        }).catch((error) => {
            console.error(error, manga);

            return {
                skip: true,
            };
        });

        existManga = pushResponse.data;
    } else {
        existManga = response.data;
    }

    if (response.skip) {
        return done();
    }

    if (existManga?.id) {
        console.info('Scanning chapters', manga.title);

        const existingTitles = new Set(
            existManga.chapters ? existManga.chapters.map(existChapter => existChapter.title) : []
        );

        for (const chapter of manga.chapters.reverse()) {
            if (!existingTitles.has(chapter.title)) {
                chapterQueue.add({
                    chapter,
                    manga: {
                        title: manga.title,
                        id: existManga.id,
                    },
                    module: job.data.module,
                });

                existingTitles.add(chapter.title);
            }
        }
    }

    return done();
});

export default mangaQueue;
