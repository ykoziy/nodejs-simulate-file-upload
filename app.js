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
    const busboy = Busboy({ headers: req.headers });

    busboy.on('file', (name, file, info) => {
        const { filename } = info;
        const saveTo = path.join(__dirname, 'uploads', filename);
        console.log(`Uploading: ${filename}`);

        // Stream the file chunk by chunk
        file.pipe(fs.createWriteStream(saveTo));
    });

    busboy.on('finish', () => {
        console.log('Upload complete');
        res.writeHead(200, { 'Connection': 'close' });
        res.end("File uploaded successfully");
    });

    // Pipe the request into busboy
    req.pipe(busboy);
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});