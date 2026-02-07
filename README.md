# Nova AI

Your personal AI companion that actually gets things done.

## Vision

Nova is the AI assistant for everyone — not just power users. While tools like OpenClaw require terminal knowledge and YAML configs, Nova is designed for people who just want an AI that works.

**Key differentiators:**
- 🚀 One-click setup — no terminal, no config files
- 🎨 Beautiful, intuitive interface
- 🔌 Pre-built integrations — Gmail, Calendar, Spotify, Hue, and more
- 📱 Works everywhere — web, mobile, voice
- 🔒 Privacy-first — your data stays yours

## Tech Stack

- **Frontend:** Next.js 16 + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes + OpenAI
- **Auth:** NextAuth.js with credentials provider
- **Database:** SQLite (dev) + Prisma ORM
- **Hosting:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your OPENAI_API_KEY and NEXTAUTH_SECRET

# Set up the database
npx prisma migrate dev

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Nova.

## Environment Variables

Create a `.env.local` file with:

```env
# OpenAI
OPENAI_API_KEY=your-api-key

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Database (for Prisma)
DATABASE_URL="file:./prisma/dev.db"
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

## Roadmap

### Phase 1: MVP (Week 1-2)
- [x] Basic chat interface
- [x] OpenAI integration
- [x] User authentication (sign-in/sign-up)
- [x] Protected routes (/chat, /settings)
- [ ] Conversation persistence
- [x] Basic settings page
- [x] Onboarding flow
- [x] Landing page

### Phase 2: Integrations (Week 3-4)
- [ ] Google Calendar
- [ ] Gmail
- [ ] Philips Hue
- [ ] Spotify

### Phase 3: Polish (Week 5-6)
- [ ] Mobile responsive
- [ ] Voice input
- [ ] User preferences
- [ ] Dark/light mode

### Phase 4: Launch
- [ ] Vercel deployment
- [ ] PostgreSQL for production
- [ ] Custom domain
- [ ] Public beta

## Project Structure

```
nova-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/       # NextAuth routes
│   │   │   └── chat/       # Chat API endpoint
│   │   ├── chat/           # Chat page
│   │   ├── settings/       # Settings page
│   │   ├── sign-in/        # Sign in page
│   │   ├── sign-up/        # Sign up page
│   │   ├── onboarding/     # Onboarding flow
│   │   ├── page.tsx        # Landing page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable UI components
│   ├── lib/               # Utilities and helpers
│   │   ├── auth.ts        # NextAuth configuration
│   │   └── prisma.ts      # Prisma client singleton
│   └── types/             # TypeScript type extensions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── public/                # Static assets
└── .env.local            # Environment variables (not committed)
```

## Database Schema

The app uses three main models:

- **User** - User accounts with email/password auth
- **Conversation** - Groups of messages (chat sessions)
- **Message** - Individual chat messages (user/assistant/system)

Run `npx prisma studio` to visually explore and edit your database.

## Authentication

The app uses NextAuth.js with a credentials provider. Users can:

1. Sign up with email and password
2. Sign in to access protected routes
3. Protected routes: `/chat`, `/settings`
4. Auth pages redirect to `/chat` if already signed in

## Contributing

This is a private project for now. More details coming soon.

## License

Proprietary — All rights reserved.

---

Built with ❤️ by Dorel & Jarvis
