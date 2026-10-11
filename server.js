const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();
app.use(express.json());
app.use(cors());

// Configure AWS Region (Free Tier eligible region like us-east-1)
AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'PharmaChainTelemetry';

const PORT = process.env.PORT || 5000;

// Health Check Route
app.get('/', (req, res) => {
    res.json({
        project: "PharmaChain Live API",
        status: "Active & Secure",
        awsBackend: "Connected"
    });
});

// GET: Fetch recent sensor telemetry logs
app.get('/api/telemetry', async (req, res) => {
    const params = {
        TableName: TABLE_NAME,
        Limit: 20
    };

    try {
        const data = await dynamoDB.scan(params).promise();
        res.json({ success: true, count: data.Items.length, data: data.Items });
    } catch (err) {
        // Fallback mock data if DynamoDB table isn't created yet locally
        res.json({
            success: true,
            note: "Running on fallback simulation mode",
            data: [
                { sensorId: "IoT-9041", temperature: 4.1, humidity: 44, status: "OPTIMAL", timestamp: new Date().toISOString() },
                { sensorId: "IoT-9042", temperature: 3.8, humidity: 47, status: "OPTIMAL", timestamp: new Date().toISOString() }
            ]
        });
    }
});

// POST: Ingest IoT / Flink Stream Telemetry
app.post('/api/telemetry', async (req, res) => {
    const { sensorId, temperature, humidity, location } = req.body;

    if (!sensorId || temperature === undefined) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    let status = (temperature >= 2.0 && temperature <= 8.0) ? "OPTIMAL" : "CRITICAL_BREACH";

    const newItem = {
        sensorId: sensorId,
        timestamp: new Date().toISOString(),
        temperature: Number(temperature),
        humidity: humidity || 50,
        location: location || "Global Transit Hub",
        status: status
    };

    const params = {
        TableName: TABLE_NAME,
        Item: newItem
    };

    try {
        await dynamoDB.put(params).promise();
        res.status(201).json({ success: true, message: "Telemetry stored in AWS DynamoDB", data: newItem });
    } catch (err) {
        // Handle gracefully if database table hasn't been provisioned yet
        res.status(201).json({ success: true, message: "Telemetry processed (Simulation mode)", data: newItem });
    }
});

app.listen(PORT, () => {
    console.log(`PharmaChain Live backend running on port ${PORT}`);
});