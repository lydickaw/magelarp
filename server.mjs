import { createClient } from 'redis';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = 8080;
const STATIC_PATH = __dirname + '/web-client/dist';
const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;

const app = express();

// Middleware: automatic parsing of JSON POST bodies.
app.use(bodyParser.json());

// Middleware: parsing of request cookies.
app.use(cookieParser());

//
// Initialize database connection.
//

const redisClient = createClient({host: 'redis', port: 6379});
redisClient.on('error', err => console.error('Redis client error', err));
await redisClient.connect();

// Bootstrap root user.
const setupKey = await redisClient.get('setup-user');
if (setupKey === null) {
    const key = crypto.randomUUID();
    console.log('Creating initial admin user "prime-mover" with key: ' + key);
    await redisClient.hSet('staff:' + key, {name: 'prime-mover', is_admin: 'true'});
    await redisClient.set('setup-user', key);
}

//
// Database Schema
//
// staff:<key> -> [hash] name, is_admin, login_complete
// characters -> [set] keys[] (enumerate players)
// character:<key> -> [hash] player_name, character_name, stats (json string)
// character-tags:<key> -> [set] tags[]
// character-journal:<key> -> [stream] staff, description_md
// world-journal -> [stream] staff, tags (json string list), thread, description_md
//
// downtime:<key> -> [stream] downtime_uid, ?proposal, ?staff_notes, ?is_complete (bool)
// (note: merge all entries with the same downtime_uid to get current result)
//
// setup-user -> [string] initial staff key | ''
// publishing-watermark -> [string] current watermark for published journal entries.

//
// Utility methods.
//

class MissingFieldError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "MissingFieldError";
    }
}

class UnauthorizedError extends Error {
    constructor(msg) {
        super(msg);
        this.name = "UnauthorizedError";
    }
}

function isNonEmptyObject(val) { // bool
    return typeof val === 'object' && Object.keys(val).length > 0;
}

function isNonEmptyString(val) { // bool
    return (typeof val === 'string' && val.length !== 0);
}

function isNonEmptyArray(val) { // bool
    return (Array.isArray(val) && val.length !== 0);
}

function requireStringField(obj, field) { // string
    const val = obj[field];
    if (!isNonEmptyString(val)) {
        throw new MissingFieldError('Bad Request -- missing field "' + field + '"');
    }
    return val;
}

function requireArrayField(obj, field) { // array
    const val = obj[field];
    if (!isNonEmptyArray(val)) {
        throw new MissingFieldError('Bad Request -- missing field "' + field + '"');
    }
    return val;
}

async function dbGetHash(key) { // promise<obj | null>
    const hash = await redisClient.hGetAll(key);
    if (!isNonEmptyObject(hash)) {
        return null;
    }
    return hash;
}

async function updateCharacter(key, character) {
    const serialized = {};

    if (isNonEmptyString(character.player_name)) {
        serialized["player_name"] = character.player_name;
    }

    if (isNonEmptyString(character.shadow_name)) {
        serialized["shadow_name"] = character.shadow_name;
    }

    if (isNonEmptyObject(character.stats)) {
        serialized["stats"] = JSON.stringify(character.stats);
    }

    await redisClient.hSet('character:' + key, serialized);
    return;
}

async function loadCharacter(key) {
    const character = await dbGetHash('character:' + key);
    if (character == null) {
        return null;
    }

    // Save key for use elsewhere.
    character.key = key;

    // Rehydate stats.
    character.stats = character.stats && JSON.parse(character.stats) || {};

    return character;
}

async function authorizeCharacter(req, res) { // returns async <character object>
    const key = requireStringField(req.query, 'key');

    const character = await loadCharacter(key);
    if (character == null) {
        throw new UnauthorizedError('Unauthorized -- please log in with your character key or contact your Storyteller to sign up.');
    }
    return character;
}

