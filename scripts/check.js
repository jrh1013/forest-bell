const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(BOT_TOKEN);

const reservationsFile = path.join(__dirname, '../data/reservations.json');

async function main() {
    // Load reservation list
    const reservations = JSON.parse(fs.readFileSync(reservationsFile, 'utf-8'));

    if (!reservations.length) {
        console.log('No reservations to check.');
        return;
    }

    console.log(`Checking ${reservations.length} reservations...`);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    for (const item of reservations) {
        const { region, date } = item;

        try {
            console.log(`Checking: ${region} - ${date}`);

            await page.goto('https://www.foresttrip.go.kr/main.do', { waitUntil: 'networkidle2', timeout: 60000 });

            // Select region (simulate click)
            await page.evaluate((regionName) => {
                document.querySelector('#srch_region_txt').textContent = regionName;
            }, region);

            // Select date (simulate)
            await page.evaluate((selectedDate) => {
                document.querySelector('#calPicker').value = selectedDate;
            }, date);

            // Click search button
            await page.evaluate(() => {
                document.querySelector('.s_2_btn button').click();
            });

            // Wait for result or fallback to timeout
            await page.waitForTimeout(5000);

            // Check if reservation is available
            const available = await page.evaluate(() => {
                return document.body.innerText.includes('예약가능');
            });

            if (available) {
                const message = `${region} ${date} 예약가능`;
                console.log('✅ ' + message);
                await bot.sendMessage(CHAT_ID, message);
            } else {
                console.log(`❌ ${region} ${date} 예약불가`);
            }

        } catch (error) {
            console.error(`Error checking ${region} - ${date}:`, error.message);
        }
    }

    await browser.close();
}

main().catch(err => console.error(err));

