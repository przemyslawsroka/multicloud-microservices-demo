const { runSyntheticHandler } = require('@google-cloud/synthetics');

const CRM_URL = process.env.CRM_URL || 'http://crm.internal.boutique.local:8080/health';
const INVENTORY_URL = process.env.INVENTORY_URL || 'http://inventory.internal.boutique.local:8080/health';

exports.SyntheticFunction = runSyntheticHandler(async ({ logger, executionId }) => {
  logger.info(`Starting internal synthetic checks. Execution: ${executionId}`);

  let errors = [];

  // 1. Check CRM Component
  if (CRM_URL && CRM_URL.startsWith('http')) {
    try {
      const crmResponse = await fetch(CRM_URL, { signal: AbortSignal.timeout(5000) });
      if (!crmResponse.ok) {
        errors.push(`CRM Service returned ${crmResponse.status}`);
      } else {
        logger.info('CRM Service OK');
      }
    } catch (err) {
      errors.push(`CRM Service unreachable: ${err.message}`);
    }
  }

  // 2. Check Inventory Component
  if (INVENTORY_URL && INVENTORY_URL.startsWith('http')) {
    try {
      const invResponse = await fetch(INVENTORY_URL, { signal: AbortSignal.timeout(5000) });
      if (!invResponse.ok) {
        errors.push(`Inventory Service returned ${invResponse.status}`);
      } else {
        logger.info('Inventory Service OK');
      }
    } catch (err) {
      errors.push(`Inventory Service unreachable: ${err.message}`);
    }
  }

  // Evaluate the Synthetic Monitor Run
  if (errors.length > 0) {
    logger.error('Synthetic Check Failed!');
    errors.forEach(err => logger.error(err));
    throw new Error('Internal API Validation Checks Failed');
  }

  logger.info('All Internal Components are healthy.');
});
