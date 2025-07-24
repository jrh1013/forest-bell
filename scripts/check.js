const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(BOT_TOKEN);

const reservationsFile = path.join(__dirname, '../data/reservations.json');

async function selectRegion(page, region) {
    await page.waitForSelector('.s_2_locate .label a', { visible: true });
    await page.click('.s_2_locate .label a');
    await page.waitForSelector('#srch_region ul li a', { visible: true });
    const regionLink = await page.$x(`//a[contains(text(),"${region}")]`);
    if (regionLink.length > 0) {
        await regionLink[0].click();
        await page.waitForTimeout(1000);
    } else {
        throw new Error(`지역 "${region}" 클릭 실패`);
    }
}

async function openCalendar(page) {
    try {
        await page.evaluate(() => {
            if (typeof fn_openCalendar === 'function') fn_openCalendar();
        });
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 2000 });
        return true;
    } catch {}
    try {
        await page.focus('#calPicker');
        await page.keyboard.press('Enter');
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 2000 });
        return true;
    } catch {}
    try {
        const rect = await page.evaluate(() => {
            const el = document.querySelector('#calPicker');
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
        });
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 2000 });
        return true;
    } catch {}
    return false;
}

async function selectDate(page, date) {
    await page.waitForSelector('#calPicker', { visible: true });
    const opened = await openCalendar(page);
    if (!opened) throw new Error('달력 열기 실패');
    const [year, month, day] = date.split('-').map(Number);
    const dateBtn = await page.$x(`//a[text()="${day}"]`);
    if (dateBtn.length > 0) {
        await dateBtn[0].click();
    } else {
        throw new Error(`달력에서 ${day}일 클릭 실패`);
    }
    const confirmBtn = await page.$('.ui-datepicker-close');
    if (confirmBtn) await confirmBtn.click();
}

async function checkReservation(region, date) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    try {
        await page.goto('https://www.foresttrip.go.kr/main.do', { waitUntil: 'networkidle2' });
        await selectRegion(page, region);
        await selectDate(page, date);
        await page.click('.s_2_btn button');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        const text = await page.evaluate(() => document.body.innerText);
        if (text.includes('예약가능')) {
            const msg = `${region} ${date} 예약가능`;
            await bot.sendMessage(CHAT_ID, msg);
        }
    } catch (err) {
        console.error(`❗ ${region} ${date} 실패: ${err.message}`);
    } finally {
        await browser.close();
    }
}

async function main() {
    const reservations = JSON.parse(fs.readFileSync(reservationsFile, 'utf-8'));
    if (!reservations.length) return;

    const batchSize = 3; // 동시 처리 개수
    for (let i = 0; i < reservations.length; i += batchSize) {
        const batch = reservations.slice(i, i + batchSize);
        await Promise.all(batch.map(r => checkReservation(r.region, r.date)));
    }
}

main();
