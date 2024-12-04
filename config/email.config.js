import dotenv from 'dotenv';
dotenv.config();

export const EMAIL_CONFIG = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_APP_PASSWORD,
  contacts: {
    john: 'john@example.com',
    jane: '',
    user: 'sangeerth829@gmail.com'
  },
  imap: {
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 3000
  },
  smtp: {
    service: 'gmail'
  }
};