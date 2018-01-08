const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const User = require('./models/user');
const CRED = require('./cred');
const USERNAME_SELECTOR = `#login_field`
const PASSWORD_SELECTOR = `#password`
const BUTTON_SELECTOR = `#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block`
const userToSearch = 'john';
const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users&utf8=%E2%9C%93`;
const LIST_USERNAME_SELECTOR = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex > div > a'
const LIST_EMAIL_SELECTOR = '#user_search_results > div.user-list > div:nth-child(INDEX) > div.d-flex > div > ul > li:nth-child(2) > a'
const LENGTH_SELECTOR_CLASS = 'user-list-item';


async function run() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.setViewport({
        width: 1920,
        height: 1080
    });
    await page.goto('https://github.com/login');
    // await page.screenshot({
    //     path: 'screenshots/github-home.png'
    // });

    await page.click(USERNAME_SELECTOR);
    await page.keyboard.type(CRED.username);

    await page.click(PASSWORD_SELECTOR);
    await page.keyboard.type(CRED.password);

    await page.click(BUTTON_SELECTOR);

    await page.waitForNavigation();
    await page.goto(searchUrl);
    await page.waitFor(2 * 1000);

    let pageNumber = await getPageNumber(page);
    // 现实情况是最多只能到100页
    pageNumber = 100;

    for (let index = 1; index <= pageNumber; index++) {
        let pageUrl = searchUrl + "&p=" + index;
        await page.goto(pageUrl);
        let listLength = await page.evaluate((sel) => {
            return document.getElementsByClassName(sel).length;
        }, LENGTH_SELECTOR_CLASS);

        for (let i = 1; i <= listLength; i++) {
            let usernameSelector = LIST_USERNAME_SELECTOR.replace('INDEX', i);
            let emailSelector = LIST_EMAIL_SELECTOR.replace('INDEX', i);

            let username = await page.evaluate((sel) => document.querySelector(sel).innerText, usernameSelector);
            let email = await page.evaluate((sel) => {
                let element = document.querySelector(sel);
                return element ? element.innerText : null;
            }, emailSelector);
            if (!email) continue;
            console.log(username, '->', email);

            upsertUser({
                username: username,
                email: email,
                dateCrawled: new Date()
            });

        }

    }


}

async function getPageNumber(page) {
    const USER_NUM_SELECTOR = '#js-pjax-container > div > div.columns > div.column.three-fourths.codesearch-results > div > div.d-flex.flex-justify-between.border-bottom.pb-3 > h3';

    return await page.evaluate((sel) => {
        let text = document.querySelector(sel).innerText;
        let num = text.replace(',', '').replace('users', '').trim();
        return Math.ceil(Number(num) / 10);
    }, USER_NUM_SELECTOR);
}



function upsertUser(userObj) {
    const DB_URL = 'mongodb://localhost:27017';
    if (mongoose.connection.readyState == 0) {
        mongoose.connect(DB_URL);
    }

    let conditions = {
        email: userObj.email
    };
    let options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
    };

    User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
        if (err) throw err;
    })

}

run();