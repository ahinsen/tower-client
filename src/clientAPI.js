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

// Query definitions with parameters and default values
const queries = {
    values: {
        collection: 'values',
        parameters: {
            validAtStart: Date.now() - 1000 * 60 * 60 * 24 * 30, // Default to 30 days ago
            validAtEnd: Date.now(),
            deviceId: null,
            valueType: null,
        },
        pipeline: (params) => [
            {
                $match: {
                    validAt: { $gte: params.validAtStart, $lte: params.validAtEnd },
                    ...(params.deviceId && { deviceId: params.deviceId }),
                    ...(params.valueType && { valueType: params.valueType }),
                },
            },
            {
                $project: {
                    receivedAt: 1,
                    validAt: 1,
                    deviceId: 1,
                    valueType: 1,
                    value: 1,
                },
            },
            {
                $limit: 1000, // Limit the number of documents to 1000
            },
        ],
    },
    valuesCnt: {
        collection: 'values',
        parameters: {
            validAtStart: Date.now() - 1000 * 60 * 60 * 24 * 30, // Default to 30 days ago
            validAtEnd: Date.now(),
            deviceId: null,
            valueType: null,
        },
        pipeline: (params) => [
            {
                $match: {
                    validAt: { $gte: params.validAtStart, $lte: params.validAtEnd },
                    ...(params.deviceId && { deviceId: params.deviceId }),
                    ...(params.valueType && { valueType: params.valueType }),
                },
            },
            {
                $count: "count", // Add a $count stage to return the document count
            },
        ],
    },
    valuesPerDevice: {
        collection: 'values',
        parameters: {
            validAtStart: 0,
            validAtEnd: Date.now(),
            deviceId: null,
        },
        pipeline: (params) => [
            {
                $match: {
                    validAt: { $gte: params.validAtStart, $lte: params.validAtEnd },
                    ...(params.deviceId && { deviceId: params.deviceId }),
                },
            },
            {
                $group: {
                    _id: { validAt: "$validAt", deviceId: "$deviceId" },
                    values: { $push: { k: "$valueType", v: "$value" } },
                },
            },
            {
                $set: {
                    values: { $arrayToObject: "$values" },
                },
            },
            {
                $project: {
                    _id: 0,
                    validAt: "$_id.validAt",
                    deviceId: "$_id.deviceId",
                    values: 1,
                },
            },
            {
                $set: {
                    combined: { $mergeObjects: ["$values", { validAt: "$validAt", deviceId: "$deviceId" }] },
                },
            },
            {
                $replaceRoot: { newRoot: "$combined" },
            },
            {
                $sort: { validAt: 1 },
            },],
    },
};
// Utility function to parse ISO date strings
function parseDateParameter(value) {
    // Check if the value is a valid ISO date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.getTime(); // Convert to numeric timestamp
    }
    return value; // Return the original value if not a valid date
}

// Helper function to handle queries
async function handleQuery(req, res, queryConfig) {
    // Merge default parameters with URL-provided parameters
    const params = { ...queryConfig.parameters };
    for (const [key, value] of Object.entries(req.query)) {
        // Parse date parameters and convert them to timestamps
        params[key] = parseDateParameter(isNaN(value) ? value : Number(value));
    }

    try {
        const db = client.db(DATABASE_NAME);
        const collection = db.collection(queryConfig.collection);
        const pipeline = queryConfig.pipeline(params); // Generate pipeline with updated parameters

        const results = await collection.aggregate(pipeline).toArray();
        res.status(200).send(results);
    } catch (err) {
        console.error(`Error executing query on collection "${queryConfig.collection}":`, err);
        res.status(500).send({ error: 'Failed to execute query' });
    }
}

// Define endpoints for each query
app.get('/aggregated-values', async (req, res) => {
    await handleQuery(req, res, queries.aggregatedValues);
});
// TODO define remaining endpoints
// Start the server
app.listen(PORT, async () => {
    console.log(`Server is listening on port ${PORT}`);
    await connectToMongo();
});

/* e.g.:
curl -X GET "http://localhost:8003/values?validAtStart=2024-01-01T00:00:00.000Z&deviceId=123" -H "Content-Type: application/json"
*/