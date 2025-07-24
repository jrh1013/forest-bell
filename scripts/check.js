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
    console.log('➡ 달력 열기');
    await page.waitForSelector('#calPicker', { visible: true });
    await page.click('#calPicker');

    await page.waitForSelector('#forestCalPicker', { visible: true, timeout: 20000 });
    console.log('✔ 달력 팝업 열림');
}

async function selectDate(page, date) {
    console.log(`➡ 날짜 선택: ${date}`);
    await openCalendar(page);

    const [year, month, day] = date.split('-').map(Number);
    const targetDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

    // 월 이동 로직
    for (let i = 0; i < 12; i++) {
        const months = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.calendar_wrap .layer_calender b')).map(el => el.innerText.trim());
        });

        if (months.some(m => m.includes(`${year}. ${String(month).padStart(2, '0')}`))) {
            console.log(`✔ ${month}월 화면 표시됨`);
            break;
        }

        console.log('➡ 다음달 버튼 클릭');
        await page.click('.next');
        await page.waitForTimeout(500);
    }

    // 날짜 클릭
    const dateBtn = await page.$(`a[data-date^="${targetDate}"]`);
    if (dateBtn) {
        await dateBtn.click();
        console.log(`✔ 날짜 클릭 완료: ${day}`);
    } else {
        throw new Error(`달력에서 ${targetDate} 클릭 실패`);
    }

    // 확인 버튼 클릭
    const confirmBtn = await page.$('.cal_button .defBtn.board');
    if (confirmBtn) {
        await confirmBtn.click();
        console.log('✔ 확인 버튼 클릭 완료');
    }

    // 팝업 닫힘 대기
    await page.waitForFunction(() => !document.querySelector('#forestCalPicker'), { timeout: 8000 });
    console.log('✔ 팝업 닫힘 확인');
}

async function checkReservation(region, date) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    page.setViewport({ width: 1200, height: 800 });
    page.setDefaultNavigationTimeout(60000);

    try {
        console.log(`\n====================`);
        console.log(`🔍 예약 체크 시작: ${region} - ${date}`);

        await page.goto('https://www.foresttrip.go.kr/main.do', { waitUntil: 'networkidle2' });

        await selectRegion(page, region);
        await selectDate(page, date);

        // 조회 버튼 활성화 대기 후 클릭
        console.log('➡ 조회 버튼 활성화 대기');
        await page.waitForSelector('.s_2_btn button:not([disabled])', { visible: true });
        console.log('✔ 조회 버튼 클릭');
        await page.click('.s_2_btn button');

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✔ 결과 페이지 로딩 완료');

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
        await page.screenshot({ path: `error-${region}-${Date.now()}.png`, fullPage: true });
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
