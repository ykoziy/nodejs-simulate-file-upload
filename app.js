import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import express from 'express';
import fs from 'fs';
import path from 'path';
import Busboy from 'busboy';

const app = express();
app.use(express.json());

const __dirname = import.meta.dirname;

const secret_name = "node-server/api-key";

const client = new SecretsManagerClient({
    region: "us-east-1",
});

let response;

try {
    response = await client.send(
        new GetSecretValueCommand({
            SecretId: secret_name,
            VersionStage: "AWSCURRENT",
        })
    );
} catch (error) {
    throw error;
}

const secret = JSON.parse(response.SecretString);

const validateApiKey = (req, res, next) => {
    const clientKey = req.header('api-key');
    if (!clientKey || clientKey !== secret['x-api-key']) {
        return res.status(401).json({ error: "Forbidden: Invalid API Key" });
    }
    next();
};

app.post('/uploadFile', validateApiKey, (req, res) => {
    // Initialize Busboy with request headers
    const busboy = Busboy({
        headers: req.headers,
        limits: {
            fileSize: 629145726
        }
    });

    busboy.on('file', (name, file, info) => {
        const { filename } = info;
        const saveTo = path.join(__dirname, 'uploads', filename);
        const writeStream = fs.createWriteStream(saveTo);
        console.log(`Uploading: ${filename}`);

        file.on('data', (chunk) => {
            console.log(`Recieved ${chunk.length} bytes of data.`);
        });

        // Stream the file chunk by chunk
        file.pipe(writeStream);
    });

    busboy.on('finish', () => {
        console.log('Upload complete');
        res.status(200).json({ message: 'Uploaded file sucessfully!' });
    });

    busboy.on('error', () => {
        res.status(500).json({ message: 'Internal server error!' });
    });

    // Pipe the request into busboy
    req.pipe(busboy);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});