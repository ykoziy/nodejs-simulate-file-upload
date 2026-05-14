import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

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
    // Define local path on EC2
    const filename = req.headers['x-file-name'] || 'uploaded_file';
    const filePath = path.join(__dirname, 'uploads', filename);
    const writeStream = fs.createWriteStream(filePath);

    // Pipe request directly to disk
    req.on('data', chunk => {
        writeStream.write(chunk);
    })
    req.pipe(writeStream);

    writeStream.on('finish', () => {
        res.status(200).send('File uploaded successfully');
    });

    writeStream.on('error', (err) => {
        console.error(err);
        res.status(500).send('Error writing file');
    });

    req.on('error', (err) => {
        console.error(err);
        writeStream.close();
        res.status(500).send('Error receiving file');
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});