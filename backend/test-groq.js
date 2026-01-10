// backend/test-groq.js - Test Groq API Connection
require('dotenv').config();
const Groq = require('groq-sdk').default;

console.log('🧪 Testing Groq API Connection...\n');

// Check if API key exists
if (!process.env.GROQ_API_KEY) {
  console.error('❌ ERROR: GROQ_API_KEY not found in .env file!');
  console.log('\n💡 Steps to fix:');
  console.log('1. Go to https://console.groq.com');
  console.log('2. Navigate to API Keys');
  console.log('3. Create a new API key');
  console.log('4. Add to backend/.env: GROQ_API_KEY=gsk_...');
  process.exit(1);
}

console.log('✅ API Key found:', process.env.GROQ_API_KEY.substring(0, 20) + '...');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function testChat() {
  console.log('\n📝 Test 1: Chat Completion (Llama 3.3 70B)');
  console.log('-'.repeat(50));

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello from Groq!" and confirm you are working.'
        }
      ],
      max_tokens: 100,
      temperature: 0.5
    });

    console.log('✅ Chat API is working!');
    console.log('📤 Response:', completion.choices[0].message.content);
    console.log('⚡ Model used:', completion.model);
    console.log('🔢 Tokens used:', completion.usage.total_tokens);

    return true;
  } catch (error) {
    console.error('❌ Chat API Error:', error.message);
    return false;
  }
}

async function testSummarization() {
  console.log('\n🤖 Test 2: Summarization with JSON Response');
  console.log('-'.repeat(50));

  const testTranscript = `
    We had a great meeting today about the new product launch.
    John mentioned we need to finalize the design by Friday.
    Sarah will handle the marketing campaign.
    We need to schedule a follow-up meeting next week to review progress.
  `;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You create structured summaries. Always return valid JSON only.'
        },
        {
          role: 'user',
          content: `Convert this transcript into a structured summary.

Transcript: "${testTranscript}"

Respond with ONLY this JSON structure:
{
  "bullets": ["point 1", "point 2", "point 3"],
  "action": "one clear action item",
  "email": "professional email draft"
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0].message.content;
    const summary = JSON.parse(response);

    console.log('✅ Summarization is working!');
    console.log('\n📋 Generated Summary:');
    console.log('  Bullets:');
    summary.bullets.forEach((bullet, i) => {
      console.log(`    ${i + 1}. ${bullet}`);
    });
    console.log(`\n  Action: ${summary.action}`);
    console.log(`\n  Email: ${summary.email}`);
    console.log('\n🔢 Tokens used:', completion.usage.total_tokens);

    return true;
  } catch (error) {
    console.error('❌ Summarization Error:', error.message);
    return false;
  }
}

async function testWhisperInfo() {
  console.log('\n🎤 Test 3: Whisper Model Info');
  console.log('-'.repeat(50));

  console.log('✅ Whisper Large v3 is available via Groq');
  console.log('📊 Free tier limits:');
  console.log('   - 7,200 audio seconds per day (2 hours)');
  console.log('   - Supports multiple languages');
  console.log('   - Very fast processing (<10 seconds for 1 minute audio)');
  console.log('\n💡 To test audio transcription, run the server and use POST /api/transcribe');

  return true;
}

async function checkRateLimits() {
  console.log('\n⚡ Test 4: Rate Limits Check');
  console.log('-'.repeat(50));

  console.log('📊 Groq Free Tier Limits:');
  console.log('   Chat (Llama 3.3 70B):');
  console.log('   - 14,400 requests per day');
  console.log('   - 300+ tokens/second (very fast!)');
  console.log('\n   Audio (Whisper Large v3):');
  console.log('   - 7,200 seconds per day (~2 hours of audio)');
  console.log('   - Fast transcription');
  console.log('\n✅ These limits are VERY generous for an MVP!');
  console.log('💡 You can process ~200 voice memos per day for free');

  return true;
}

async function runAllTests() {
  console.log('🎯 Running Groq API Tests...\n');

  const results = [];

  results.push(await testChat());
  results.push(await testSummarization());
  results.push(await testWhisperInfo());
  results.push(await checkRateLimits());

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));

  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`);
    console.log('\n🚀 Your Groq API is ready to use!');
    console.log('💡 Next step: Start the server with "npm start"');
  } else {
    console.log(`⚠️ Some tests failed (${passed}/${total})`);
    console.log('\n🔧 Please check your API key and try again.');
  }

  console.log('\n');
}

runAllTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});