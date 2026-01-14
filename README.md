# GigFlow

Mini freelance marketplace where any user can post gigs and bid on others. Hiring is atomic and role-free: ownership and permissions are derived from data, not roles.

## Stack
- Frontend: React (Vite), React Router, Redux Toolkit, Tailwind CSS, Axios, Clerk
- Backend: Node.js, Express, MongoDB (Mongoose), Clerk JWT auth, Socket.io (optional notifications)

## Architecture
- Separation of concerns: Express controllers for business logic, Mongoose models for persistence, React pages/hooks for data fetching and state, UI primitives in `client/src/components/ui/`, domain components in `client/src/components/domain/`.
- Backend is the source of truth: frontend derives capabilities from gig ownership/status and backend responses; no role flags on users.

## Authentication
- Clerk handles identity and session tokens. Backend verifies Clerk JWT (Bearer token) and maps `clerkUserId` to MongoDB `User` documents. HttpOnly cookies plus Authorization header keep requests secure. Authorization (ownership checks, unique bid constraints, hiring) remains backend-enforced.

## Core Business Logic
- Gigs: create/list (public list shows open gigs). Detail fetch populates owner `{ id, name, email }`.
- Bids: one bid per user per gig (unique index). Owners only can view bids for their gig.
- Hiring: PATCH `/api/bids/:bidId/hire` runs a MongoDB transaction to (1) mark gig assigned, (2) mark selected bid hired, (3) reject all other pending bids. Prevents race conditions; optional socket notification to hired freelancer.

## Frontend Ownership Handling
- No roles stored on users. Ownership inferred by comparing `gig.owner.id` to the authenticated user id; bid visibility/actions depend on backend responses. Disabled states follow gig status and backend truth (e.g., gig assigned, duplicate bid conflict).

## API Surface
- GET `/health` — health check
- GET `/api/gigs` — list open gigs (optional `search` query)
- GET `/api/gigs/:id` — gig detail (public)
- POST `/api/gigs` — create gig (auth)
- POST `/api/bids` — create bid (auth)
- GET `/api/bids/:gigId` — list bids for gig (owner only)
- PATCH `/api/bids/:bidId/hire` — hire freelancer (owner only, atomic)

## Running Locally
Backend
```bash
cd server
npm install
cp .env.example .env
# set MONGODB_URI, CLERK_SECRET_KEY
npm run dev
```

Frontend
```bash
cd client
npm install
cp .env.example .env
# set VITE_CLERK_PUBLISHABLE_KEY and VITE_API_BASE_URL (e.g., http://localhost:5000)
npm run dev
```

## Tradeoffs & Future Improvements
- Pagination and filtering for gigs/bids to reduce payloads.
- RTK Query or SWR for caching and request deduping.
- E2E and load tests around hiring transaction paths.
- Rate limiting and audit logging on auth-sensitive endpoints.
- More robust error surfaces and optimistic UI for bid submission/hiring.
