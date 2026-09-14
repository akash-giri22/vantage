# Vantage — Job Search Cockpit

Real project, matching the agreed stack:
- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Python (FastAPI)
- **AI:** Google Gemini API (free tier) for ATS scoring + JD tailoring
- **Job listings:** Adzuna API (free tier)
- **Auth/Storage/Notifications:** Firebase (to be wired in `frontend`)
- **Database:** PostgreSQL (Supabase or Neon, free tier)

This currently ships with mock/fallback data everywhere a real integration
(Firebase Auth, Postgres, Playwright automation) hasn't been wired up yet —
each spot is marked with a `TODO` comment. The UI and API shape are real and
match what we designed; only the live data sources are pending your API keys.

## Run the frontend locally

```
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```
Opens at http://localhost:3000

## Run the backend locally

```
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in GEMINI_API_KEY etc. as you get them
uvicorn main:app --reload
```
Runs at http://localhost:8000 — visit /docs for interactive API docs.

## What's real vs. mock right now

| Feature | Status |
|---|---|
| Resume upload → text extraction | Real (pdfplumber / python-docx) |
| ATS scoring | Real once `GEMINI_API_KEY` is set; heuristic fallback otherwise |
| JD tailoring | Real once `GEMINI_API_KEY` is set |
| Job listings | Real once `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` are set; demo data otherwise |
| Semi-auto apply | Stubbed — counts against the daily cap but doesn't run Playwright yet |
| Login/auth | UI only — Firebase Auth not wired in yet |
| Application tracker | Demo data — needs a database table + queries |

## Next steps (in order)

1. Get a free Gemini API key → https://aistudio.google.com/app/apikey
2. Get free Adzuna API credentials → https://developer.adzuna.com/
3. Create a free Postgres database (Supabase or Neon) and a Firebase project
   (Auth + Storage + Cloud Messaging)
4. Wire Firebase Auth into `frontend/pages/index.js`
5. Add the Playwright automation flow in `backend/routers/jobs.py`
6. Deploy backend to Render, frontend to Firebase Hosting, connect via GitHub Actions