async function authorizeStaff(req, res) { // return async<{key, name, is_admin, login_complete}>
    const key = requireStringField(req.query, 'key');

    const staff = await dbGetHash('staff:' + key);
    if (staff == null) {
        res.status(401).send('Unauthorized -- please log in with your staff key or contact your Storyteller to sign up.');
        return null;
    }

    staff.key = key;
    return staff;
}

async function getCharacterTags(key) { // returns async <[tag, ...]>
    const explicitTags = await redisClient.sMembers('character-tags:' + key);

    // Also include the "everyone" tag without having to add it to all players.
    return explicitTags.concat(['everyone']);
}

async function getPublishedWatermarkMillis() { // returns async Number ts millis
    return Number((await redisClient.get('publishing-watermark')) || "0");
}

// TODO: set starting key to now - 60d
async function getVisibleJournalEntries(opt_tags) {
    const raw = await redisClient.xRead({ key: 'world-journal', id: '0-0' });
    if (raw === null) {
        return []; // No stream matched.
    }
    const entries = raw[0].messages;

    const visible_tags = new Set(opt_tags || []);
    const admin_view = !opt_tags;
    const results = [];
    for (const entry of entries) {
        const id = entry.id;
        const msg = entry.message;
        const result = {};
        const tags = JSON.parse(msg.tags);
        if (admin_view) {
            result.staff = msg.staff;
            result.tags = tags;
        } else {
            // TODO: support a special 'everyone' tag.
            const match = tags.find(x => visible_tags.has(x));
            if (!match) {
                continue;
            }
        }
        result.timestamp = id.split('-')[0];
        result.thread = msg.thread;
        result.description_md = msg.description_md;
        results.push(result);
    }
    return results;
}

// TODO: set starting key to now - 60d
async function getPersonalJournalEntries(key) {
    const raw = await redisClient.xRead({ key: 'character-journal:' + key, id: '0-0' });
    if (raw === null) {
        return []; // No stream matched.
    }
    const entries = raw[0].messages;

    const results = [];
    for (const entry of entries) {
        const id = entry.id;
        const msg = entry.message;
        const timestamp = id.split('-')[0];

        results.push({
            timestamp: timestamp,
            thread: "Personal",
            description_md: msg.description_md
        });
    }
    return results;
}

// TODO: set starting key to now - 60d
async function getCharacterDowntime(key) { // returns async<[obj, ...]>
    const raw = await redisClient.xRead({ key: 'downtime:' + key, id: '0-0' });
    if (raw === null) {
        return []; // No stream matched.
    }
    const entries = raw[0].messages;

    // uid -> uid, proposal, staff_comment, is_complete, player_updated_ts, staff_updated_ts
    const downtimes = {};
    const result = [];

    for (const entry of entries) {
        const id = entry.id;
        const msg = entry.message;
        const uid = msg.uid;
        const timestamp = id.split('-')[0];
        const proposal = msg.proposal || null;
        const staff_comment = msg.staff_comment || null;
        const is_complete = msg.is_complete || false;

        let downtime = null;
        if (!(uid in downtimes)) {
            downtimes[uid] = { uid: uid, is_complete: false };
            result.push(downtimes[uid]);
        }
        downtime = downtimes[uid];

        if (proposal) {
            downtime.proposal = proposal;
            downtime.player_updated_ts = timestamp;
        }

        if (staff_comment) {
            downtime.staff_comment = staff_comment;
            downtime.staff_updated_ts = timestamp;
        }

        if (is_complete) {
            downtime.is_complete = true;
            downtime.staff_updated_ts = timestamp;
        }
    }

    return result;
}

// Wrapper to allow try/catch to work, even with async functions.
function handleAsync(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res);
        } catch (err) {
            if (err instanceof MissingFieldError) {
                res.status(400).send(err.message);
            } else if (err instanceof UnauthorizedError) {
                res.status(401).send(err.message);
            } else {
                console.error('Unhandled server error', err);
                return next('Internal Server Error');
            }
        }
    };
}

