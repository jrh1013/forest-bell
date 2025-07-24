const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(BOT_TOKEN);

const reservationsFile = path.join(__dirname, '../data/reservations.json');

async function selectRegion(page, region) {
    console.log(`➡ 지역 선택: ${region}`);
    await page.waitForSelector('.s_2_locate .label a', { visible: true });
    await page.click('.s_2_locate .label a');

    await page.waitForSelector('#srch_region ul li a', { visible: true });
    const regionLink = await page.$x(`//a[contains(text(),"${region}")]`);
    if (regionLink.length > 0) {
        await regionLink[0].click();
        console.log(`✔ 지역 선택 완료: ${region}`);
        await page.waitForTimeout(1000);
    } else {
        throw new Error(`지역 "${region}" 클릭 실패`);
    }
}

async function openCalendar(page) {
    console.log('➡ 달력 열기 시도');

    // #calPicker 준비될 때까지 대기
    await page.waitForSelector('#calPicker', { visible: true });

    // 클릭 후 팝업 대기
    await page.click('#calPicker');
    console.log('✔ 달력 클릭 완료, 팝업 대기 중');

    try {
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 20000 });
        console.log('✔ 달력 팝업 열림');
    } catch (err) {
        console.error('❗ 달력 열기 실패: 스크린샷 저장');
        await page.screenshot({ path: `error-calendar-${Date.now()}.png`, fullPage: true });
        throw err;
    }
}

async function selectDate(page, date) {
    console.log(`➡ 날짜 선택: ${date}`);
    await openCalendar(page);

    const day = parseInt(date.split('-')[2], 10);
    const dateBtn = await page.$x(`//a[text()="${day}"]`);
    if (dateBtn.length > 0) {
        await dateBtn[0].click();
        console.log(`✔ 날짜 클릭 완료: ${day}`);
    } else {
        throw new Error(`달력에서 ${day}일 클릭 실패`);
    }

    const confirmBtn = await page.$('.ui-datepicker-close');
    if (confirmBtn) {
        await confirmBtn.click();
        console.log('✔ 날짜 확인 버튼 클릭 완료');
    }
}

async function checkReservation(region, date) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    try {
        console.log(`\n====================`);
        console.log(`🔍 예약 체크 시작: ${region} - ${date}`);

        await page.goto('https://www.foresttrip.go.kr/main.do', { waitUntil: 'networkidle2' });

        // 1. 지역 선택
        await selectRegion(page, region);

        // 2. 날짜 선택
        await selectDate(page, date);

        // 3. 조회 버튼 클릭
        console.log('➡ 조회 버튼 클릭');
        await page.waitForSelector('.s_2_btn button', { visible: true });
        await page.click('.s_2_btn button');

        // 4. 결과 페이지 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✔ 결과 페이지 로딩 완료');

        // 5. 예약 가능 여부 확인
        const text = await page.evaluate(() => document.body.innerText);
        if (text.includes('예약가능')) {
            const msg = `${region} ${date} 예약가능`;
            console.log('✅ ' + msg);
            await bot.sendMessage(CHAT_ID, msg);
        } else {
            console.log(`❌ ${region} ${date} 예약불가`);
        }
    } catch (err) {
        console.error(`❗ Error: ${region} - ${date}: ${err.message}`);
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
