import { connect, ImapSimple, ImapSimpleOptions } from 'imap-simple';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

interface ImapConfig {
    host: string;
    port: number;
    user: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

const imapConfigs: ImapConfig[] = [
    {
        host: process.env.IMAP_HOST1!,
        port: parseInt(process.env.IMAP_PORT1!),
        user: process.env.IMAP_USER1!,
        clientId: process.env.IMAP_CLIENT_ID1!,
        clientSecret: process.env.IMAP_CLIENT_SECRET1!,
        redirectUri: process.env.IMAP_REDIRECT_URI1!,
    },
    // {
    //     host: process.env.IMAP_HOST2!,
    //     port: parseInt(process.env.IMAP_PORT2!),
    //     user: process.env.IMAP_USER2!,
    //     clientId: process.env.IMAP_CLIENT_ID2!,
    //     clientSecret: process.env.IMAP_CLIENT_SECRET2!,
    //     redirectUri: process.env.IMAP_REDIRECT_URI2!,
    // },
];

const fetchEmails = async (imap: ImapSimple, lastNDays = 30, config: ImapConfig) => {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lastNDays);

    try {
        const searchCriteria = [['SINCE', sinceDate.toUTCString()]];
        const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'], struct: true };

        const results = await imap.search(searchCriteria, fetchOptions);
        console.log(`Fetched ${results.length} emails from last ${lastNDays} days for ${config.user}.`);

        for (const res of results) {
            const header = res.parts[0].body;
            console.log(`From: ${header.from}, Subject: ${header.subject}`);
        }
    } catch (error: any) {
        if (error instanceof Error) {
            console.error(`Error fetching emails for ${config.user}:`, error.message);
        } else {
            console.error('Unknown error:', error);
        }
    }
};

const getAccessToken = async (config: ImapConfig) => {
    const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
    );

    // For testing, you can manually get an access token using the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://mail.google.com/'],
        prompt: 'consent'
    });

    console.log('Authorize this app by visiting this URL:', authUrl);

    // After authorization, you'll receive a code. Use it to get tokens:
    oauth2Client.getToken('4/0AQSTgQE5-RmXzAE5l4d5NoP_T8BbZ_1PldHG6G9kb9ug4a6YQ6K7RfBBQYt-0L5RbH_mZQ', (err, tokens) => {
        if (err) {
            console.error('Error retrieving access token', err);
            return;
        }
        if (tokens) {
            console.log('Access Token:', tokens.access_token);
            console.log('Refresh Token:', tokens.refresh_token);
        } else {
            console.error('No tokens available.');
        }
    });

    // For simplicity, assume you have a refresh token stored securely
    oauth2Client.setCredentials({
        refresh_token: '1//0gfy_9UY4tY3QCgYIARAAGBASNwF-L9IroNi2mSCB_vmGRpT_16FXa1PSQ0u1ho8WNqm4IHK78-TK96eGMcIahvccQ8eH_7PaTi0', // Replace with your actual refresh token
    });

    const { token } = await oauth2Client.getAccessToken();
    return token;
};

const connectWithRetry = async (config: ImapConfig) => {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const accessToken = await getAccessToken(config);

            const imapOptions: ImapSimpleOptions = {
                imap: {
                    user: config.user ?? '',
                    xoauth2: accessToken ?? '',
                    password: '',
                    host: config.host ?? '',
                    port: config.port ?? 0,
                    tls: true,
                    authTimeout: 10000,
                },
            };

            const imap = await connect(imapOptions);
            await imap.openBox('INBOX');
            return imap;
        } catch (error) {
            retries++;
            console.error(`Connection attempt ${retries} failed for ${config.user}:`, error);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
    throw new Error(`Failed to connect after ${maxRetries} retries for ${config.user}`);
};

const startImapConnection = async (config: ImapConfig) => {
    try {
        const imap = await connectWithRetry(config);

        console.log(`Connected to IMAP: ${config.user}`);

        await fetchEmails(imap, 30, config);

        imap.on('mail', async () => {
            console.log(`New email received in ${config.user}`);
            await fetchEmails(imap, 1, config);
        });

        imap.on('error', (err) => console.error(`IMAP Error: ${err.message}`));
    } catch (error) {
        console.error(`Failed to connect to IMAP (${config.user}):`, error);
    }
};

export const startEmailSync = () => {
    imapConfigs.forEach(startImapConnection);
};
