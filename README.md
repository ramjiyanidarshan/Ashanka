# Veshtit — Digital Account Manager

A secure, self-hosted digital account manager built with Next.js, MongoDB, and AES-256-GCM encryption.

## Features

- 🔐 **AES-256-GCM encryption** — all attribute values encrypted at rest
- 🗂️ **Flexible schema** — any number of custom attributes per account
- 📥 **JSON import** — import your existing JSON password file with conflict resolution
- 📤 **JSON export** — export back to the original JSON format
- 🌗 **Dark/Light theme** — toggle between modes, persisted across sessions
- 🔑 **JWT authentication** — secure login with httpOnly cookies
- 🏗️ **Monorepo** — frontend and backend as separate Next.js apps

## Project Structure

```
Veshtit/
├── frontend/          # Next.js 14 (App Router) — UI
├── backend/           # Next.js 14 (App Router) — API only
├── .env               # Shared environment variables
├── .env.example       # Template for env vars
└── package.json       # Root npm workspaces
```

## Prerequisites

- Node.js 18+
- MongoDB (running locally on port 27017, or a MongoDB Atlas connection string)

## Setup

### 1. Copy environment variables
```bash
cp .env.example .env
# Edit .env with your values
cp .env backend/.env
cp .env frontend/.env
```

### 2. Install dependencies
```bash
npm install
```

### 3. Seed the admin user
After starting the backend, visit: `http://localhost:3001/api/seed`

This creates the admin user from your `APP_USERNAME` and `APP_PASSWORD` env vars.

## Development

Run both frontend and backend simultaneously:
```bash
npm run dev
```

Or run separately:
```bash
npm run dev:backend    # Starts on http://localhost:3001
npm run dev:frontend   # Starts on http://localhost:3000
```

## First Run

1. Start both servers with `npm run dev`
2. Seed the admin user: visit `http://localhost:3001/api/seed`
3. Open `http://localhost:3000/login`
4. Login with credentials from your `.env` file
5. Start adding accounts or import your existing JSON file

## Import JSON Format

The importer accepts your existing JSON format:
```json
{
  "Service Provider 1": [
    {
      "E-Mail": "abc@example.com",
      "Mobile Number": "+910000000",
      "Password": "secret123",
      "Status": "Active",
      "Username": null
    }
  ]
}
```

## Security Notes

- Change `APP_PASSWORD`, `JWT_SECRET`, and `AES_ENCRYPTION_KEY` before any production use
- The `AES_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes)
- Generate a new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never commit your `.env` file to version control