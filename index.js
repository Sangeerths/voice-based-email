import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { EMAIL_CONFIG } from './config/email.config.js';
import { sendEmail } from './services/smtp.service.js';
import { fetchEmails, getFolders } from './services/imap.service.js';
import { searchEmails } from './services/search.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  
  if (!to || !subject || !text) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: to, subject, or text' 
    });
  }

  try {
    const result = await sendEmail({ to, subject, text });
    console.log('Email sent successfully to:', to);
    res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/contacts', (req, res) => {
  res.json({ success: true, contacts: EMAIL_CONFIG.contacts });
});

app.get('/api/read-emails', async (req, res) => {
  try {
    const emails = await fetchEmails();
    res.json({ success: true, emails });
  } catch (error) {
    console.error('Error reading emails:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/folders', async (req, res) => {
  try {
    const folders = await getFolders();
    res.json({ success: true, folders });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ 
      success: false, 
      message: 'Search query is required' 
    });
  }

  try {
    const results = await searchEmails(query);
    res.json({ success: true, emails: results });
  } catch (error) {
    console.error('Error searching emails:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});