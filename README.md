# Cosmo AI

Your personal AI companion that actually gets things done.

## Vision

Cosmo is the AI assistant for everyone — not just power users. While tools like OpenClaw require terminal knowledge and YAML configs, Cosmo is designed for people who just want an AI that works.

**Key differentiators:**
- 🚀 One-click setup — no terminal, no config files
- 🎨 Beautiful, intuitive interface
- 🔌 Pre-built integrations — Gmail, Calendar, Spotify, Hue, and more
- 📱 Works everywhere — web, mobile, voice
- 🔒 Privacy-first — your data stays yours

## Tech Stack

- **Frontend:** Next.js 16 + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes + OpenAI
- **Auth:** (coming soon) NextAuth.js
- **Database:** (coming soon) Postgres + Prisma
- **Hosting:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your OPENAI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Cosmo.

## Roadmap

### Phase 1: MVP (Week 1-2)
- [x] Basic chat interface
- [x] OpenAI integration
- [ ] User authentication
- [ ] Conversation persistence
- [ ] Basic settings page

### Phase 2: Integrations (Week 3-4)
- [ ] Google Calendar
- [ ] Gmail
- [ ] Philips Hue
- [ ] Spotify

### Phase 3: Polish (Week 5-6)
- [ ] Mobile responsive
- [ ] Voice input
- [ ] Onboarding flow
- [ ] Landing page

### Phase 4: Launch
- [ ] Vercel deployment
- [ ] Custom domain
- [ ] Public beta

## Project Structure

```
cosmo-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/       # Chat API endpoint
│   │   ├── page.tsx        # Main chat interface
│   │   ├── layout.tsx      # Root layout
│   │   └── globals.css     # Global styles
│   ├── components/         # Reusable UI components (coming)
│   └── lib/               # Utilities and helpers (coming)
├── public/                # Static assets
└── .env.local            # Environment variables (not committed)
```

## Contributing

This is a private project for now. More details coming soon.

## License

Proprietary — All rights reserved.

---

Built with ❤️ by Dorel & Jarvis