//
// JSON API
//

app.get('/api/playerData', handleAsync(async (req, res) => {
    const character = await authorizeCharacter(req, res);
    const tags = await getCharacterTags(character.key);    
    const worldJournal = await getVisibleJournalEntries(tags);
    const personalJournal = await getPersonalJournalEntries(character.key);
    const downtime = await getCharacterDowntime(character.key);

    // Filter out unpublished entries.
    const journalCandidates = worldJournal.concat(personalJournal);
    const watermark = await getPublishedWatermarkMillis();
    const publishedJournal = journalCandidates.filter(x => Number(x.timestamp) < watermark);

    const json = {
        "player_name": character.player_name,
        "shadow_name": character.shadow_name,
        "stats": character.stats,
        "journal": publishedJournal,
        "downtime": downtime
    };

    res.type('json');
    res.send(JSON.stringify(json));
}));

app.get('/api/staffData', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    // Get all character keys.
    const keys = await redisClient.sMembers("characters");

    // For each character.
    const characters = [];
    for (const key of keys) {
        // Get character stats.
        const character = await loadCharacter(key);

        // Get all tags.
        character.tags = await getCharacterTags(key);

        // Collect downtimes waiting on staff review.
        character.downtime = (await getCharacterDowntime(key)).filter(
            x => !x.complete && (!x.staff_updated_ts || (x.staff_updated_ts < x.player_updated_ts))
        );

        characters.push(character);
    }

    const journal = await getVisibleJournalEntries();

    const watermark = await getPublishedWatermarkMillis();

    const json = {
        "iam": staff.name,
        "watermark": watermark,
        "characters": characters,
        "journal": journal
    };

    res.type('json');
    res.send(JSON.stringify(json));
}));

// TODO: add staff + remove staff
// TODO: reset character key (actually hard -- this is stored all over the place. Indirect?)

app.post('/api/newPlayer', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    const player_name = requireStringField(req.body, 'player_name');
    const shadow_name = requireStringField(req.body, 'shadow_name');

    const key = crypto.randomUUID();

    await redisClient.sAdd("characters", key);
    await updateCharacter(key, { player_name, shadow_name });

    const json = {
        "key": key
    };

    res.type('json');
    res.send(JSON.stringify(json));
}));

app.post('/api/updateStats', handleAsync(async (req, res) => {
    const character = await authorizeCharacter(req, res);

    // TODO: allow clearing stats? (empty/missing body)
    if (!isNonEmptyObject(req.body.stats)) {
        res.status(400).send('Bad request -- missing field "stats"');
        return;
    }

    // TODO: verify stats match desired naming scheme.

    await updateCharacter(character.key, { stats: req.body.stats });
    res.sendStatus(200);
}));

app.post('/api/addWorldJournalEntry', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res); 

    const tags = requireArrayField(req.body, 'tags');
    const thread = requireStringField(req.body, 'thread');
    const desc = requireStringField(req.body, 'description_md');

    const serialized = {
        staff: staff.name,
        tags: JSON.stringify(tags),
        thread: thread,
        description_md: desc
    };

    await redisClient.xAdd('world-journal', '*', serialized);
    res.sendStatus(200);
}));

app.post('/api/updateDowntime', handleAsync(async (req, res) => {
    const character = await authorizeCharacter(req, res);

    const uid = isNonEmptyString(req.body.uid) ? req.body.uid : crypto.randomUUID();
    const proposal = requireStringField(req.body, 'proposal');

    const serialized = {
        uid: uid,
        proposal: proposal
    };

    await redisClient.xAdd('downtime:' + character.key, '*', serialized);
    res.sendStatus(200);
}));

