// Check available Gemini models via REST API
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('Fetching available models...\n');

// Try v1 API
const v1Url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
const v1betaUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function checkModels(url, version) {
  try {
    console.log(`\nChecking ${version} API...`);
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Error (${response.status}):`, data);
      return;
    }
    
    console.log(`✅ Success! Available models in ${version}:`);
    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
        console.log(`  - ${model.name} ${supportsGenerate ? '✅ (supports generateContent)' : '❌'}`);
      });
    } else {
      console.log('  No models found');
    }
  } catch (error) {
    console.error(`❌ Error fetching ${version}:`, error.message);
  }
}

await checkModels(v1Url, 'v1');
await checkModels(v1betaUrl, 'v1beta');
