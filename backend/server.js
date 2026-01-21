// backend/server.js - VoiceSnap Backend API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Groq = require('groq-sdk').default;
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment variables
if (!process.env.GROQ_API_KEY) {
  console.error('❌ ERROR: GROQ_API_KEY is missing in .env file!');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Supabase credentials are missing in .env file!');
  process.exit(1);
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// File upload configuration
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    groq: !!process.env.GROQ_API_KEY,
    supabase: !!process.env.SUPABASE_URL
  });
});

// Test Groq connection
app.get('/test-groq', async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say "Hello from Groq!"' }],
      max_tokens: 50
    });

    res.json({
      success: true,
      message: completion.choices[0].message.content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to convert audio to compatible format
const convertAudioToMp3 = async (inputPath, outputPath) => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);

  try {
    await execPromise(`ffmpeg -i "${inputPath}" -acodec libmp3lame -ab 128k "${outputPath}"`);
    return true;
  } catch (error) {
    console.error('FFmpeg conversion error:', error);
    return false;
  }
};

// Fixed /api/process endpoint - Replace in server.js
app.post('/api/process', upload.single('audio'), async (req, res) => {
  console.log('📥 Received processing request');
  let audioFilePath = null;

  try {
    const { userId, recordingId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log(`👤 User: ${userId}`);
    console.log(`📁 File: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📝 Temp path: ${req.file.path}`);

    // Rename file to have .m4a extension (Groq needs this!)
    audioFilePath = req.file.path + '.m4a';
    fs.renameSync(req.file.path, audioFilePath);
    console.log(`✅ Renamed to: ${path.basename(audioFilePath)}`);

    // Step 1: Transcribe with Groq Whisper
    console.log('🎤 Step 1: Transcribing audio...');

    // Read file as buffer
    const audioBuffer = fs.readFileSync(audioFilePath);
    console.log(`📦 Buffer size: ${audioBuffer.length} bytes`);

    // Create File object with proper name
    const { File } = require('buffer');
    const audioFile = new File([audioBuffer], 'recording.m4a', {
      type: 'audio/m4a'
    });

    console.log('📤 Sending to Groq Whisper API...');

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0.0
    });

    const transcript = transcription.text;
    console.log(`✅ Transcription complete: ${transcript.length} characters`);
    console.log(`📝 Preview: ${transcript.substring(0, 100)}...`);

    // Step 2: Summarize with Groq Llama
    console.log('🤖 Step 2: Generating summary...');

    const prompt = `You are an expert at converting voice memos into structured, actionable summaries.

Given this voice memo transcript:
"${transcript}"

Create a summary with EXACTLY this JSON structure:
{
  "bullets": ["First key point", "Second key point", "Third key point"],
  "action": "One clear action item or next step",
  "email": "A professional email draft incorporating the main points"
}

Requirements:
- 3 bullet points maximum, each under 100 characters
- 1 action item that is specific and actionable
- Email should be 2-3 sentences, professional tone
- Return ONLY valid JSON, no markdown formatting

JSON:`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates structured summaries. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0].message.content;
    console.log('🤖 AI Response received');

    // Parse the JSON response
    let summary;
    try {
      summary = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    if (!summary.bullets || !summary.action || !summary.email) {
      throw new Error('Invalid summary structure from AI');
    }

    console.log('✅ Summary generated successfully');
    console.log(`   - ${summary.bullets.length} bullet points`);
    console.log(`   - Action: ${summary.action.substring(0, 50)}...`);

    // Step 3: Update database if recordingId provided
    if (recordingId) {
      console.log('💾 Step 3: Updating database...');
      const { error: dbError } = await supabase
        .from('recordings')
        .update({
          transcript: transcript,
          summary: summary
        })
        .eq('id', recordingId);

      if (dbError) {
        console.error('⚠️ Database update error:', dbError);
      } else {
        console.log('✅ Database updated successfully');
      }
    }

    // Clean up
    try {
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
        console.log('🗑️ Temporary file cleaned up');
      }
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError.message);
    }

    // Send response
    res.json({
      success: true,
      transcript: transcript,
      summary: {
        bullets: summary.bullets.slice(0, 3),
        action: summary.action,
        email: summary.email
      },
      duration: transcription.duration || 0
    });

    console.log('✅ Request completed successfully\n');

  } catch (error) {
    console.error('❌ Processing error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.constructor.name
    });

    // Clean up on error
    try {
      if (audioFilePath && fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    } catch (cleanupError) {
      console.error('⚠️ Cleanup error:', cleanupError.message);
    }

    res.status(500).json({
      error: 'Processing failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Transcribe only endpoint (for testing)
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  console.log('📥 Transcription request received');

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`📁 Processing file: ${req.file.originalname}`);

    // Check if file needs conversion
    let audioFilePath = req.file.path;
    const needsConversion = req.file.originalname?.toLowerCase().endsWith('.m4a') ||
                           req.file.mimetype === 'audio/x-m4a';

    if (needsConversion) {
      console.log('🔄 Converting m4a to mp3...');
      const mp3Path = req.file.path + '.mp3';
      const converted = await convertAudioToMp3(req.file.path, mp3Path);

      if (converted) {
        audioFilePath = mp3Path;
        console.log('✅ Conversion successful');
      } else {
        console.warn('⚠️ Conversion failed, trying original file...');
      }
    }

    const audioFile = fs.createReadStream(audioFilePath);

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'json',
      language: 'en',
      temperature: 0.0
    });

    // Clean up files
    fs.unlinkSync(req.file.path);
    if (needsConversion && audioFilePath !== req.file.path && fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    console.log('✅ Transcription successful');

    res.json({
      success: true,
      transcript: transcription.text,
      duration: transcription.duration || 0
    });

  } catch (error) {
    console.error('❌ Transcription error:', error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (audioFilePath && audioFilePath !== req.file.path && fs.existsSync(audioFilePath)) {
      fs.unlinkSync(audioFilePath);
    }

    res.status(500).json({
      error: 'Transcription failed',
      message: error.message
    });
  }
});

