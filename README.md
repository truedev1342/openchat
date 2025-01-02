# OpenChat

An open-source, self-hostable team chat workspace — think Slack, but yours. Built
with Next.js, Supabase, and LiveKit.

## Features

- **Channels & direct messages** — public/private channels, group DMs, and browse/join flows
- **Real-time messaging** — powered by Supabase realtime, with typing presence and read state
- **Threads & reactions** — reply in threads and react with emoji
- **Rich composer** — mentions, code blocks, and slash commands
- **Voice & video calls** — 1:1 and group calls via LiveKit, with incoming-call banners
- **Search** — full-text search across messages and channels
- **Saved items & activity** — bookmark messages and track mentions/activity
- **Scheduled messages** — write now, send later
- **Workspaces & members** — invite links, roles, and per-workspace settings
- **Webhooks & bots** — incoming webhooks and bot integrations
- **Guided setup** — a `/setup` wizard provisions your database schema automatically

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) — Postgres, auth, storage, and realtime
- [LiveKit](https://livekit.io/) — WebRTC voice/video
- [Tailwind CSS 4](https://tailwindcss.com/) + shadcn/ui components
- [Zustand](https://github.com/pmndrs/zustand) for client state

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project (free tier works)
- _(Optional)_ A [LiveKit](https://cloud.livekit.io/) project for calls

### 1. Install

```bash
git clone https://github.com/softdev1012/openchat.git
cd openchat
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in your Supabase URL and anon key. See [.env.example](.env.example) for the full
list of variables. LiveKit credentials are configured per-workspace in the admin UI.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch, the setup wizard at
[/setup](http://localhost:3000/setup) will provision the database schema and create your
first workspace.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
