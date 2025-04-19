import puppeteer from "puppeteer";
import { google } from "googleapis";

const spreadsheetId = process.env.SPREADSHEET_ID;
const client_email = process.env.SHEETS_CLIENT_EMAIL;
const private_key = process.env.SHEETS_PRIVATE_KEY.replace(/\\n/g, "\n");

const targets = [
  {
    name: "서머너즈워",
    playUrl: "https://play.google.com/store/apps/details?id=com.com2us.smon.normal.freefull.google.kr.android.common",
    fndUrl: "https://fnd.io/#/us/ios-universal-app/852912420-summoners-war-by-com2us-corp"
  },
  {
    name: "컴프야",
    playUrl: "https://play.google.com/store/apps/details?id=com.com2us.probaseball3d.normal.freefull.google.global.android.common",
    fndUrl: "https://fnd.io/#/kr/ios-universal-app/880551258-2023-by-com2us-corp"
  }
];

async function crawlPlayStore(page, url) {
  try {
    // 모바일 User-Agent로 전환
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 13_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Mobile/15E148 Safari/604.1"
    );

    const mobileUrl = url + "&hl=ko&gl=kr&pli=1";
    await page.goto(mobileUrl, { waitUntil: "networkidle2" });
    await page.waitForTimeout(3000);

    const html = await page.content();
    const match = html.match(/버전<\/div><div[^>]*>([\d.]+)<\/div>/);

    return match ? match[1] : "버전 정보 없음";
  } catch (err) {
    return "PlayStore 오류";
  }
}

async function crawlFnd(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector(".text-muted div div div");
    const version = await page.$eval(".text-muted div div div", el => el.textContent.trim());
    return version;
  } catch (err) {
    return "FND 오류";
  }
}

async function writeToSheet(rows) {
  const auth = new google.auth.JWT(
    client_email,
    null,
    private_key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: rows
    }
  });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  const now = new Date().toISOString().slice(0, 10);
  const rows = [["날짜", "앱 이름", "PlayStore", "FND"]];

  for (const app of targets) {
    const playVer = await crawlPlayStore(page, app.playUrl);
    const fndVer = await crawlFnd(page, app.fndUrl);
    rows.push([now, app.name, playVer, fndVer]);
  }

  await browser.close();
  await writeToSheet(rows);
})();

