# Student Information Management System
Three-tier cloud app: **Netlify** (frontend) → **Render** (Node/Express API) → **MongoDB Atlas**,
plus an **MCP server** so Claude can run every CRUD operation by chat.

```
Browser ──► Netlify ──► Render API ──► MongoDB Atlas
Claude  ──► MCP server ──► Render API ──► MongoDB Atlas
```
The MCP server is just another client of the REST API. It never holds database credentials.

## Folder layout
- `backend/` Express + Mongoose API (deploy to Render)
- `frontend/` static HTML/CSS/JS (deploy to Netlify)
- `mcp-server/` MCP tools for Claude (run locally or deploy to Render)

## 1. MongoDB Atlas
1. Create a free M0 cluster.
2. Database Access → add a user with the **readWrite** role on `studentDB` only.
3. Network Access → add `0.0.0.0/0` (Render free tier has no fixed IP; the strong password is your protection).
4. Connect → Drivers → copy the `mongodb+srv://...` string and put `/studentDB` before the `?`.

## 2. Backend on Render
1. Push the project to GitHub (one repo, three folders is fine).
2. Render → New → Web Service → pick the repo, **Root Directory:** `backend`.
3. Build command `npm install`, start command `npm start`.
4. Environment variables:
   - `MONGODB_URI` = your Atlas string
   - `FRONTEND_URL` = your Netlify URL (add after step 3; redeploy)
5. Test: `GET https://<your-api>.onrender.com/api/students` should return `{"success":true,"count":0,...}`.

## 3. Frontend on Netlify
1. Edit `frontend/config.js` and set `API_BASE_URL` to your Render URL.
2. Netlify → Add new site → import the repo, **Base directory:** `frontend`, no build command, publish directory `.`
   (or drag-and-drop the `frontend` folder).
3. Copy the Netlify URL into Render's `FRONTEND_URL` and redeploy the backend (this is the CORS allow-list).

## 4. Connect Claude (MCP)
### Option A: Claude Desktop (local, simplest)
```
cd mcp-server && npm install
```
Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):
```json
{
  "mcpServers": {
    "student-management": {
      "command": "node",
      "args": ["C:/full/path/to/mcp-server/index.js"],
      "env": { "API_BASE_URL": "https://<your-api>.onrender.com" }
    }
  }
}
```
Restart Claude Desktop.

### Option B: claude.ai custom connector (remote)
1. Render → New → Web Service, **Root Directory:** `mcp-server`, build `npm install`, start `npm start`.
2. Env vars: `MCP_TRANSPORT=http`, `API_BASE_URL=https://<your-api>.onrender.com`,
   `MCP_SECRET=<long random string>`.
3. claude.ai → Settings → Connectors → Add custom connector →
   `https://<your-mcp>.onrender.com/<MCP_SECRET>/mcp`
   (custom connectors need a paid Claude plan).
4. Treat the URL as a password: anyone with it can edit student records.

### Things to say to Claude
- "Add student ST102, Priya Patil, priya@example.com, Computer Science, semester 3"
- "Show all students" / "Find students in Computer Science"
- "Move ST101 to semester 6"
- "Delete ST101"

## 5. Test checklist
| # | Test | Expected |
|---|------|----------|
| 1 | Add ST101 from the website | "Student added successfully" |
| 2 | `GET /api/students` | record appears |
| 3 | Edit semester 5 → 6 | updated in Atlas |
| 4 | Delete ST101 | gone from Atlas |
| 5 | Ask Claude "list students" after a website change | Claude sees the same data |
| 6 | Open the API from a different website origin in the browser console | blocked by CORS |

## Notes
- Render's free tier sleeps after inactivity; the first request can take about 50 seconds.
- `studentId` is the record key in URLs and cannot be edited after creation.
- Local run: `cd backend && cp .env.example .env && npm install && npm run dev`, then open `frontend/index.html`
  (add `http://localhost:5500` or similar to `EXTRA_ORIGINS` if serving the frontend locally).