app.post('/api/rejectDowntime', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    const player_key = requireStringField(req.body, 'player_key');
    const uid = requireStringField(req.body, 'uid');
    const staff_comment = requireStringField(req.body, 'staff_comment');

    const serialized = {
        uid: uid,
        staff_comment: staff_comment
    };

    await redisClient.xAdd('downtime:' + player_key, '*', serialized);
    res.sendStatus(200);
}));

app.post('/api/acceptDowntime', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    const player_key = requireStringField(req.body, 'player_key');
    const uid = requireStringField(req.body, 'uid');

    // Mark downtime complete.
    const serialized = {
        uid: uid,
        is_complete: "1"
    };
    await redisClient.xAdd('downtime:' + player_key, '*', serialized);

    // Update player journal (if requested).
    if (isNonEmptyString(req.body.journal_entry)) {
        const journal_entry = {
            staff: staff.name,
            description_md: req.body.journal_entry
        };
        await redisClient.xAdd('character-journal:' + player_key, '*', journal_entry);
    }

    // Update player tags (if requested).
    if (isNonEmptyArray(req.body.tags)) {
        await redisClient.sAdd('character-tags:' + player_key, req.body.tags);
    }

    res.sendStatus(200);
}));

app.post('/api/addTags', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    const player_key = requireStringField(req.body, 'player_key');
    const tags = requireArrayField(req.body, 'tags');

    await redisClient.sAdd('character-tags:' + player_key, tags);

    res.sendStatus(200);
}));

app.post('/api/removeTags', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    const player_key = requireStringField(req.body, 'player_key');
    const tags = requireArrayField(req.body, 'tags');

    await redisClient.sRem('character-tags:' + player_key, req.body.tags);

    res.sendStatus(200);
}));

app.post('/api/releaseJournalDrafts', handleAsync(async (req, res) => {
    await authorizeStaff(req, res);
    await redisClient.set('publishing-watermark', String(Date.now()));
    res.sendStatus(200);
}));

//
// First time setup URI.
//

app.get('/setup', handleAsync(async (req, res) => {
    const setupKey = await redisClient.get('setup-user');
    if (isNonEmptyString(setupKey)) {
        res.send('Welcome! You can sign as admin at /staff-login?key=' + setupKey);        
    } else {
        res.send('This instance is already set up.');
    }
}));

//
// Login redirector (set cookie and bounce to index page).
//

app.get('/player-login', (req, res) => {
    if (isNonEmptyString(req.query.key)) {
        // Chrome doesn't allow cookies to perist longer than 400d.
        // Use a year as "forever".
        res.cookie('player_key', req.query.key, { maxAge: ONE_YEAR_IN_MS });
    }

    res.redirect('/');
});

app.get('/staff-login', handleAsync(async (req, res) => {
    const staff = await authorizeStaff(req, res);

    if (!staff.login_complete) {
        await redisClient.hSet('staff:' + staff.key, { login_complete: 'true' });
        await redisClient.set('setup-user', '');
    }

    if (isNonEmptyString(req.query.key)) {
        // Chrome doesn't allow cookies to perist longer than 400d.
        // Use a year as "forever".
        res.cookie('staff_key', req.query.key, { maxAge: ONE_YEAR_IN_MS });
    }

    res.redirect('/');
}));

//
// Publish static assets for webapp.
//

app.use(express.static(STATIC_PATH));

// Only match "/" and send index.html.
app.get(/\/$/, (req, res) => {
    // Refresh cookies, so that login doesn't expire.
    if (isNonEmptyString(req.cookies.staff_key)) {
        res.cookie('staff_key', req.cookies.staff_key, { maxAge: ONE_YEAR_IN_MS });
    }
    if (isNonEmptyString(req.cookies.player_key)) {
        res.cookie('player_key', req.cookies.player_key, { maxAge: ONE_YEAR_IN_MS });
    }

    res.sendFile(STATIC_PATH + '/index.html');
});

//
// Start service.
//

app.listen(port, function () {
    console.log('Node.js/Express server listening on port ' + port);
});