// Summarize only endpoint (for testing)
app.post('/api/summarize', async (req, res) => {
  console.log('📥 Summarization request received');

  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    console.log(`📝 Summarizing ${transcript.length} characters...`);

    const prompt = `Convert this voice memo into a structured summary.

Transcript: "${transcript}"

Respond with ONLY this JSON structure:
{
  "bullets": ["point 1", "point 2", "point 3"],
  "action": "one clear action item",
  "email": "professional email draft"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You create structured summaries. Always return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const summary = JSON.parse(completion.choices[0].message.content);
    console.log('✅ Summary generated');

    res.json({
      success: true,
      summary: {
        bullets: summary.bullets.slice(0, 3),
        action: summary.action,
        email: summary.email
      }
    });

  } catch (error) {
    console.error('❌ Summarization error:', error);
    res.status(500).json({
      error: 'Summarization failed',
      message: error.message
    });
  }
});

// Check subscription status
// app.post('/api/check-subscription', async (req, res) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ error: 'userId is required' });
//     }

//     const { data: profile, error } = await supabase
//       .from('profiles')
//       .select('subscription_status, recordings_this_month, subscription_end_date')
//       .eq('id', userId)
//       .single();

//     if (error) {
//       throw error;
//     }

//     const isPremium = profile.subscription_status === 'premium' &&
//                       new Date(profile.subscription_end_date) > new Date();

//     const canRecord = isPremium || profile.recordings_this_month < 5;

//     res.json({
//       success: true,
//       isPremium,
//       canRecord,
//       recordingsUsed: profile.recordings_this_month,
//       recordingsLimit: isPremium ? 'unlimited' : 5
//     });

//   } catch (error) {
//     console.error('Subscription check error:', error);
//     res.status(500).json({
//       error: 'Failed to check subscription',
//       message: error.message
//     });
//   }
// });

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 VoiceSnap Backend Server');
  console.log('='.repeat(50));
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test Groq: http://localhost:${PORT}/test-groq`);
  console.log('\n📡 API Endpoints:');
  console.log(`   POST ${PORT}/api/process      - Full processing (transcribe + summarize)`);
  console.log(`   POST ${PORT}/api/transcribe   - Transcription only`);
  console.log(`   POST ${PORT}/api/summarize    - Summarization only`);
  console.log('\n✅ Server ready to accept requests!\n');
  console.log('Press CTRL+C to stop\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});