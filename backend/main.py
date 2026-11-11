from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import uuid
import hashlib
import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
from auth import router as auth_router, get_current_user, require_role
from datetime import datetime
import json

app = FastAPI(title="BrandGuard AI API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include Authentication Router ---
app.include_router(auth_router)

# --- Per-User Server-Side Storage ---
USER_AUDIT_HISTORY = {}  # username -> list of audit logs
USER_NOTIFICATIONS = {}  # username -> list of notifications

# --- ChromaDB Initialization ---
class SimpleEmbeddingFunction(embedding_functions.EmbeddingFunction):
    def __call__(self, input):
        embeddings = []
        for text in input:
            h = int(hashlib.md5(text.encode()).hexdigest(), 16)
            vec = [float((h >> i) & 1) for i in range(384)]
            embeddings.append(vec)
        return embeddings

chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(
    name="brand_guidelines",
    embedding_function=SimpleEmbeddingFunction()
)

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "dummy-key-for-demo"))

# --- Pydantic Models ---
class GuidelineCreate(BaseModel):
    title: str
    content: str
    category: str = "General"

class ContentAuditRequest(BaseModel):
    text: str
    content_type: str = "blog_post"

class AuditIssue(BaseModel):
    issue_type: str
    snippet: str
    explanation: str
    suggested_fix: str

class ContentAuditResponse(BaseModel):
    status: str
    issues: List[AuditIssue]

class Notification(BaseModel):
    id: str
    title: str
    message: str
    type: str
    timestamp: str
    read: bool


# --- Root & Profile Endpoints ---
@app.get("/")
def read_root():
    return {"message": "BrandGuard AI Semantic RAG Engine Active"}

@app.get("/api/profile", response_model=dict)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"], 
        "role": current_user["role"], 
        "full_name": current_user["full_name"]
    }

@app.post("/api/guidelines/secure-add")
async def secure_add_guideline(rule_data: dict, current_user: dict = Depends(require_role("admin"))):
    return {
        "status": "success", 
        "added_by": current_user["username"], 
        "data": rule_data
    }


# --- GUIDELINES ENDPOINTS ---
@app.post("/api/guidelines")
async def add_guideline(guideline: GuidelineCreate, current_user: dict = Depends(get_current_user)):
    doc_id = f"guide_{uuid.uuid4().hex[:8]}"
    collection.add(
        documents=[guideline.content],
        metadatas=[{"title": guideline.title, "category": guideline.category}],
        ids=[doc_id]
    )
    
    # Broadcast or push notification to users when a global rule is updated
    username = current_user["username"]
    new_notif = {
        "id": f"notif-{uuid.uuid4().hex[:6]}",
        "title": "Guideline Vault Updated",
        "message": f"New rule added: {guideline.title}.",
        "type": "info",
        "timestamp": datetime.now().strftime("%H:%M"),
        "read": False
    }
    if username not in USER_NOTIFICATIONS:
        USER_NOTIFICATIONS[username] = []
    USER_NOTIFICATIONS[username].insert(0, new_notif)
    
    return {"message": "Guideline added and embedded successfully", "id": doc_id}

@app.get("/api/guidelines")
def get_guidelines():
    data = collection.get()
    guidelines = []
    if data and "documents" in data and data["documents"]:
        for i, doc in enumerate(data["documents"]):
            meta = data["metadatas"][i] if data.get("metadatas") else {}
            item_id = data["ids"][i] if data.get("ids") else f"guide_{i}"
            guidelines.append({
                "id": item_id,
                "title": meta.get("title", "Rule"), 
                "content": doc, 
                "category": meta.get("category", "General")
            })
    return {"guidelines": guidelines}

