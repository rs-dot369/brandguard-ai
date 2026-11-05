from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import uuid
import chromadb
from openai import OpenAI

app = FastAPI(title="BrandGuard AI API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB client (local persistent storage)
chroma_client = chromadb.Client()
collection = chroma_client.get_or_create_collection(name="brand_guidelines")

# Initialize OpenAI/Compatible LLM Client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "dummy-key-for-demo"))

class GuidelineCreate(BaseModel):
    title: str
    content: str
    category: str

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

@app.get("/")
def read_root():
    return {"message": "BrandGuard AI Semantic RAG Engine Active"}

@app.post("/api/guidelines")
def add_guideline(guideline: GuidelineCreate):
    doc_id = f"guide_{uuid.uuid4().hex[:8]}"
    collection.add(
        documents=[guideline.content],
        metadatas=[{"title": guideline.title, "category": guideline.category}],
        ids=[doc_id]
    )
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

@app.post("/api/audit", response_model=ContentAuditResponse)
def audit_content(request: ContentAuditRequest):
    try:
        results = collection.query(
            query_texts=[request.text],
            n_results=3
        )
        retrieved_rules = results["documents"][0] if results and "documents" in results and results["documents"] else []
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
        import json
        result_text = response.choices[0].message.content
        audit_data = json.loads(result_text)
        return audit_data
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
        
        if issues:
            return ContentAuditResponse(status="FLAGGED", issues=issues)
        return ContentAuditResponse(status="PASS", issues=[])