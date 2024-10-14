
import { JSDOM } from 'jsdom';
import { getInitializedBrowser } from '../../utils/puppeteerClient.js';
import fs from 'fs';
import getZToken from './zToken.js';

const BASE_URL = 'https://mangaraw.ma';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36';
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
    document.querySelectorAll('.detail_story .detail_infomation .detail_listInfo .item .info_value > a').forEach((element) => {
        if (element.textContent === 'Updating') return;

        genres.push(element.textContent.trim());
    });

    return {
        title: title,
        content: content,
        image: image,
        genres: genres,
        chapters,
    };
}

const getChapterImages = async (url) => {
    const zToken = await getZToken();
    url = url + `?t=${zToken}`;

    console.log(url + '\n');

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
            'script.js'
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

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];

        await element.waitForSelector("canvas", {
            visible: true,
            timeout: 1000,
        });

        const canvas = await element.$('canvas');

        const image = await page.evaluate((canvas) => {
            return canvas.toDataURL();
        }, canvas);


        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        const imagePath = `./images/${i}.png`;
        await fs.promises.writeFile(imagePath, buffer).catch((error) => {
            throw new Error(error);
        });

        images.push({
            index: i,
            imagePath: imagePath,
        });
    }


    await page.close();

    return images;
}

export { getMangaList, getManga, getChapterImages };
