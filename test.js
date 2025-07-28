import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const TARGET_URL = 'https://mangaraw.ma/manga/%E6%88%90%E7%94%B0%E8%89%AF%E6%82%9F%C3%97%E6%A3%AE%E4%BA%95%E3%81%97%E3%81%A5%E3%81%8D-raw-free/%E7%AC%AC22%E8%A9%B1/?t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTAyMjU3NTEsImkiOjF9.f99E0aSLfeZ2WiH5lWmgtZ_AAomwnyfLuC5BvmgG9qE';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
 });
  const page = await browser.newPage();

  await page.route('**/*', (route) => {
    if (route.request().url().includes('lazyload.min.js')) {
     
      return route.continue({
        headers: {
          'Content-Type': 'application/javascript',
        },
        body: fs.readFileSync(path.join(process.cwd(), 'modules', 'mangaraw-ma', 'lazyLoad.txt')),
      });
    }
    

    route.continue();
  });

  // 2. Mở trang truyện
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  const images = await page.$$('#chapter_boxImages .imageChap');

  let i = 0;
  for (const image of images) {
    await image.waitForSelector('canvas', { visible: true });

    console.log(i);

    i++;
  }

})();
