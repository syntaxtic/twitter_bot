import express from 'express';
import { CronJob } from 'cron';
import { TwitterApi } from 'twitter-api-v2';

// ---------------------------------
// ----------- SETUP ---------------
// ---------------------------------
const app = express();
const port = 80;
const basePath = `http://127.0.0.1:${port}`;
const twitter = new TwitterApi({ clientId, clientSecret });
let store = {};
const username = '';
const clientId = '';
const clientSecret = '';
const tweetContent = '';

// ---------------------------------
// --------- FUNCTIONS -------------
// ---------------------------------
const tweet = async () => {
  const { refreshToken } = store;

  const {
    client,
    accessToken,
    refreshToken: newRefreshToken,
  } = await twitter.refreshOAuth2Token(refreshToken);
  store = { ...store, accessToken, refreshToken: newRefreshToken };

  const { data, errors } = await client.v2.tweet(tweetContent);
  if (!errors) {
    console.log(
      new Date().toLocaleString('en', {
        hour12: false,
        timeZone: 'Europe/Istanbul',
      }),
      'Tweet sent:',
      data.id
    );
  } else {
    console.log("Couldn't send the tweet.", { errors });
  }
};

const cycle = () => {
  console.log('Starting the cycle.');
  new CronJob(
    // '00 12 * * *', // Daily 12:00
    '* * * * *', // Every Minute for testing
    tweet, // onTick
    null, // onComplete
    true, // auto-start
    'Europe/Istanbul' // timeZone
  );
};

// ---------------------------------
// ----------- ROUTES --------------
// ---------------------------------
app.listen(port, () => {
  console.log(`[server]: Server is running at ${basePath}`);
});

app.get('/', (_, res) => {
  res.set('Content-Type', 'text/html');
  res.send(Buffer.from("<a href='/login'>login<a/>"));
});

app.get('/login', async (_, res) => {
  const { url, codeVerifier, state } = twitter.generateOAuth2AuthLink(
    `${basePath}/callback`,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );
  store = { ...store, codeVerifier, state };
  res.redirect(url);
  console.log('/login redirected to twitter.');
});

app.get('/callback', async (req, res) => {
  const { state: incomingState, code: incomingCode } = req.query;
  if (!incomingState || !incomingCode) return;
  const { codeVerifier, state } = store;

  if (incomingState !== state) {
    res.status(400).send("State value doesn't match!");
    return;
  }

  const { client, accessToken, refreshToken } = await twitter.loginWithOAuth2({
    code: incomingCode.toString(),
    codeVerifier,
    redirectUri: `${basePath}/callback`,
  });

  store = { ...store, accessToken, refreshToken };
  const { data } = await client.v2.me();
  if (data.username !== username) {
    res.send('Get off.');
    return;
  }
  res.send(data);
  console.log(`${data.username} logged in.`);
  cycle();
});
