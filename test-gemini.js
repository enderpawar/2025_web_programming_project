// Test Gemini API connection
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGeminiAPI() {
  console.log('Testing Gemini API...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NOT FOUND');
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    console.log('\n1. Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini AI initialized');

    console.log('\n2. Listing available models...');
    
    // Try different model names
    const modelNames = [
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash-001',
      'gemini-flash-latest'
    ];

    let workingModel = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello in one word.');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ SUCCESS with ${modelName}!`);
        console.log(`Response: ${text}`);
        workingModel = modelName;
        break;
      } catch (err) {
        console.log(`❌ Failed with ${modelName}`);
        console.log(`   Error: ${err.message}`);
        if (err.status) console.log(`   Status: ${err.status}`);
        if (err.errorDetails) {
          console.log(`   Details:`, JSON.stringify(err.errorDetails, null, 2));
        }
      }
    }

    if (workingModel) {
      console.log(`\n🎉 Working model found: ${workingModel}`);
      console.log(`\nUpdate your server code to use: '${workingModel}'`);
    } else {
      console.error('\n❌ No working model found. Please check your API key and permissions.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testGeminiAPI();
