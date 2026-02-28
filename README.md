# Feeds Manager

This repository contains:

- Manager Server: Node.js backend for role-scoped manager operations
- Manager Client: React.js frontend

## Manager Types

- `user` manager: handles normal users, feedback, reports, and moderation
- `channel` manager: handles channels, reports, feedback, and moderation
- `kids` manager: handles kids accounts, reports, feedback, and moderation
- `revenue` manager: handles payments and revenue analytics

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

- Manager access is enforced by `managerType` from the backend.
- Report queues are filtered by manager type scope.
- Clicking a report in manager client opens an overlay with report details and post preview (when available).
- Copy `.env-example` to `.env` in `manager-server` before running.
