import express from 'express';
import { startEmailSync } from './imapService.js';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const app = express();
const PORT = process.env.PORT || 5000;


app.get('/', (req, res) => {
  res.send('MailFusion IMAP Sync Service is Running!');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startEmailSync();
});
