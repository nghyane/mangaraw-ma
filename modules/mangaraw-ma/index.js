
import { JSDOM } from 'jsdom';
import { getInitializedBrowser } from '../../utils/puppeteerClient.js';
import fs from 'fs';
import getZToken from './zToken.js';

const BASE_URL = 'https://mangaraw.ma';

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

    const browser = getInitializedBrowser();
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    // ./lazyLoad.txt
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

        // https://mangaraw.ma/api/v1/m/c -> {"s":true}
        if (request.url().includes('mangaraw.ma/api/v1/m/c')) {
            request.respond({
                status: 200,
                contentType: 'application/json',
                body: '{"s":true}',
            });

            return;
        }


        request.continue();

    });



    await page.goto(url, {
        waitUntil: 'domcontentloaded',
    });

    const elements = await page.$$(".chapter_boxImages .imageChap");

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        await element.scrollIntoView();

    }



    await page.screenshot({ path: 'example.png', fullPage: true });
    await page.close();

    process.exit();

    return;
}

export { getMangaList, getManga, getChapterImages };
