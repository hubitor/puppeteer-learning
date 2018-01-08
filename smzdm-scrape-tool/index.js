const puppeteer = require('puppeteer');
const FAXIAN_URL_NEWEST = 'https://faxian.smzdm.com/';
const FAXIAN_URL_HOSTE_IN_3_HOURS = 'https://faxian.smzdm.com/h2s0t0f0c0p1/#filter-block';
const FAXIAN_URL_HOSTE_IN_12_HOURS = 'https://faxian.smzdm.com/h3s0t0f0c0p1/#filter-block';
const FAXIAN_URL_HOSTE_IN_24_HOURS = 'https://faxian.smzdm.com/h4s0t0f0c0p1/#filter-block';

async function run() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.setViewport({
        width: 1920,
        height: 1080
    });

    // 去哪个页面搜索？
    await page.goto(FAXIAN_URL_HOSTE_IN_24_HOURS);
    await scrollPage(page);
    page.on('console', async(msg) => {
        if (msg.text === 'scroll complete') {
            console.log(await getFaXianContent(page));
        }
    })

}

async function scrollPage(page) {
    await page.evaluate(() => {
        let timer = window.setInterval(() => {
            // 会加载5页
            // 高度 2页：5417 3页：7321 4页：9225 5页11129 各取所需
            // 每页20个内容，其实我一般只看50个左右，只加载3页就可以
            if (document.body.scrollHeight > 10000) {
                window.clearInterval(timer);
                // 发送消息，表明翻页完成
                console.log('scroll complete');
                return;
            }
            window.scrollBy(0, document.body.scrollHeight);
        }, 1000);
    });

}


// 发现页面
async function getFaXianContent(page) {
    const LIST_TITLE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > h5 > a';
    const LIST_PRICE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > div.z-highlight.z-ellipsis'
    const TOP_COUNT = 50;
    let result = [];

    for (let i = 1; i < TOP_COUNT; i++) {
        let titleSelector = LIST_TITLE_SELECTOR.replace('INDEX', i);
        let priceSelector = LIST_PRICE_SELECTOR.replace('INDEX', i);
        let {
            title,
            href
        } = await page.evaluate(sel => {
            let title = document.querySelector(sel).innerText;
            let href = document.querySelector(sel).href;
            return {
                title,
                href
            };
        }, titleSelector);
        let price = await page.evaluate(sel => document.querySelector(sel).innerText, priceSelector);
        result.push({
            title,
            price,
            href
        });
    }
    return result;
}

run();