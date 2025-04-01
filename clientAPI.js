import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = 8003;
const MONGO_URI = 'mongodb://localhost:27017';
const DATABASE_NAME = 'iotsrv';

// Middleware to parse query strings
app.use(express.json());

// MongoDB client
const client = new MongoClient(MONGO_URI);

async function connectToMongo() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

// Helper function to handle queries
async function handleQuery(req, res, collectionName) {
    const queryString = req.query.q;
console.log(`Received query for collection ${collectionName}:`, queryString);
    if (!queryString) {
        return res.status(400).send({ error: 'Missing query string parameter "q"' });
    }

    let query;
    try {
        query = JSON.parse(queryString);
    } catch (err) {
        return res.status(400).send({ error: 'Invalid query string. Must be a valid JSON object.' });
    }

    try {
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(collectionName);
        const results = await collection.find(query).project({ validAt: 1, deviceId: 1, valueType: 1, value: 1, _id: 0 }).toArray();
        res.status(200).send(results);
    } catch (err) {
        console.error(`Error executing query on collection ${collectionName}:`, err);
        res.status(500).send({ error: 'Failed to execute query' });
    }
}

// Endpoint for the "values" collection
app.get('/values', async (req, res) => {
    await handleQuery(req, res, 'values');
});

// Endpoint for the "logs" collection
app.get('/log', async (req, res) => {
    await handleQuery(req, res, 'log');
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
    await connectToMongo();
});