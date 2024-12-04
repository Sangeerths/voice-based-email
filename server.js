const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Increase payload size limits
app.use(bodyParser.json({
    limit: '100mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
/**
 * Increases the payload size limit for JSON requests to 100MB.
 * This is necessary to handle large request payloads, such as file uploads.
 */

app.use(bodyParser.urlencoded({ 
    limit: '100mb', 
    extended: true 
}));

app.use(express.json({
    limit: '100mb'
}));

app.use(express.urlencoded({
    limit: '100mb',
    extended: true
}));

app.get('/api/read-emails', async (req, res) => {
    try {
        const folder = req.query.folder || 'INBOX';
        
        // Implement proper email retrieval logic
        const emails = await fetchEmailsFromDatabase(folder);
        
        if (!emails || emails.length === 0) {
            return res.json({
                success: true,
                emails: [],
                message: 'No emails found'
            });
        }

        res.json({
            success: true,
            emails: emails.map(email => ({
                id: email.id,
                from: email.from,
                subject: email.subject,
                content: email.content,
                date: email.date
            }))
        });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});