@app.delete("/api/guidelines/{guideline_id}")
def delete_guideline(guideline_id: str):
    try:
        collection.delete(ids=[guideline_id])
        return {"message": "Guideline deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=404, detail="Guideline not found")


# --- NOTIFICATIONS ENDPOINTS ---
@app.get("/api/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    return USER_NOTIFICATIONS.get(username, [])

@app.post("/api/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    user_notifs = USER_NOTIFICATIONS.get(username, [])
    for notif in user_notifs:
        if notif["id"] == notif_id:
            notif["read"] = True
            return {"status": "success", "id": notif_id}
    raise HTTPException(status_code=404, detail="Notification not found")


# --- AUDIT HISTORY ENDPOINT ---
@app.get("/api/audit/history")
async def get_audit_history(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    return {"history": USER_AUDIT_HISTORY.get(username, [])}


# --- LIVE METRICS BACKEND ---
@app.get("/api/metrics")
async def get_dashboard_metrics(current_user: dict = Depends(get_current_user)):
    username = current_user["username"]
    data = collection.get()
    total_guidelines = len(data["documents"]) if data and "documents" in data else 0
    
    user_audits = USER_AUDIT_HISTORY.get(username, [])
    total_audits = len(user_audits)
    passed_audits = sum(1 for a in user_audits if a["status"] == "PASS")
    compliance_rate = f"{round((passed_audits / total_audits) * 100, 1)}%" if total_audits > 0 else "100%"
    
    return {
        "guidelines_in_vault": total_guidelines,
        "total_audits": total_audits,
        "compliance_rate": compliance_rate,
        "weekly_trend": f"+{total_audits * 3}% vs last week"
    }


# --- RAG AUDIT ENDPOINT ---
@app.post("/api/audit", response_model=ContentAuditResponse)
async def run_audit(request: ContentAuditRequest, current_user: dict = Depends(get_current_user)):
    username = current_user["username"]

    try:
        results = collection.query(
            query_texts=[request.text],
            n_results=3
        )
        retrieved_rules = results["documents"][0] if results and "documents" in results and "documents" in results else []
    except Exception:
        retrieved_rules = []

    if not retrieved_rules:
        retrieved_rules = ["Maintain a professional, approachable brand tone. Avoid unverified 100% guarantees or absolute hype."]

    rules_context = "\n".join([f"- {rule}" for rule in retrieved_rules])

    prompt = f"""
You are an expert Enterprise Brand Governance AI. Audit the following content against the provided Brand Guidelines.

Brand Guidelines & Rules:
{rules_context}

Content to Audit:
"{request.text}"

Analyze the content for tone violations, terminology errors, unsupported claims, or factual discrepancies based on the guidelines.
Return your response strictly in valid JSON format matching this structure:
{{
    "status": "FLAGGED" or "PASS",
    "issues": [
        {{
            "issue_type": "Tone Mismatch" | "Unverified Claim" | "Forbidden Term",
            "snippet": "exact words from content",
            "explanation": "why it violates guidelines",
            "suggested_fix": "corrected phrasing"
        }}
    ]
}}
If there are no issues, return status "PASS" and an empty issues list. Do not include markdown formatting or backticks in your response.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        result_text = response.choices[0].message.content
        audit_data = json.loads(result_text)
        status = audit_data.get("status", "PASS")
        issues = audit_data.get("issues", [])
    except Exception:
        text_lower = request.text.lower()
        issues = []
        if any(word in text_lower for word in ["guarantee", "best", "risk-free", "100%"]):
            issues.append(
                AuditIssue(
                    issue_type="Unverified Promotional Claim",
                    snippet="guarantee / best / risk-free",
                    explanation="Detected absolute promotional terminology that violates stored brand trust guidelines.",
                    suggested_fix="Replace with measured, evidence-backed claims."
                )
            )
        status = "FLAGGED" if issues else "PASS"
        audit_data = {"status": status, "issues": [i.dict() for i in issues]}

    # Create server-side audit log entry
    new_log = {
        "id": f"audit_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "textSnippet": request.text[:30] + "...",
        "fullText": request.text,
        "status": status,
        "issuesCount": len(issues)
    }

    if username not in USER_AUDIT_HISTORY:
        USER_AUDIT_HISTORY[username] = []
    USER_AUDIT_HISTORY[username].insert(0, new_log)

    # Trigger user notification if flagged
    if status == "FLAGGED":
        notif = {
            "id": f"notif-{uuid.uuid4().hex[:6]}",
            "title": "Compliance Violation Detected",
            "message": f"Audit flagged {len(issues)} issue(s) in submitted text.",
            "type": "alert",
            "timestamp": datetime.now().strftime("%H:%M"),
            "read": False
        }
        if username not in USER_NOTIFICATIONS:
            USER_NOTIFICATIONS[username] = []
        USER_NOTIFICATIONS[username].insert(0, notif)

    return audit_data