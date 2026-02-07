# Nova AI - Product Vision

## The Problem

AI assistants today fall into two camps:

1. **Consumer chatbots** (ChatGPT, Claude) — Great at conversation, useless at action
2. **Power-user tools** (OpenClaw, n8n) — Can do things, but require technical setup

The gap: **No AI assistant that actually does things AND is easy to use.**

## The Solution

Nova is the AI companion that:
- **Just works** — Download, sign in, done
- **Actually does things** — Controls your smart home, manages your calendar, sends emails
- **Feels human** — Not a corporate chatbot, an actual companion

## Target User

**Primary:** Tech-curious non-developers (30-50)
- Has smart home devices but uses them at 10% capability
- Uses Google Calendar but forgets half their appointments
- Wishes they had a personal assistant but can't afford one
- Would pay $20/month for something that saves them 30 min/day

**Secondary:** Developers who want turnkey
- Could build it themselves, but don't have time
- Values "it just works" over customization
- Already has OpenClaw/Home Assistant/etc but wants simpler

## Core Features (MVP)

### Phase 1: Foundation
- [x] Chat interface with streaming
- [x] Landing page
- [x] Onboarding flow
- [x] Settings page
- [ ] User authentication (NextAuth)
- [ ] Conversation persistence (Postgres)
- [ ] Basic user preferences

### Phase 2: Calendar & Email
- [ ] Google Calendar OAuth
- [ ] View upcoming events
- [ ] Create/modify events
- [ ] Gmail OAuth
- [ ] Read email summaries
- [ ] Draft and send emails

### Phase 3: Smart Home
- [ ] Philips Hue integration
- [ ] Light control (on/off, brightness, color)
- [ ] Scene activation
- [ ] Sonos integration (stretch)

### Phase 4: Polish & Launch
- [ ] Mobile responsive
- [ ] Voice input (Web Speech API)
- [ ] Notifications
- [ ] Onboarding improvements
- [ ] Public beta launch

## Differentiators

| Feature | Nova | ChatGPT | OpenClaw |
|---------|-------|---------|----------|
| No setup required | ✅ | ✅ | ❌ |
| Controls smart home | ✅ | ❌ | ✅ |
| Manages calendar | ✅ | Plugin | ✅ |
| Works offline | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | ✅ |
| Price | $20/mo | $20/mo | Free |

## Business Model

**Freemium:**
- Free: 50 messages/day, basic integrations
- Pro ($20/mo): Unlimited messages, all integrations, priority support
- Team ($50/mo): Shared workspace, admin controls

**Why people will pay:**
- Time savings (30+ min/day for active users)
- Convenience (single interface for everything)
- Joy (actually pleasant to use)

## Technical Stack

- **Frontend:** Next.js 16 + React + TypeScript + Tailwind
- **Backend:** Next.js API Routes
- **AI:** OpenAI GPT-4o-mini (upgradeable)
- **Auth:** NextAuth.js
- **Database:** Postgres + Prisma
- **Hosting:** Vercel
- **Integrations:** OAuth2 for each service

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| OpenAI costs | Start with GPT-4o-mini, upgrade path |
| Integration maintenance | Start with stable APIs (Google, Hue) |
| Competition | Focus on UX, not features |
| User trust | Transparent data practices, local-first where possible |

## Success Metrics

**Launch (Month 1):**
- 1,000 signups
- 100 daily active users
- 10 paying customers

**Growth (Month 3):**
- 10,000 signups
- 1,000 DAU
- 100 paying customers
- 90% retention

**Scale (Month 6):**
- 50,000 signups
- 5,000 DAU
- 500 paying customers
- Break-even on infrastructure

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | MVP chat + auth + persistence |
| 2 | Google Calendar integration |
| 3 | Gmail integration |
| 4 | Philips Hue integration |
| 5 | Polish + mobile |
| 6 | Private beta launch |
| 8 | Public beta |

---

*Built with ❤️ by Dorel & Jarvis*
*Started: February 6, 2026*
