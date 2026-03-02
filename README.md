# Feeds Manager

This repository contains:

- Manager Server: Node.js backend for role-scoped manager operations
- Manager Client: React.js frontend

## Manager Types

- `users`: handles normal users, kids accounts, and channels
- `posts`: handles report queues and post moderation
- `feedback and revenue`: handles feedback, contact flow, and revenue/payments

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
- Each manager sees only the modules assigned to their type.
- Clicking a report in manager client opens an overlay with report details and post preview (when available).
- Copy `.env-example` to `.env` in `manager-server` before running.

## Report IDs

- `1`: normal/kids account report
- `2`: channel account report
- `3`: normal/kids post report
- `4`: channel post report
- `5`: normal chat report
- `6`: channel chat report
