# BrandGuard AI 🛡️
> Enterprise Brand Governance & Automated Compliance Gateway

BrandGuard AI is an autonomous, RAG-powered governance platform designed to protect brand reputation, enforce tone consistency, and audit enterprise content against proprietary guidelines in real-time.

---

## 🚀 Live Demo & Access
* **Frontend Application (Vercel):** [https://brandguard-ai-lyart.vercel.app](https://brandguard-ai-lyart.vercel.app)
* **Backend API (Render):** [https://brandguard-ai-backend-m9r2.onrender.com](https://brandguard-ai-backend-m9r2.onrender.com)

### 🔑 Demo Credentials (Test Accounts)
Try logging in with our pre-configured roles to test role-based access control (RBAC):
* **Administrator:** `admin@brandguard.ai` / `admin123` *(Full access: manage vault guidelines, run audits, view history)*
* **Editor / Reviewer:** `editor@brandguard.ai` / `editor123` *(Restricted viewer mode: run audits, view vault guidelines, export reports)*

---

## 🛠️ Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons, TypeScript
* **Backend:** FastAPI (Python), Uvicorn, Pydantic, JWT Authentication
* **Vector Store & RAG:** ChromaDB (Embedding-powered semantic search & retrieval pipeline)
* **LLM Engine:** OpenAI GPT-3.5-turbo (with robust rule-based fallback handlers)
* **Deployment:** Vercel (Frontend) & Render (Backend)

---

## ✨ Key Features Built for Round 3
1. **ChromaDB Vector Vault:** Store, embed, and retrieve brand guidelines dynamically for semantic RAG auditing.
2. **AI Compliance Scanner:** Instantly flag tone mismatches, unverified 100% claims, and forbidden terminology with actionable fixes.
3. **Server-Side User Isolation:** Secure, user-specific audit histories and real-time notification feeds that persist across standard and Incognito sessions.
4. **Role-Based Access Control (RBAC):** Strict differentiation where Administrators govern vault rules and Editors operate secure auditing workflows.
5. **Interactive Reviewer Workflows:** Instant one-click issue ignoring, fix application, and compliance override/approval states with downloadable reports.

---

## ⚙️ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/brandguard-ai.git
cd brandguard-ai
```
### 2. Run the Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On macOS/Linux: source venv/bin/activate
# Note: If PowerShell gives a script execution warning, run Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process  first, then run the activate command again
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
### 3. Run the Frontend (Next.js)
```bash
cd ../frontend
npm install
npm run dev
# Note: If PowerShell gives a script execution warning, run Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process  first, then run the activate command again
```
Open http://localhost:3000 in your browser.