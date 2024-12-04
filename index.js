import express from 'express';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { EMAIL_CONFIG, fetchEmails, getFolders, searchEmails } from './services/email.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_CONFIG.user,
    pass: EMAIL_CONFIG.password
  }
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

// API Routes
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text } = req.body;
  
  if (!to || !subject || !text) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: to, subject, or text' 
    });
  }

  try {
    const mailOptions = {
      from: EMAIL_CONFIG.user,
      to,
      subject,
      text
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', to);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending email: ' + error.message 
    });
  }
});

app.get('/api/read-emails', async (req, res) => {
  const { folder = 'INBOX' } = req.query;
  try {
    const emails = await fetchEmails(folder);
    res.json({ success: true, emails });
  } catch (error) {
    console.error('Error reading emails:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reading emails: ' + error.message 
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
      message: 'Error fetching folders: ' + error.message 
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
      message: 'Error searching emails: ' + error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});