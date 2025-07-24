const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(BOT_TOKEN);

const reservationsFile = path.join(__dirname, '../data/reservations.json');

async function selectRegion(page, region) {
    // 지역 선택 UI 클릭
    await page.click('.s_2_locate .label a');
    await page.waitForSelector('#srch_region ul li a', { visible: true });

    // 지역 이름 클릭
    const regionLink = await page.$x(`//a[contains(text(),"${region}")]`);
    if (regionLink.length > 0) {
        await regionLink[0].click();
        await page.waitForTimeout(1000);
    } else {
        console.error(`지역 "${region}"을 찾을 수 없음`);
    }
}

async function selectDate(page, date) {
    await page.click('#calPicker');
    await page.waitForSelector('.ui-datepicker-calendar', { visible: true });

    const [year, month, day] = date.split('-').map(v => parseInt(v, 10));
    const targetDate = `${day}`;

    // 원하는 달로 이동 (필요 시 로직 추가)
    const dateBtn = await page.$x(`//a[text()="${targetDate}"]`);
    if (dateBtn.length > 0) {
        await dateBtn[0].click();
        await page.waitForTimeout(500);
    }

    // 확인 버튼 클릭 (달력 닫기)
    const confirmBtn = await page.$('.ui-datepicker-close');
    if (confirmBtn) {
        await confirmBtn.click();
    }
}

async function checkReservation(region, date) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    try {
        await page.goto('https://www.foresttrip.go.kr/main.do', { waitUntil: 'networkidle2' });

        // 1. 지역 선택
        await selectRegion(page, region);

        // 2. 날짜 선택
        await selectDate(page, date);

        // 3. 조회 클릭
        await page.click('.s_2_btn button');

        // 4. 결과 페이지 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // 5. 예약가능 여부 확인
        const bodyText = await page.evaluate(() => document.body.innerText);
        const available = bodyText.includes('예약가능');

        if (available) {
            const message = `${region} ${date} 예약가능`;
            console.log('✅ ' + message);
            await bot.sendMessage(CHAT_ID, message);
        } else {
            console.log(`❌ ${region} ${date} 예약불가`);
        }
    } catch (err) {
        console.error(`Error checking ${region} - ${date}:`, err.message);
    } finally {
        await browser.close();
    }
}

async function main() {
    const reservations = JSON.parse(fs.readFileSync(reservationsFile, 'utf-8'));
    if (!reservations.length) {
        console.log('예약 리스트 없음.');
        return;
    }

    for (const item of reservations) {
        await checkReservation(item.region, item.date);
    }
}

main();
