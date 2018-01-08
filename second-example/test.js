const puppeteer = require('puppeteer');

let scrape = async() => {
    // 用于存放总数据
    let result = {};
    let subjectItems;
    let getSubjectSelector = (i) => {
        return `#default > div > div > div > aside > div.side_categories > ul > li > ul > li:nth-child(${i}) > a`;
    }

    // config
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1280,
        height: 720
    });

    await page.goto('http://books.toscrape.com');

    let categoryLinks = await getCategoryLinks(page);
    console.log(categoryLinks.length);

    for (let [title, link] of categoryLinks) {
        let outcome = [];

        // 爬第一页
        await page.goto(link);
        outcome = [...outcome, ...(await scrapePage(page))];

        let pageCount = await getPageCount(page);

        // 爬第二页之后的页面
        if (pageCount > 1) {
            for (let i = 2; i <= pageCount; i++) {
                let url = link.replace('index', 'page-' + i);
                await page.goto(url);
                outcome = [...outcome, ...(await scrapePage(page))]
            }
        }

        console.log(outcome);
        result[title] = outcome;
    }

}

// 得出category名字及链接
async function getCategoryLinks(page) {
    let categoryLinkArray = [];
    const CATEGORY_PARENT_SELECTOR = '#default > div > div > div > aside > div.side_categories > ul > li > ul';
    const CATEGORY_LINK_SELECTOR = '#default > div > div > div > aside > div.side_categories > ul > li > ul > li:nth-child(INDEX) > a';

    let categoryCount = await page.evaluate((sel) => {
        return document.querySelector(sel).children.length;
    }, CATEGORY_PARENT_SELECTOR);

    for (let i = 1; i <= categoryCount; i++) {
        let categorySelector = CATEGORY_LINK_SELECTOR.replace('INDEX', i);
        categoryLinkArray.push(await page.evaluate(sel => {
            let element = document.querySelector(sel);
            return [element.innerText, element.href];
        }, categorySelector))
    }
    return categoryLinkArray;
}


// 算出每个category下有几页
async function getPageCount(page) {
    const PAGE_COUNT_SELECTOR = '#default > div > div > div > div > form > strong:nth-child(2)';
    return await page.evaluate(sel => {
        let text = document.querySelector(sel).innerText;
        return Math.ceil(Number(text) / 20);
    }, PAGE_COUNT_SELECTOR);
}

async function scrapePage(page) {
    let result = [];
    const BOOK_ITEM_CLASS = 'product_pod';
    const BOOK_TITLE_SELECTOR = '#default > div > div > div > div > section > div:nth-child(2) > ol > li:nth-child(INDEX) > article > h3 > a';
    const BOOK_PRICE_SELECTOR = '#default > div > div > div > div > section > div:nth-child(2) > ol > li:nth-child(INDEX) > article > div.product_price > p.price_color';

    const bookCount = await page.evaluate(sel => document.getElementsByClassName(sel).length, BOOK_ITEM_CLASS);
    for (let i = 1; i <= bookCount; i++) {
        let titleSelector = BOOK_TITLE_SELECTOR.replace('INDEX', i);
        let priceSelector = BOOK_PRICE_SELECTOR.replace('INDEX', i);
        let title = await page.evaluate(sel => document.querySelector(sel).title, titleSelector);
        let price = await page.evaluate(sel => document.querySelector(sel).innerText, priceSelector);
        result.push({
            title,
            price
        });
    }
    return result;
}


try {
    scrape();
} catch (error) {
    console.log(error);
}