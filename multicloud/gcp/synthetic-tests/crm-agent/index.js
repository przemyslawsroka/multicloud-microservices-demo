const { runSyntheticHandler } = require('@google-cloud/synthetics-sdk-api');

const AGENT_URL = process.env.AGENT_URL || 'https://crm.gcp-ecommerce-demo.com/api/agent/chat';

exports.SyntheticFunction = runSyntheticHandler(async ({ logger, executionId }) => {
  logger.info(`Starting CRM Agent Synthetic Check. Execution: ${executionId}`);

  try {
    const payload = { message: "Tell me about John Doe" };

    logger.info(`Calling CRM Agent at ${AGENT_URL} with payload: ${JSON.stringify(payload)}`);
    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`CRM Agent returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info(`CRM Agent response: ${JSON.stringify(data)}`);

    // Test passes if we got a 200 OK and valid JSON response
    logger.info('CRM Agent Synthetic Check Passed.');
  } catch (error) {
    logger.error('CRM Agent synthetic check failed!', error);
    throw error;
  }
});
