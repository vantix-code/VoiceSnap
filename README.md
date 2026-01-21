# 🎙️ VoiceSnap

Transform your voice memos into actionable insights with AI-powered transcription and summarization.

## 🌟 Features

- **🎤 One-Tap Recording** - Start recording instantly
- **⚡ AI Transcription** - Convert speech to text in seconds (Groq Whisper)
- **✨ Smart Summaries** - Get 3 key points automatically (Llama 3.3 70B)
- **📋 Action Items** - Extract clear next steps from your memos
- **📧 Email Drafts** - Generate professional email drafts
- **💾 History** - Access all your past recordings
- **🔒 Private & Secure** - Your data stays protected


## 🛠️ Tech Stack

### Frontend (Mobile)
- React Native + Expo
- React Navigation
- Supabase (Auth + Database + Storage)
- React Native Paper (UI)
- Expo AV (Audio recording)

### Backend (API)
- Node.js + Express
- Groq API (Whisper Large v3 + Llama 3.3 70B)
- Supabase (PostgreSQL)

### Infrastructure
- Supabase (FREE tier)
- Groq API (FREE tier - 14,400 requests/day)
- Total cost: **$0/month** (switching to Android - $25 one-time Google Play fee)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Groq API key (free at console.groq.com)
- Supabase account (free at supabase.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/voicesnap.git
cd voicesnap

# Install frontend dependencies
npm install

# Setup backend
cd backend
npm install
cd ..

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Configure backend
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
npx expo start
```

Scan the QR code with Expo Go app on your phone to test.

## 🗄️ Database Schema

### profiles
```sql
id                    uuid (references auth.users)
email                 text
full_name             text
subscription_status   text (default: 'free')
subscription_end_date timestamp
recordings_this_month int (default: 0)
created_at            timestamp
```

### recordings
```sql
id          uuid (primary key)
user_id     uuid (references auth.users)
audio_url   text (Supabase Storage URL)
duration    int (seconds)
transcript  text (Groq Whisper output)
summary     jsonb ({bullets, action, email})
created_at  timestamp
```

## 📊 API Endpoints

### POST /api/process
Full processing pipeline (transcribe + summarize)
```bash
curl -X POST http://localhost:3000/api/process \
  -F "audio=@recording.m4a" \
  -F "userId=user-123" \
  -F "recordingId=rec-456"
```

### POST /api/transcribe
Transcription only
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@recording.m4a"
```

### POST /api/summarize
Summarization only (text input)
```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Your text here..."}'
```

### GET /health
Health check
```bash
curl http://localhost:3000/health
```

### GET /test-groq
Test Groq API connection
```bash
curl http://localhost:3000/test-groq
```

## 🔐 Environment Variables

### Frontend (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000
```

### Backend (backend/.env)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (SECRET!)
GROQ_API_KEY=gsk_...
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

### Test Backend
```bash
cd backend
node test-groq.js
```


## 📱 App Screens

1. **Login/Sign Up** - Email authentication via Supabase
2. **Home** - Quick record + usage stats + recent recordings
3. **Record** - One-tap recording with timer (10-minute max)
4. **Results** - Bullet points + action item + email draft
5. **History** - All past recordings with search
6. **Settings** - Profile, subscription status, logout
7. **Paywall** - Premium upgrade prompt after 5 recordings

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.



## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using open-source technologies**

