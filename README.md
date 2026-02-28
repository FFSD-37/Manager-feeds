# Feeds Manager

This repository contains:

- Manager Server: Node.js backend for moderation workflows
- Manager Client: React.js frontend

## Run Manager Server

```bash
cd manager-server
npm install
npm run dev
```

Default URL: `http://localhost:3001`

## Run Manager Client

```bash
cd manager-client
npm install
npm run dev
```

## Notes

- Managers can access moderation routes only.
- Managers cannot access admin-only manager-management APIs.
- Copy `.env-example` to `.env` in `manager-server` before running.
