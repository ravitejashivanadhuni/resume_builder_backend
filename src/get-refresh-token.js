const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const credentials = {
    client_id: '1052488926250-cdr1o3oecm8fdmdnv02jfmj61c48rq43.apps.googleusercontent.com',
    client_secret: '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',
    redirect_uris: ['http://localhost:5200/oauth2callback'],
};

const redirectUri = 'http://localhost:5200/oauth2callback';
const oAuth2Client = new google.auth.OAuth2(
    credentials.client_id,
    credentials.client_secret,
    redirectUri
);


const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

console.log('Authorize this app by visiting this URL:', authUrl);




const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth2callback')) {
        const query = url.parse(req.url, true).query;

        if (query.code) {
            try {
                const { tokens } = await oAuth2Client.getToken(query.code);
                oAuth2Client.setCredentials(tokens);
                console.log('Tokens acquired:', tokens);
                console.log('Refresh token:', tokens.refresh_token);

                res.end('Authorization successful! You can close this tab.');
                server.close();
            } catch (err) {
                console.error('Error retrieving tokens:', err);
                res.end('Error retrieving tokens');
            }
        }
    }
});


server.listen(5200, () => {
    console.log('Listening for OAuth2 callback on http://localhost:5200/oauth2callback');
});