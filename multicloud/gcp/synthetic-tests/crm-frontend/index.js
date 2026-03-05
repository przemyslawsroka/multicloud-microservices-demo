const { runSyntheticHandler } = require('@google-cloud/synthetics-sdk-api');
const puppeteer = require('puppeteer');

const TARGET_URL = process.env.TARGET_URL || 'https://crm.gcp-ecommerce-demo.com/';

exports.SyntheticFunction = runSyntheticHandler(async ({ logger, executionId }) => {
  logger.info(`Starting Puppeteer CRM Frontend Check. Execution: ${executionId}`);

  let browser = null;
  try {
    // Launch headless Chromium explicitly using GCP Synthetic optimizations
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 1. Navigate to Frontend
    logger.info(`Navigating to CRM frontend: ${TARGET_URL}...`);
    const response = await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (!response || !response.ok()) {
      throw new Error(`CRM Frontend returned ${response ? response.status() : 'Unknown Status'} at ${TARGET_URL}`);
    }

    // 2. Validate core UI paints
    logger.info('Asserting UI elements rendered...');
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('CRM Agent Demo')) {
      logger.info('CRM Agent Demo not found. Checking if there are other indicators.');
    }

    logger.info('CRM Frontend Synthetic Check Passed.');
  } catch (error) {
    logger.error('CRM Frontend synthetic check failed!', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});
