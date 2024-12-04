// Import sound utilities
const sounds = {
    success: new Howl({
        src: ['/sounds/success.mp3'],
        volume: 0.5
    }),
    error: new Howl({
        src: ['/sounds/error.mp3'],
        volume: 0.5
    }),
    notification: new Howl({
        src: ['/sounds/notification.mp3'],
        volume: 0.3
    })
};

class VoiceEmailSystem {
    constructor() {
        if (!this.checkBrowserSupport()) {
            this.updateStatus('Your browser does not support speech recognition');
            return;
        }
        this.setupSpeechSynthesis();
        this.setupRecognition();
        this.setupUI();
        this.currentState = 'idle';
        this.emailData = {};
        this.hasStarted = false;
        this.speechRate = 1;
        this.currentFolder = 'INBOX';
    }

    checkBrowserSupport() {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            console.error('Speech recognition not supported');
            return false;
        }
        return true;
    }

    async setupSpeechSynthesis() {
        this.synthesis = window.speechSynthesis;
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        // Wait for voices to be loaded
        if (speechSynthesis.getVoices().length === 0) {
            await new Promise(resolve => {
                speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
            });
        }
        
        // Select a voice
        this.voice = this.synthesis.getVoices().find(voice => 
            voice.lang.startsWith('en-')
        ) || this.synthesis.getVoices()[0];
    }

    async setupRecognition() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Release the microphone

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.updateStatus('Listening...');
                console.log('Speech recognition started');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                this.handleCommand(transcript);
            };

            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                if (this.currentState !== 'idle') {
                    this.recognition.start();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateStatus(`Error: ${event.error}`);
                sounds.error.play();

                if (event.error === 'not-allowed') {
                    this.updateStatus('Please allow microphone access and reload the page');
                }
            };

            // Add click event listener for starting the system
            document.addEventListener('click', () => {
                if (!this.hasStarted) {
                    this.start();
                }
            }, { once: true });

        } catch (error) {
            console.error('Microphone access error:', error);
            this.updateStatus('Please allow microphone access and reload the page');
            sounds.error.play();
        }
    }

    setupUI() {
        this.statusDiv = document.getElementById('status');
        this.transcriptDiv = document.getElementById('transcript');
        this.updateStatus('Click anywhere to start');
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.toggleSpeech();
            }
        });
    }

    updateStatus(text) {
        if (this.statusDiv) {
            this.statusDiv.textContent = text;
        }
    }

    speak(text) {
        return new Promise((resolve, reject) => {
            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.voice;
            utterance.rate = this.speechRate;
            utterance.onend = resolve;
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                sounds.error.play();
                reject(event);
            };

            try {
                this.synthesis.speak(utterance);
            } catch (error) {
                console.error('Speech synthesis failed:', error);
                sounds.error.play();
                reject(error);
            }
        });
    }

    toggleSpeech() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }

    async announceCommands() {
        try {
            const commands = 
                'Available commands: ' +
                'Compose  ' +
                'Read  ' +
                'Search  ' +
                'Speed up or slow down  ' +
                'Exit  ' +
                ' Space to pause or resume speech.';
            
            await this.speak(commands);
        } catch (error) {
            console.error('Error announcing commands:', error);
            this.updateStatus('Error announcing commands');
        }
    }

    async start() {
        try {
            this.hasStarted = true;
            this.updateStatus('Starting voice system...');
            this.currentState = 'listening';
            await this.announceCommands();
            await this.recognition.start();
        } catch (error) {
            console.error('Error starting voice system:', error);
            this.updateStatus('Error starting system. Please reload the page.');
            this.hasStarted = false;
            sounds.error.play();
        }
    }

    async handleCommand(transcript) {
        this.transcriptDiv.textContent = `You said: ${transcript}`;
        this.updateStatus('Processing command...');

        try {
            switch (this.currentState) {
                case 'listening':
                    await this.handleMainCommand(transcript);
                    break;
                case 'compose_to':
                    this.emailData.to = transcript;
                    this.currentState = 'compose_subject';
                    await this.speak('What is the subject?');
                    break;
                case 'compose_subject':
                    this.emailData.subject = transcript;
                    this.currentState = 'compose_message';
                    await this.speak('What is your message?');
                    break;
                case 'compose_message':
                    this.emailData.text = transcript;
                    await this.sendEmail();
                    break;
                case 'search':
                    await this.searchEmails(transcript);
                    break;
            }
        } catch (error) {
            console.error('Error handling command:', error);
            await this.speak('An error occurred. Please try again.');
            sounds.error.play();
            this.currentState = 'listening';
        }

        this.updateStatus('Listening...');
    }

    async handleMainCommand(command) {
        if (command.includes('speed up')) {
            this.speechRate = Math.min(2, this.speechRate + 0.25);
            await this.speak(`Speech rate is now ${this.speechRate}`);
        } else if (command.includes('slow down')) {
            this.speechRate = Math.max(0.5, this.speechRate - 0.25);
            await this.speak(`Speech rate is now ${this.speechRate}`);
        } else {
            switch (command) {
                case 'compose':
                    this.currentState = 'compose_to';
                    await this.speak('What is the email address?');
                    break;
                case 'read':
                    await this.readEmails();
                    break;
                case 'search':
                    this.currentState = 'search';
                    await this.speak('What would you like to search for?');
                    break;
                case 'exit':
                    await this.speak('Goodbye');
                    sounds.notification.play();
                    this.currentState = 'idle';
                    this.hasStarted = false;
                    this.updateStatus('Click anywhere to start');
                    break;
                case 'summarize all':
                    await this.summarizeAllEmails();
                    break;
                case 'summarize latest':
                    await this.summarizeLatestEmail();
                    break;   
                default:
                    await this.speak('Unknown command. Available commands are: compose, read, search, speed up, slow down, or exit.');
            }
        }
    }

    async sendEmail() {
        try {
            this.updateStatus('Sending email...');
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.emailData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                sounds.success.play();
                await this.speak('Email sent successfully. What would you like to do next?');
                this.currentState = 'listening';
                this.emailData = {};
                await this.announceCommands();
            } else {
                throw new Error(result.message || 'Failed to send email');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            await this.speak('Error sending email. Please try again.');
            sounds.error.play();
            this.currentState = 'listening';
            this.emailData = {};
        }
    }
    async readEmails() {
        try {
            if (this.recognition) {
                this.recognition.stop();
                this.recognition.onend = null;
            }
        
            this.updateStatus('Fetching emails...');
            const response = await fetch(`/api/read-emails?folder=${this.currentFolder}`);
            
            const result = await response.json();
            
            if (result.success && result.emails.length > 0) {
                sounds.notification.play();
                const latestEmails = result.emails.slice(0, 5);

                await this.speak('Here are your 5 latest emails:');

                for (let i = 0; i < latestEmails.length; i++) {
                    const email = latestEmails[i];
                    
                    // Clean and filter the email content
                    const cleanContent = this.cleanEmailContent(email.content);
                    
                    await this.speak(`Email ${i + 1} from ${email.from}. Subject: ${email.subject}`);
                    await this.speak(`Message: ${cleanContent}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                await this.speak('Email reading complete. What would you like to do next?');
                this.recognition.start();
            }
        } catch (error) {
            console.error('Error reading emails:', error);
            await this.speak('Unable to read emails. Please try again.');
            sounds.error.play();
        }
    }
    cleanEmailContent(content) {
        // Remove content type headers, MIME boundaries, etc.
        let cleanContent = content
            .replace(/Content-Type:.*?\n/g, '') // Remove Content-Type headers
            .replace(/Content-Transfer-Encoding:.*?\n/g, '') // Remove Content-Transfer-Encoding headers
            .replace(/MIME-Version:.*?\n/g, '') // Remove MIME-Version headers
            .replace(/charset=.*?\n/g, '') // Remove charset declarations
            .replace(/boundary=.*?\n/g, '') // Remove boundary declarations
            .replace(/--_.*?_/g, '') // Remove MIME boundaries
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\[.*?\]/g, '') // Remove file attachments and image references
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim(); // Trim leading and trailing whitespace

        return cleanContent;
    }
    
    async searchEmails(query) {
        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const result = await response.json();

            if (result.success && result.emails.length > 0) {
                sounds.notification.play();
                await this.speak(`Found ${result.emails.length} matching emails. Reading results.`);
                for (const email of result.emails) {
                    await this.speak(`From: ${email.from}`);
                    await this.speak(`Subject: ${email.subject}`);
                    await this.speak('Say next for next result or stop to stop reading');
                    
                    const command = await new Promise(resolve => {
                        this.recognition.onresult = (event) => {
                            resolve(event.results[0][0].transcript.toLowerCase());
                        };
                        this.recognition.start();
                    });
                    
                    if (command.includes('stop')) break;
                }
                
                await this.announceCommands();
            } else {
                await this.speak('No matching emails found. What would you like to do next?');
                await this.announceCommands();
            }
        } catch (error) {
            console.error('Error searching emails:', error);
            await this.speak('Error searching emails');
            sounds.error.play();
        }
        
        this.currentState = 'listening';
    }
    async summarizeEmail(content) {
        // Truncate very long content
        const maxLength = 10000; // Adjust as needed
        const truncatedContent = content.length > maxLength 
            ? content.substring(0, maxLength) 
            : content;
    
        try {
            const response = await fetch('/api/summarize-email', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Content-Length': truncatedContent.length.toString()
                },
                body: JSON.stringify({ content: truncatedContent })
            });
            
            const result = await response.json();
            if (result.success) {
                sounds.success.play();
                return result.summary;
            }
            throw new Error(result.message || 'Failed to summarize email');
        } catch (error) {
            console.error('Error summarizing email:', error);
            sounds.error.play();
            throw error;
        }
    }
    
}

// Initialize the system when the page loads
window.addEventListener('load', () => {
    new VoiceEmailSystem();
});