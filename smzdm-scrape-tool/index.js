const puppeteer = require('puppeteer');

const SEARCH_URL = 'http://search.smzdm.com/?c=faxian&s=SEARCHWORD&p=PAGENUMBER';

const FAXIAN_URL_NEWEST = 'https://faxian.smzdm.com/';
const FAXIAN_URL_HOSTE_IN_3_HOURS = 'https://faxian.smzdm.com/h2s0t0f0c0p1/#filter-block';
const FAXIAN_URL_HOSTE_IN_12_HOURS = 'https://faxian.smzdm.com/h3s0t0f0c0p1/#filter-block';
const FAXIAN_URL_HOSTE_IN_24_HOURS = 'https://faxian.smzdm.com/h4s0t0f0c0p1/#filter-block';

// scrapeFaxian();
scrapeSearch('apple');

async function scrapeFaxian(url = FAXIAN_URL_HOSTE_IN_3_HOURS) {
    // 怎么感觉无头模式更加慢呢...
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    // 这里暂时不能像search页面那样只放一个请求进来，否则会影响到页面的高度
    // 那样的话scroll的逻辑又要改
    // 后期还可以提升性能
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url.endsWith('.png') || interceptedRequest.url.endsWith('.jpg'))
            interceptedRequest.abort();
        else
            interceptedRequest.continue();
    });

    await page.setViewport({
        width: 1920,
        height: 1080
    });

    // 去哪个页面搜索？
    await page.goto(url);
    await scrollPage(page);
    page.on('console', async(msg) => {
        if (msg.text === 'scroll complete') {
            console.log(await getFaXianContent(page));
            // 这个要放这里面来，否则浏览器会提前关掉
            await browser.close();
        }
    })

}

async function scrapeSearch(searchWord, pageCount = 1) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // 过滤无用请求，提升性能
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url.includes('search.smzdm.com'))
            interceptedRequest.continue();
        else
            interceptedRequest.abort();
    });

    await page.setViewport({
        width: 1920,
        height: 1080
    });


    for (let i = 1; i <= pageCount; i++) {
        let url = SEARCH_URL.replace('SEARCHWORD', searchWord).replace('PAGENUMBER', i);
        await page.goto(url);
        console.log(await getSearchContent(page));
    }

    await browser.close();
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
        }, 200);
    });
}


// 搜索页面
async function getSearchContent(page) {
    const LIST_TITLE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > div.z-feed-content > h5 > a.feed-nowrap';
    const LIST_PRICE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > div.z-feed-content > h5 > a:nth-child(2) > div';
    const LIST_TIME_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > div.z-feed-content > div.z-feed-foot > div.z-feed-foot-r > span';
    const LIST_COUNT = 20;
    let result = [];

    for (let i = 1; i <= LIST_COUNT; i++) {
        let titleSelector = LIST_TITLE_SELECTOR.replace('INDEX', i);
        let priceSelector = LIST_PRICE_SELECTOR.replace('INDEX', i);
        let timeSelector = LIST_TIME_SELECTOR.replace('INDEX', i);
        let {
            title,
            href,
        } = await page.evaluate(sel => {
            let title = document.querySelector(sel).title;
            let href = document.querySelector(sel).href;
            return {
                title,
                href
            };
        }, titleSelector);
        let price = await page.evaluate(sel => document.querySelector(sel).innerText, priceSelector);
        let time = await page.evaluate(sel => document.querySelector(sel).innerText, timeSelector);
        result.push({
            title,
            price,
            time,
            href
        });
    }
    return result;
}

// 发现页面
async function getFaXianContent(page) {
    const LIST_TITLE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > h5 > a';
    const LIST_PRICE_SELECTOR = '#feed-main-list > li:nth-child(INDEX) > div > div.z-highlight.z-ellipsis'
    const TOP_COUNT = 50;
    let result = [];

    for (let i = 1; i <= TOP_COUNT; i++) {
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