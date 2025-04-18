const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

app.post("/parse", async (req, res) => {
  const { url, xpaths } = req.body;

  if (!url || !Array.isArray(xpaths)) {
    return res.status(400).json({ error: "Missing or invalid 'url' or 'xpaths'" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
    });

    const page = await browser.newPage();

    // Ускоряем загрузку
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resource = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resource)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const results = {};
    for (const xpath of xpaths) {
      const data = await page.evaluate((xp) => {
        const snapshot = document.evaluate(
          xp,
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        if (snapshot.snapshotLength === 0) return [];
        const arr = [];
        for (let i = 0; i < snapshot.snapshotLength; i++) {
          arr.push(snapshot.snapshotItem(i).textContent.trim());
        }
        return arr;
      }, xpath);

      results[xpath] = data.length > 0 ? data : ["Нет данных"];
    }

    console.log(`[✓] ${url} — парсинг завершён. XPath: ${xpaths.length}`);
    res.json({ success: true, data: results });
  } catch (e) {
    console.error(`[✗] Ошибка при парсинге ${url}:`, e.message);
    res.status(500).json({ success: false, error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Сервер парсера запущен на порту ${PORT}`));
