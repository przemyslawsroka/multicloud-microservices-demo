const { runSyntheticHandler } = require('@google-cloud/synthetics');
const puppeteer = require('puppeteer');

const TARGET_URL = process.env.TARGET_URL || 'http://YOUR_FRONTEND_EXTERNAL_IP';

exports.SyntheticFunction = runSyntheticHandler(async ({ logger, executionId }) => {
  logger.info(`Starting Puppeteer Frontend Journey. Execution: ${executionId}`);

  let browser = null;
  try {
    // Launch headless Chromium explicitly using GCP Synthetic optimizations
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 1. Navigate to Frontend load balancer
    logger.info(`Navigating to ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    
    if (!response || !response.ok()) {
      throw new Error(`Frontend returned ${response ? response.status() : 'Unknown Status'} at ${TARGET_URL}`);
    }

    // 2. Validate core UI paints
    logger.info('Asserting UI elements rendered...');
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('Free shipping with $75 purchase!')) {
      throw new Error('Banner text not found. Frontend may have failed rendering cart components.');
    }

    // 3. Navigate into a Product Page (Smoke check the Cart/Product Catalog RPC route)
    logger.info('Attempting click on a product catalog item...');
    
    // Explicitly click first product link (adjust selectors to match Boutique layout)
    await page.waitForSelector('a[href^="/product/"]', { timeout: 5000 });
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('a[href^="/product/"]')
    ]);

    const productTitle = await page.evaluate(() => document.body.innerText);
    if (!productTitle) {
      throw new Error('Product catalog page failed to map dynamically.');
    }

    logger.info('Frontend User Journey Passed.');
  } catch (error) {
    logger.error('Frontend synthetic journey pipeline failed!', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});
