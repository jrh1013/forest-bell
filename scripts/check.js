const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(BOT_TOKEN);

const reservationsFile = path.join(__dirname, '../data/reservations.json');

async function selectRegion(page, region) {
    console.log(`➡ 지역 선택 시도: ${region}`);
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
    let opened = false;

    // 1. 내부 JS 함수 호출 시도
    try {
        await page.evaluate(() => {
            if (typeof fn_openCalendar === 'function') {
                fn_openCalendar();
            }
        });
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 3000 });
        console.log('✔ 달력 열기 성공 (내부 함수)');
        return true;
    } catch {}

    // 2. 포커스 후 Enter 시도
    try {
        await page.focus('#calPicker');
        await page.keyboard.press('Enter');
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 3000 });
        console.log('✔ 달력 열기 성공 (포커스+Enter)');
        return true;
    } catch {}

    // 3. 좌표 클릭 시도
    try {
        const rect = await page.evaluate(() => {
            const el = document.querySelector('#calPicker');
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
        });
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForSelector('.ui-datepicker', { visible: true, timeout: 3000 });
        console.log('✔ 달력 열기 성공 (좌표 클릭)');
        return true;
    } catch {}

    return opened;
}

async function selectDate(page, date) {
    console.log(`➡ 날짜 선택 시도: ${date}`);
    await page.waitForSelector('#calPicker', { visible: true });

    const success = await openCalendar(page);
    if (!success) {
        throw new Error('달력 열기 실패 (모든 시도)');
    }

    // 날짜 클릭
    const [year, month, day] = date.split('-').map(v => parseInt(v, 10));
    const targetDay = `${day}`;
    console.log(`➡ 달력에서 날짜 찾기: ${targetDay}`);

    const dateBtn = await page.$x(`//a[text()="${targetDay}"]`);
    if (dateBtn.length > 0) {
        await dateBtn[0].click();
        console.log(`✔ 날짜 클릭 완료: ${targetDay}`);
    } else {
        throw new Error(`달력에서 ${targetDay}일 찾기 실패`);
    }

    // 닫기 버튼 클릭
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
        console.log(`➡ 조회 버튼 클릭`);
        await page.waitForSelector('.s_2_btn button', { visible: true });
        await page.click('.s_2_btn button');

        // 4. 결과 페이지 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log(`✔ 결과 페이지 로딩 완료`);

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
        console.error(`❗ Error checking ${region} - ${date}:`, err.message);
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
