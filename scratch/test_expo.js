const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
  
  try {
    await page.goto('http://localhost:8083', { waitUntil: 'load', timeout: 30000 });
    // Wait an extra second for React to render
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log(`[GOTO ERROR] ${e.message}`);
  }
  
  await browser.close();
})();
