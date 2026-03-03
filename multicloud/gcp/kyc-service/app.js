const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.post('/check', (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  console.log(`Checking KYC for ${email} / ${name || 'Unknown'}`);
  
  // Basic KYC checks
  const isBlocked = email.includes('blocked') || email.includes('fraud');
  
  if (isBlocked) {
    return res.status(403).json({ status: 'REJECTED', message: 'Customer failed KYC check.' });
  } else {
    return res.status(200).json({ status: 'APPROVED', message: 'Customer is approved.' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

if (require.main === module) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`KYC service listening on port ${port}`);
  });
}

module.exports = app;
