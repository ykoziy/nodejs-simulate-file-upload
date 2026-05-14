import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import express from 'express';

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
      VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
    })
  );
} catch (error) {
  throw error;
}

const secret = response.SecretString;

const validateApiKey = (req, res, next) => {
    const clientKey = req.header('api-key'); // Standard header for API keys
    console.log("client key" + clientKey);
    console.log("server api key" + secret);
    if (!clientKey || clientKey !== secret) {
        return res.status(401).json({ error: "Forbidden: Invalid API Key" });
    }
    next();
};

// Apply to your POST endpoint
app.post('/uploadFile', validateApiKey, (req, res) => {
    res.send("Authorized request successful!");
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});