const express = require('express');
const {Client} = require('discord.js');

const client = new Client({
    intents: [
        1, // GUILDS
        2, // GUILD_MEMBERS
        16, // GUILD_PRESENCES
        32, // GUILD_MESSAGES
        256 // GUILD_PRESENCES
    ],
});


const botToken = ""; // Bot Token
const port = 3333; // Port for the API
const guildId = ""; // Guild ID to fetch the members from
const imageChannel = "" // Channel ID to fetch the images from


const app = express();
app.use(express.json());
let router = express.Router();

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
});

function simplifyActivities(activities) {
    let activities_simplified = [];
    for (const element of activities) {
        let activity = element;
        let name = activity.name;
        let type = activity.type;
        let state = activity.state;
        let details = activity.details;
        let url = activity.url;
        let timestamps = activity.timestamps;
        let assets = activity.assets;
        let party = activity.party;
        let application_id = activity.application_id;
        let session_id = activity.session_id;
        let flags = activity.flags;
        let activity_object = {
            name: name,
            type: type,
            state: state,
            details: details,
            url: url,
            timestamps: timestamps,
            assets: assets,
            party: party,
            application_id: application_id,
            session_id: session_id,
            flags: flags
        }
        activities_simplified.push(activity_object);
    }
    return activities_simplified;
}


function getSpotify(activities) {
    let spotify;
    for (const element of activities) {
        if (element.name === "Spotify") {
            spotify = {
                song_name: element.details,
                artist: element.state,
                album: element.assets.largeText,
                cover_url: `https://i.scdn.co/image/${element.assets.largeImage.toString().replace("spotify:", "")}`,
                started_at: element.timestamps.start,
                ends_at: element.timestamps.end
            }

        }
    }
    return spotify || {};
}

function shuffleArray(array) {
    const shuffledArray = array.slice();
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
}

function removeDuplicates(array) {
    const uniqueArray = [];
    const imageIds = new Set();
    for (let i = 0; i < array.length; i++) {
        if (!imageIds.has(array[i].id)) {
            uniqueArray.push(array[i]);
            imageIds.add(array[i].id);
        }
    }
    return uniqueArray;
}

async function getImages() {
    const channel = await client.channels.fetch(imageChannel);
    if (!channel) {
        console.log(`Error: could not find channel with ID ${imageChannel}.`);
        return [];
    }
    const messages = await channel.messages.fetch();
    const images = [];
    messages.forEach((message) => {
        message.attachments.forEach((attachment) => {
            const fileExtension = attachment.name.split('.').pop().toLowerCase();
            if (fileExtension === 'jpg' || fileExtension === 'png') {
                images.unshift({
                    id: images.length + 1,
                    url: attachment.url
                });
            }
        });
    });
    return images;
}

router.get('/', (req, res) => {
    let ping = client.ws.ping;
    res.status(200).send({
        status: 'OK',
        message: 'API is running',
        bot: 'online',
        ping: ping
    });
});

router.get('/getimages', async (req, res) => {
    try {
        const images = await getImages();
        res.status(200).json({
            images: images
        });
    } catch (e) {
        console.log("Error caused by the following ip: " + req.ip);
        console.log("Error caused by the following origin: " + req.headers.origin);
        console.log(e);
        res.status(500).send({
            error: "Failed to fetch images"
        });
    }
});

router.get('/getlatestimages', async (req, res) => {
    try {
        const images = await getImages();
        res.status(200).json({
            images: images.slice(-50)
        });
    } catch (e) {
        console.log(`Error: ${e}`);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

router.get('/getrandomimages', async (req, res) => {
    try {
        const images = await getImages();
        const shuffledImages = shuffleArray(images);
        const uniqueImages = removeDuplicates(shuffledImages);
        const randomImages = uniqueImages.slice(0, req.query.limit || 50);
        res.status(200).json({
            images: randomImages
        });
    } catch (e) {
        console.log(`Error: ${e}`);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

router.get('/getstatus', async (req, res) => {
    try {
        let guild = await client.guilds.fetch(guildId);
        let member = await guild.members.fetch(req.query.member);
        let status = member.presence.status;
        let presence = member.presence.activities;
        let activities_simplified = simplifyActivities(presence)
        let spotify = getSpotify(presence);
        if (spotify === {} || spotify === undefined) spotify = "undefined";
        res.status(200).send({
            status: status,
            activities_raw: presence,
            activities_simplified: activities_simplified,
            spotify: spotify
        });
    } catch (e) {
        console.log("Error caused by the following ip: " + req.ip);
        console.log("Error caused by the following origin: " + req.headers.origin);
        console.log(e);
        res.status(500).send({
            status: "undefined",
            activities_raw: "undefined",
            parsed_activities: "undefined",
            spotify: "undefined"
        });
    }
});


app.use('/', router);
app.listen(port, () => {
    console.log(`API Server running on port ${port}`);
});


client.login(botToken).then(() => {
    console.log("Logged in as bot");
});
