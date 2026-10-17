# ProveIt

ProveIt is a two-part application for evaluating candidates through practical work and a spoken follow-up. Candidates complete a timed task, defend their answer, and can receive a score and a shareable verification badge. The repository keeps the React frontend and the Node API in separate folders.

## Repository layout

```text
prove it/
├── frontend/                 React 18 + Vite client
│   ├── src/
│   │   ├── components/       Candidate panel and defense step
│   │   ├── lib/              API client, local storage, shared hooks
│   │   └── pages/            Home, challenge, candidate, result, badge pages
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/                  Express + Mongoose API
    ├── src/
    │   ├── routes/           Challenge, submission, and badge route modules
    │   ├── middleware.js     Database loaders and owner-key checks
    │   ├── models.js         Challenge and submission schemas
    │   ├── server.js          Express app and MongoDB startup
    │   └── util.js            Shared AI/data helpers
    ├── .env                  Local configuration and secrets
    ├── .env.example          Configuration template
    └── package.json
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB URI you can access

## First-time setup

Install each app’s dependencies from its own folder:

```sh
cd backend
npm install
cd ../frontend
npm install
```

The backend reads configuration from `backend/.env`. A local `.env` is already present in this checkout. For a fresh checkout, create it from the template:

```sh
cp backend/.env.example backend/.env
```

Set a private, long random value for `BADGE_SECRET` before using real badges. Keep `.env` private and do not commit it. The current local configuration uses `AI_MOCK=1` and leaves provider credentials empty.

### Environment variables

| Variable | Purpose | Default/template value |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/proveit` |
| `BADGE_SECRET` | Secret used to sign/verify badges | Set a long random secret |
| `PUBLIC_URL` | Public frontend origin used by the backend | `http://localhost:5173` |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Primary OpenAI-compatible AI provider | Empty in the template |
| `AI2_BASE_URL`, `AI2_API_KEY`, `AI2_MODEL` | Optional fallback provider | Empty in the template |
| `AI3_BASE_URL`, `AI3_API_KEY`, `AI3_MODEL` | Optional third provider | Empty in the template |
| `AI_MOCK` | `1` uses canned AI responses; `0` allows provider calls | `1` for local demo setup |
| `AI_FALLBACK_MOCK` | Fall back to canned responses if all providers fail | `1` |
| `GRADE_RUNS` | Number of grading runs used for comparison | `3` |
| `AI_TIMEOUT_MS` | Timeout for an AI request | `45000` |

Provider base URLs in `.env.example` are examples; check the provider’s current documentation before configuring a live integration.

## Run locally

Start MongoDB first. Then run the backend in one terminal:

```sh
cd backend
npm run dev
```

Start the frontend in another terminal:

```sh
cd frontend
npm run dev
```

Vite serves the client at [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to `http://localhost:5000`. The backend listens on port 5000 by default.

The frontend can also use a different API origin by setting `VITE_API_URL` in the frontend environment; leave it empty for the local Vite proxy.

## Health check

```sh
curl http://localhost:5000/api/health
```

Expected response with `AI_MOCK=1`:

```json
{"ok":true,"mock":true}
```

The server waits for a successful MongoDB connection before it starts listening. If MongoDB is unavailable, startup reports a `Mongo connection failed` message and exits; the health endpoint will not be available until the database is reachable.

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/post` | Create a job or founder-mode challenge |
| `/review/:id` | Review and publish a generated challenge |
| `/dashboard/:id` | Review candidates, shortlist, adjust scores, and endorse |
| `/c/:id` | Candidate task and timed answer flow |
| `/result/:sid` | Candidate score, evidence, and next steps |
| `/badge/:badgeId` | Public badge verification page |
| `/feed` | Opportunity feed placeholder |

The frontend stores a challenge owner key and candidate session in browser local storage so the poster can return to the private review pages and a candidate can resume an attempt in the same browser.

## Current implementation status

The Express app, MongoDB models, owner-key middleware, CORS/JSON setup, and health endpoint are implemented. The API includes challenge generation and publishing, candidate submissions and follow-up grading, owner review actions, skill-gap plans, and signed public badges. Set `AI_MOCK=1` for a demo without provider credentials; set `AI_FALLBACK_MOCK=1` to allow mock responses when configured providers fail.

## Troubleshooting

- **`Mongo connection failed: connect ECONNREFUSED 127.0.0.1:27017`**: Start MongoDB or update `MONGO_URI` in `backend/.env`.
- **Health check cannot connect to port 5000**: Confirm the backend started successfully and that `PORT` is not in use by another process.
- **Health response says `"mock":false`**: Set `AI_MOCK=1` in `backend/.env` and restart the backend. The health field only reports this setting; it does not confirm that AI providers are configured.
- **Frontend API requests return 404**: Confirm the backend started successfully and the frontend is using the correct API origin.
