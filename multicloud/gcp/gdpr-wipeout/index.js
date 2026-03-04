const { Sequelize } = require('sequelize');

async function main() {
  if (!process.env.DB_HOST) {
    console.log("No DB_HOST provided. Exiting.");
    process.exit(1);
  }

  const sequelize = new Sequelize(
    process.env.DB_NAME || 'crm',
    process.env.DB_USER || 'crm_user',
    process.env.DB_PASS || 'password123',
    {
      host: process.env.DB_HOST,
      dialect: 'mysql',
      logging: console.log
    }
  );

  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    // Delete orders older than 3 hours
    await sequelize.query('DELETE FROM Orders WHERE createdAt < :threeHoursAgo', {
      replacements: { threeHoursAgo }
    });
    console.log('Deleted old orders.');

    // Delete customers older than 3 hours
    // This assumes all orders for the customer are either already deleted or we cascade
    await sequelize.query('DELETE FROM Customers WHERE createdAt < :threeHoursAgo', {
      replacements: { threeHoursAgo }
    });
    console.log('Deleted old customers.');

    console.log('GDPR wipeout completed successfully.');
  } catch (error) {
    console.error('Unable to connect to the database or delete data:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
