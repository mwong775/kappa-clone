const Boom = require('boom');
const color = require('color');
const ext = require('commander');
const jsonwebtoken = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');


// postgres
const { Client, Pool } = require('pg')
const pgOptions = {
  user: 'preethamrn',
  host: 'localhost',
  database: 'kappoll',
  password: '',
  port: 5432,
}
const client = new Client(pgOptions)
const pool = new Pool(pgOptions)
client.connect()


// CREATE TABLE votes(
//   optionID VARCHAR(50) NOT NULL,
//   userID VARCHAR(50) NOT NULL,
//   channelID VARCHAR(50) NOT NULL
// );

// CREATE TABLE options(
//   optionID VARCHAR(50) PRIMARY KEY,
//   channelID VARCHAR(50) NOT NULL,
//   option VARCHAR(500) NOT NULL
// );

// CREATE TABLE questions(
//   channelID VARCHAR(50) PRIMARY KEY,
//   question VARCHAR(500) NOT NULL
// );


// The developer rig uses self-signed certificates.  Node doesn't accept them
// by default.  Do not use this in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use verbose logging during development.  Set this to false for production.
const verboseLogging = true;
const verboseLog = verboseLogging ? console.log.bind(console) : () => { };

// Service state variables
const initialColor = color('#6441A4');      // set initial color; bleedPurple
const bearerPrefix = 'Bearer ';             // HTTP authorization headers have this prefix
const colorWheelRotation = 30;
const channelColors = {};

const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  cyclingColor: 'Cycling color for c:%s on behalf of u:%s',
  sendColor: 'Sending color %s to c:%s',
  invalidAuthHeader: 'Invalid authorization header',
  invalidJwt: 'Invalid JWT'
};

ext.
  version(require('../package.json').version).
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  parse(process.argv);

const secret = Buffer.from(getOption('secret', 'ENV_SECRET'), 'base64');
const clientId = getOption('clientId', 'ENV_CLIENT_ID');

var app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/color/cycle', colorCycleHandler)
app.get('/color/query', colorQueryHandler)

app.post('/vote', voteOption)
app.get('/votes', getVotes)
app.post('/poll', createPoll)

app.listen(8081);

function usingValue (name) {
  return `Using environment variable for ${name}`;
}

function missingValue (name, variable) {
  const option = name.charAt(0);
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`;
}

// Get options from the command line or the environment.
function getOption (optionName, environmentName) {
  const option = (() => {
    if (ext[optionName]) {
      return ext[optionName];
    } else if (process.env[environmentName]) {
      console.log(STRINGS[optionName + 'Env']);
      return process.env[environmentName];
    }
    console.log(STRINGS[optionName + 'Missing']);
    process.exit(1);
  })();
  console.log(`Using "${option}" for ${optionName}`);
  return option;
}

// Verify the header and the enclosed JWT.
function verifyAndDecode (header) {
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length);
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] });
    }
    catch (ex) {
      throw Boom.unauthorized(STRINGS.invalidJwt);
    }
  }
  throw Boom.unauthorized(STRINGS.invalidAuthHeader);
}

function colorCycleHandler (req, res) {
  // Verify all requests.
  const payload = verifyAndDecode(req.headers.authorization);
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

  client.query('SELECT NOW()', (err, res) => {
    console.log("NOW: ", res.rows)
  })

  // Store the color for the channel.
  let currentColor = channelColors[channelId] || initialColor;

  // Rotate the color as if on a color wheel.
  verboseLog(STRINGS.cyclingColor, channelId, opaqueUserId);
  currentColor = color(currentColor).rotate(colorWheelRotation).hex();

  // Save the new color for the channel.
  channelColors[channelId] = currentColor;

  res.send(currentColor);
}

function colorQueryHandler (req, res) {
  // Verify all requests.
  const payload = verifyAndDecode(req.headers.authorization);

  // Get the color for the channel from the payload and return it.
  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  const currentColor = color(channelColors[channelId] || initialColor).hex();
  verboseLog(STRINGS.sendColor, currentColor, opaqueUserId);
  res.send(currentColor);
}

function createPoll(req, res) {
  const payload = verifyAndDecode(req.headers.authorization)

  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;
  req.body.options = JSON.parse(req.body.options);

  (async () => {
    const transactionClient = await pool.connect()

    try {
      await transactionClient.query('BEGIN')

      const clearText1 = 'DELETE FROM questions WHERE questions.channelID = $1'
      const clearText2 = 'DELETE FROM options WHERE options.channelID = $1'
      await transactionClient.query(clearText1, [channelId])
      await transactionClient.query(clearText2, [channelId])

      const questionText = 'INSERT INTO questions(channelID, question) VALUES($1, $2)'
      await transactionClient.query(questionText, [channelId, req.body.question])
      const optionsText = 'INSERT INTO options(channelID, optionID, option) VALUES($1, $2, $3)'
      req.body.options.forEach(async (option) => {
        await transactionClient.query(optionsText, [channelId, option.id, option.value])
      })

      await transactionClient.query('COMMIT')
    } catch (e) {
      await transactionClient.query('ROLLBACK')
      throw e
    } finally {
      transactionClient.release()
    }
  })().catch(e => console.error(e.stack))

  res.send({ success: true, channelId, question: req.body.question, options: req.body.options })
}

async function getVotes(req, res) {
  const payload = verifyAndDecode(req.headers.authorization)

  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

  var queryText = 'SELECT question from questions WHERE channelID = $1'
  const questionRes = await client.query(queryText, [channelId])

  queryText = 'SELECT optionID, option from options WHERE channelID = $1'
  const optionsRes = await client.query(queryText, [channelId])
  const options = optionsRes.rows.map((option) => ({ id: option.optionid, value: option.option }))

  queryText = 'SELECT optionID from votes WHERE channelID = $1'
  const result = await client.query(queryText, [channelId])

  const votes = {}
  result.rows.forEach((vote) => {
    if (vote.optionid in votes) {
      votes[vote.optionid]++
    } else {
      votes[vote.optionid] = 1
    }
  })
  res.send({ votes, question: questionRes.rows[0].question, options })
}

function voteOption(req, res) {
  const payload = verifyAndDecode(req.headers.authorization)

  const { channel_id: channelId, opaque_user_id: opaqueUserId } = payload;

  (async () => {
    const transactionClient = await pool.connect()

    try {
      await transactionClient.query('BEGIN')

      const clearText = 'DELETE FROM votes WHERE votes.channelID = $1 AND votes.userID = $2'
      await transactionClient.query(clearText, [channelId, opaqueUserId])

      const voteText = 'INSERT INTO votes(channelID, optionID, userID) VALUES($1, $2, $3)'
      await transactionClient.query(voteText, [channelId, req.body.optionId, opaqueUserId])

      await transactionClient.query('COMMIT')
    } catch (e) {
      await transactionClient.query('ROLLBACK')
      throw e
    } finally {
      transactionClient.release()
    }
  })().catch(e => console.error(e.stack))

  res.send({ success: true, channelId, optionId: req.body.optionId, userId: opaqueUserId })
}