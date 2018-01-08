const puppeteer = require('puppeteer');

async function getPic() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 2560,
        height: 1440
    });
    await page.goto('https://baidu.com');
    await page.screenshot({
        path: 'baidu.png'
    });
    await page.close();
    await browser.close();
}

getPic();