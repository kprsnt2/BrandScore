# BrandPulse AI

**Check your brand's AI visibility. See what AI models say about you and get your LLMO Score.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kprsnt2/BrandPulseAI)

---

## ✨ Features

- 🔍 **Multi-Model Analysis** - Query Gemini & Claude simultaneously
- 📊 **LLMO Score** - Get a 0-100 AI visibility score with detailed breakdown
- 🆚 **Free vs Pro Comparison** - Compare responses between model tiers
- ⚔️ **Competitor Analysis** - Compare your AI visibility against competitors
- 📋 **Copy Results** - Export your analysis with one click
- 🔒 **Rate Limited** - Protected API with 10 requests/minute limit
- ♿ **Accessible** - Full keyboard navigation and ARIA support

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Gemini API key (from [Google AI Studio](https://aistudio.google.com/))
- Anthropic API key (from [Anthropic Console](https://console.anthropic.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/kprsnt2/BrandPulseAI.git
cd BrandPulseAI

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your API keys to .env.local
# GEMINI_API_KEY=your_key
# ANTHROPIC_API_KEY=your_key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | Type check with TypeScript |

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes* | Google Gemini API key |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic Claude API key |
| `RATE_LIMIT_REQUESTS` | No | Max requests per window (default: 10) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 60000) |
| `CACHE_TTL_MS` | No | Cache TTL in ms (default: 300000) |

*At least one API key is required.

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── check-brand/   # Brand analysis endpoint
│   │   └── health/        # Health check endpoint
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout with SEO
│   └── page.tsx           # Main page
├── components/
│   ├── AIResponse.tsx     # Individual AI response card
│   ├── BrandInput.tsx     # Brand search input
│   ├── CompetitorComparison.tsx
│   ├── ErrorBoundary.tsx  # Error handling
│   ├── LLMOScore.tsx      # Score display
│   ├── LoadingSkeleton.tsx
│   ├── ModelComparison.tsx
│   └── Toast.tsx          # Notifications
└── lib/
    ├── cache.ts           # LRU cache
    ├── claude.ts          # Anthropic client
    ├── env.ts             # Environment validation
    ├── gemini.ts          # Google Gemini client
    ├── logger.ts          # Structured logging
    ├── scoring.ts         # LLMO scoring logic
    └── validation.ts      # Zod schemas
```

---

## 🔌 API Reference

### POST /api/check-brand

Analyze a brand's AI visibility.

**Request:**
```json
{
  "brand": "Apple"
}
```

**Response:**
```json
{
  "brand": "Apple",
  "score": 85,
  "responses": [...],
  "breakdown": {
    "recommendation": 35,
    "sentiment": 28,
    "prominence": 15,
    "accuracy": 7
  },
  "tips": [...],
  "meta": {
    "responseTime": 2341,
    "modelsQueried": 4,
    "timestamp": "2026-01-27T03:30:00.000Z"
  }
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-27T03:30:00.000Z",
  "uptime": 12345.67,
  "services": {
    "gemini": "configured",
    "anthropic": "configured"
  }
}
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Click the "Deploy with Vercel" button above
2. Add environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
3. Deploy!

### Cloudflare Pages

1. Build the project: `npm run build`
2. Deploy the `out` directory
3. Add environment variables in Cloudflare dashboard

### Docker (Coming Soon)

```dockerfile
# Dockerfile available in the repository
docker build -t brandpulse-ai .
docker run -p 3000:3000 --env-file .env.local brandpulse-ai
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 📚 Based On

This product is based on [LLM Recommendation Manipulation Research](https://kprsnt.in/blog/manipulating-llm-recommendations-brand-influence) showing how AI recommendations can be influenced through strategic content.

---

## 👤 Author

Built by [Prashanth Kumar Kadasi](https://kprsnt.in)

- Twitter: [@kprsnt2](https://twitter.com/kprsnt2)
- GitHub: [@kprsnt2](https://github.com/kprsnt2)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
