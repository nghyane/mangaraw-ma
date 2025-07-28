
import { JSDOM } from 'jsdom';
import { getInitializedBrowser, initializeBrowser } from '../../utils/puppeteerClient.js';
import fs from 'fs';
import getZToken from './zToken.js';

const BASE_URL = 'https://mangaraw.ma';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const AD_BLOCK_LIST = [
    'adservice.google.com',
    'ad.doubleclick.net',
    'pagead2.googlesyndication.com',
    'googleads.g.doubleclick.net',
    'tpc.googlesyndication.com',
    'googleadservices.com',
    'fonts.gstatic.com',
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'www.googletagservices.com',
    'lib.cdnlibjs.com',
    'chaseherbalpasty.com',
    'bullionglidingscuttle.com',
    'sahpupxhyk.com',
    'isolatedovercomepasted.com'
];

const getMangaList = async (page = 1) => {
    const response = await fetch(`https://mangaraw.ma/page/${page}`)
        .then((response) => {
            return response.text();
        })
        .catch((error) => {
            throw new Error(error);
        });

    const document = new JSDOM(response).window.document;

    const mangas = [];

    document.querySelectorAll('.story_item .mg_info .mg_name > a').forEach((element) => {
        mangas.push({
            title: element.textContent,
            url: `${BASE_URL}${element.getAttribute('href')}`,
        });
    });

    return mangas;
}

const getManga = async (url) => {
    const response = await fetch(url).then((response) => {
        return response.text();
    }).catch((error) => {
        throw new Error(error);
    });

    const document = new JSDOM(response).window.document;

    let title = document.querySelector('.detail_story .detail_infomation .detail_name > h1').textContent;
    title = title.replace('Raw Free', '').trim();

    let content = document.querySelector('.detail_review .detail_reviewContent').innerHTML;
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    content = content.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    content = content.replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '');
    content = content.replace(/<a\b[^<]*(?:(?!<\/a>)<[^<]*)*<\/a>/gi, '');
    content = content.replace(/\n/g, '').replace(/\s{2,}/g, ' ').trim();

    let image = BASE_URL + document.querySelector('.detail_story .detail_avatar img').getAttribute('src');


    const chapters = [];
    document.querySelectorAll('.detail_chapter .detail_chapterContent .chapter_box .item').forEach((element) => {
        const URL = element.querySelector('button').getAttribute('onclick').match(/'(.+?)'/)[1];

        const number = URL
            .match(/第(\d+(\.\d+)?)/);
        const chapter = {
            title: `第${number[1]}話`,
            index: parseFloat(number[1]),
            url: `${BASE_URL}${URL}`,
        };

        chapters.push(chapter);
    });

    const genres = [];
    const info = {};

    document.querySelectorAll('.detail_story .detail_infomation .detail_listInfo .item').forEach((element) => {
        const label = element.querySelector('.info_label').textContent.trim();

        if (label === 'Status') {
            info.status = element.querySelector('.info_value').textContent.trim() == 'On Going' ? 'ongoing' : 'completed';
        }

        if (label === 'Author') {
            info.author = element.querySelector('.info_value').textContent.trim();
        }

        if (label === 'Artist') {
            info.artist = element.querySelector('.info_value').textContent.trim();
        }

        if (label === 'Categories') {
            element.querySelectorAll('.info_value > a').forEach((genre) => {
                genres.push(genre.textContent.trim());
            });
        }

        if (label === 'Other name') {
            info.alternative_title = element.querySelector('.info_value').textContent.trim();
        }
    });

    return {
        title: title,
        description: content,
        cover_image: image,
        genres: genres,
        chapters,
        status: info.status || 'ongoing',
        author_name: !info.author == 'Updating' ? info.author : null,
        artist_name: !info.artist == 'Updating' ? info.artist : null,
        alternative_title: !info.alternative_title == 'Updating'  || !info.alternative_title == '' ? info.alternative_title : null,
    };
}

const getChapterImages = async (url, savePath) => {
    await initializeBrowser();

    const zToken = await getZToken();
    url = url + `?t=${zToken}`;

    const browser = await getInitializedBrowser();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    await page.setUserAgent(USER_AGENT);

    const newLazyText = await fs.promises.readFile(
        new URL('./lazyLoad.txt', import.meta.url)
    );

    page.on('request', (request) => {
        if (request.url().includes('lazyload.min.js')) {
            request.respond({
                status: 200,
                contentType: 'application/javascript',
                body: newLazyText,
            });

            return;
        }

        if (request.url().includes('api.ipify.org')) {
            request.respond({
                status: 200,
                contentType: 'text/plain',
                body: '81.180.122.48',
            });

            return;
        };

        if (request.url().includes('mangaraw.ma/api/v1/m/c')) {
            request.respond({
                status: 200,
                contentType: 'application/json',
                body: '{"s":true}',
            });

            return;
        }

        if (AD_BLOCK_LIST.some((ad) => request.url().includes(ad))) {
            request.abort();
            return;
        }

        if (request.resourceType() === 'stylesheet' || request.resourceType() === 'font') {
            request.abort();
            return;
        }

        const files = [
            'bg.jpg',
            'logo.png',
            'favicon.ico',
            'owl.carousel.min.js',
            'bootstrap.min.js',
            'jquery-ui.min.js',
            'script.js',
            'data:image'
        ];

        if (files.some((file) => request.url().includes(file))) {
            request.abort();
            return;
        }

        request.continue();
    });



    await page.goto(url, {
        waitUntil: 'load',
    });

    const elements = await page.$$("#chapter_boxImages .imageChap");
    const images = [];

    let errors = 0;

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        await element.waitForSelector("canvas", {
            visible: true,
            timeout: 5000,
        }).catch((error) => {
            errors++;
        });

        const canvas = await element.$('canvas');

        if (!canvas) {
            continue;
        }

        const image = await page.evaluate((canvas) => {
            return canvas.toDataURL();
        }, canvas);


        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
        }

        const imagePath = `${savePath}/${i}.png`;
        await fs.promises.writeFile(imagePath, buffer).catch((error) => {
            throw new Error(error);
        });

        images.push({
            index: i,
            imagePath: imagePath,
        });
    }

    if (errors > 3) {
        throw new Error('Too many errors on images', url);
    }

    await page.close();

    return images;
}

export { getMangaList, getManga, getChapterImages };
