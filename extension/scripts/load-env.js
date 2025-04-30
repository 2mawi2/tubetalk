import { existsSync } from 'fs';
import { config } from 'dotenv-flow';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

console.log('Current working directory:', process.cwd());
console.log('Checking for .env file at:', envPath);
console.log('File exists:', existsSync(envPath));

// Load from .env file
if (existsSync(envPath)) {
  console.log('Loading environment variables from .env file...');
  const result = config();
  console.log('Loaded env vars:', result.parsed ? 'success' : 'failed');
  
  // Set the environment variable if it was loaded from .env
  if (result.parsed?.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = result.parsed.OPENROUTER_API_KEY;
  }
}

// Validate that we have the required API key
if (!process.env.OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY is required but not set!');
  console.error('Please either:');
  console.error('1. Create a .env file with OPENROUTER_API_KEY=your-key');
  console.error('2. Set the OPENROUTER_API_KEY environment variable');
  process.exit(1);
}

console.log('OPENROUTER_API_KEY is set and valid'); 