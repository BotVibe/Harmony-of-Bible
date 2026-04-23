const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8000');

    // Wait for the canvas to load
    await page.waitForSelector('#canvas, #viz-canvas');
    await page.waitForTimeout(3000); // Give it some time to fetch and render

    // Simulate mouse move over the canvas in the middle
    await page.mouse.move(500, 300);
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'verification_hover.png' });

    await browser.close();
})();
