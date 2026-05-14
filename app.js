import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import express from 'express';

const app = express();
app.use(express.json());

const client = new SecretsManagerClient({ region: "us-east-1" });
const secret_name = "node-server/api-key";

async function getApiKey() {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secret_name })
  );
  const secret = JSON.parse(response.SecretString);
  return secret.MY_API_KEY;
}

let VALID_API_KEY;

// Load key once on startup
getApiKey().then(key => { VALID_API_KEY = key; });

const validateApiKey = (req, res, next) => {
  const clientKey = req.header('api-key'); // Standard header for API keys
  
  if (!clientKey || clientKey !== VALID_API_KEY) {
    return res.status(401).json({ error: "Forbidden: Invalid API Key" });
  }
  next();
};

// Apply to your POST endpoint
app.post('/uploadFile', validateApiKey, (req, res) => {
  res.send("Authorized request successful!");
});

app.listen(3000);