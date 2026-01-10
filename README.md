# 🎙️ Voice Memo Cleaner

Transform your voice memos into actionable insights with AI-powered transcription and summarization.

## 🌟 Features

- **🎤 One-Tap Recording** - Start recording instantly
- **⚡ AI Transcription** - Convert speech to text in seconds (Groq Whisper)
- **✨ Smart Summaries** - Get 3 key points automatically (Llama 3.3 70B)
- **📋 Action Items** - Extract clear next steps from your memos
- **📧 Email Drafts** - Generate professional email drafts
- **💾 History** - Access all your past recordings
- **🔒 Private & Secure** - Your data stays protected

## 💰 Pricing

- **Free**: 5 recordings per month
- **Premium**: $4.99/month - Unlimited recordings + advanced features

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
- Stripe (Payments)

### Infrastructure
- Supabase (FREE tier)
- Groq API (FREE tier - 14,400 requests/day)
- Total cost: **$99/year** (just Apple Developer account!)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Apple Developer Account ($99/year)
- Groq API key (free at console.groq.com)
- Supabase account (free at supabase.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/voice-memo-cleaner.git
cd voice-memo-cleaner

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

Scan the QR code with your phone to test the app.

## 📱 Building for iOS

```bash
# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for TestFlight
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

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

## 🔐 Environment Variables

### Frontend (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GROQ_API_KEY=gsk_...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Backend (backend/.env)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (SECRET!)
GROQ_API_KEY=gsk_...
STRIPE_SECRET_KEY=sk_test_...
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

### Test Backend
```bash
cd backend
npm test
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Test Groq connection
curl http://localhost:3000/test-groq

# Test summarization
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Test transcript here"}'
```

## 📈 Performance

- **Transcription**: ~5-10 seconds for 1-minute audio
- **Summarization**: ~2-3 seconds
- **Total processing**: ~10-15 seconds per recording
- **API Rate Limits**:
    - Groq Chat: 14,400 requests/day (FREE)
    - Groq Whisper: 7,200 seconds/day (FREE)

## 🐛 Common Issues

### "Cannot connect to backend"
- Ensure backend is running (`cd backend && npm start`)
- Check your local IP in `EXPO_PUBLIC_API_URL`
- Verify firewall isn't blocking port 3000

### "Groq API error"
- Check API key is valid at console.groq.com
- Verify `.env` files have correct keys
- Check rate limits in Groq dashboard

### "Recording upload fails"
- Check `backend/uploads/` folder exists
- Verify file permissions: `chmod 755 backend/uploads`
- Check file size limit (default 25MB)

## 📝 Development Roadmap

- [x] Basic recording functionality
- [x] AI transcription (Groq Whisper)
- [x] AI summarization (Llama 3.3)
- [x] User authentication
- [x] Database integration
- [ ] Stripe payment integration
- [ ] App Store submission
- [ ] Marketing website
- [ ] Beta testing program

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Groq for blazing-fast AI inference
- Supabase for backend infrastructure
- Expo for mobile development platform
- OpenAI for Whisper model architecture

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using open-source technologies**

Total cost: ~$99/year • Time to build: 6-8 weeks • Potential revenue: $499+ MRR