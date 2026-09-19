import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { DEFAULT_MODEL, createGeminiModel, geminiGenerate } from './gemini';
import { createWebsiteFetcher } from './website';

try {
  process.loadEnvFile(); // reads ./.env when present
} catch {
  // No .env file: fall back to real environment variables.
}

const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || (production ? 3000 : 3001);
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const app = createApp({
  model: apiKey ? createGeminiModel(geminiGenerate(apiKey), modelName) : null,
  fetchWebsite: createWebsiteFetcher(),
  staticDir: production ? path.join(rootDir, 'dist') : undefined,
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Blender server on port ${port} (model ${modelName}, API key ${apiKey ? 'set' : 'MISSING'})`);
  if (!production) return;
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal) console.log(`  Open on phones: http://${a.address}:${port}`);
    }
  }
});
