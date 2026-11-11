"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  History,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Trash2,
  Edit2,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://brandguard-ai-backend-m9r2.onrender.com";

interface Issue {
  issue_type: string;
  snippet: string;
  explanation: string;
  suggested_fix: string;
}

interface Guideline {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  textSnippet: string;
  fullText: string;
  status: string;
  issuesCount: number;
}

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [guidelineTitle, setGuidelineTitle] = useState("");
  const [guidelineContent, setGuidelineContent] = useState("");
  const [contentToAudit, setContentToAudit] = useState("");
  const [auditResult, setAuditResult] = useState<{ status: string; issues: Issue[] } | null>(null);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [showAllGuidelinesModal, setShowAllGuidelinesModal] = useState(false);
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  const [serverGuidelinesCount, setServerGuidelinesCount] = useState(0);

  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@brandguard.ai");
  const [userRole, setUserRole] = useState("Editor");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const router = useRouter();
  const profileRef = useRef<HTMLDivElement>(null);

  // Computed RBAC flag
  const isAdmin = userRole.toLowerCase() === "admin";

  // --- ALL HOOKS DECLARED UNCONDITIONALLY AT THE TOP ---

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
    } else {
      setIsCheckingAuth(false);
      const name = localStorage.getItem("user_name");
      const email = localStorage.getItem("user_email");
      const role = localStorage.getItem("user_role");
      
      if (name) setUserName(name);
      if (email) setUserEmail(email);
      if (role) setUserRole(role.charAt(0).toUpperCase() + role.slice(1));
    }
  }, [router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchGuidelines() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/guidelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.guidelines) {
        setGuidelines(data.guidelines);
        setServerGuidelinesCount(data.guidelines.length);
      }
    } catch (err) {
      console.error("Failed to fetch guidelines", err);
    }
  }

  async function fetchMetrics() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.guidelines_in_vault !== undefined) {
          setServerGuidelinesCount(data.guidelines_in_vault);
        }
      }
    } catch (err) {
      console.error("Failed to fetch metrics", err);
    }
  }

  useEffect(() => {
    fetchGuidelines();
    fetchMetrics();

    const savedHistory = localStorage.getItem("brandguard_audit_history");
    if (savedHistory) {
      try {
        setAuditHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse saved audit history", e);
      }
    }
  }, []);

  useEffect(() => {
    if (auditHistory.length >= 0) {
      localStorage.setItem("brandguard_audit_history", JSON.stringify(auditHistory));
    }
  }, [auditHistory]);

  // --- CONDITIONAL RETURN PLACED SAFELY AFTER ALL HOOKS ---
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-gray-500">Securing BrandGuard Session...</p>
        </div>
      </div>
    );
  }

  const handleIgnoreIssue = (indexToRemove: number) => {
    if (!auditResult) return;
    const updatedIssues = auditResult.issues.filter((_, idx) => idx !== indexToRemove);
    setAuditResult({
      ...auditResult,
      issues: updatedIssues,
      status: updatedIssues.length === 0 ? "PASS" : auditResult.status
    });
  };

  const handleAddGuideline = async () => {
    if (!isAdmin) {
      alert("RBAC Access Denied: Only Administrators can add guidelines to the Knowledge Vault. Editors have audit and scanning privileges.");
      return;
    }
    if (!guidelineTitle.trim() || !guidelineContent.trim()) {
      alert("Please enter both guideline title and content.");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/guidelines`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ title: guidelineTitle, content: guidelineContent, category: "General" }),
      });
      
      if (res.ok) {
        alert("Guideline added successfully to Knowledge Vault!");
        setGuidelineTitle("");
        setGuidelineContent("");
        fetchGuidelines();
        fetchMetrics();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to save guideline.");
      }
    } catch (err) {
      console.error("Error adding guideline:", err);
      alert("Error connecting to backend service.");
    }
  };

  const handleDeleteGuideline = async (id: string) => {
    if (!isAdmin) {
      alert("RBAC Access Denied: Only Administrators can delete vault guidelines.");
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/guidelines/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setGuidelines((prev) => prev.filter((g) => g.id !== id));
        fetchMetrics();
        alert("Guideline removed successfully.");
      } else {
        alert("Failed to delete guideline from backend.");
      }
    } catch (err) {
      console.error("Error deleting guideline:", err);
    }
  };

  const handleEditGuideline = async (g: Guideline) => {
    if (!isAdmin) {
      alert("RBAC Access Denied: Only Administrators can edit vault guidelines.");
      return;
    }
    setGuidelineTitle(g.title);
    setGuidelineContent(g.content);
    const token = localStorage.getItem("access_token");
    await fetch(`${API_URL}/api/guidelines/${g.id}`, { 
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchGuidelines();
    fetchMetrics();
    window.scrollTo({ top: 0, behavior: "smooth" });
    alert("Guideline loaded into form for editing. Click 'Add Guideline' when done.");
  };

  const handleAuditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentToAudit.trim()) {
      alert("Please enter content to audit.");
      return;
    }
    setLoading(true);
    setIsApproved(false);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/audit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ text: contentToAudit }),
      });
      const data = await res.json();
      setAuditResult(data);

      const newLog: AuditLog = {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        textSnippet: contentToAudit.substring(0, 30) + "...",
        fullText: contentToAudit,
        status: data.status,
        issuesCount: data.issues ? data.issues.length : 0,
      };
      const updatedHistory = [newLog, ...auditHistory];
      setAuditHistory(updatedHistory);
      localStorage.setItem("brandguard_audit_history", JSON.stringify(updatedHistory));
      fetchMetrics();
    } catch (err) {
      console.error(err);
      alert("Error connecting to backend audit service.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFix = (suggestedFix: string) => {
    setContentToAudit((prev) => prev + "\n\n[Applied Fix]: " + suggestedFix);
    alert("Suggested fix incorporated into draft content!");
  };

  const exportReport = () => {
    if (!auditResult) return;
    const reportText = `BRANDGUARD AI - COMPLIANCE AUDIT REPORT\nGenerated: ${new Date().toLocaleString()}\nStatus: ${auditResult.status}\n\nIssues Found (${auditResult.issues.length}):\n` +
      auditResult.issues.map((i, index) => `\n${index + 1}. [${i.issue_type}]\nSnippet: "${i.snippet}"\nExplanation: ${i.explanation}\nSuggested Fix: ${i.suggested_fix}`).join("\n");
    
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BrandGuard_Audit_Report_${Date.now()}.txt`;
    a.click();
  };

  const scrollToSection = (sectionName: string) => {
    setActiveSection(sectionName);
    const idMap: Record<string, string> = {
      "Dashboard": "vault-section",
      "Knowledge Vault": "vault-section",
      "Compliance Scanner": "scanner-section",
      "Audit History": "history-section",
      "Reports": "results-section"
    };
    const element = document.getElementById(idMap[sectionName] || "vault-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Knowledge Vault", icon: BookOpen },
    { name: "Compliance Scanner", icon: FileText },
    { name: "Audit History", icon: History },
    { name: "Reports", icon: BarChart3Icon },
  ];

  const totalGuidelines = serverGuidelinesCount || guidelines.length;
  const totalAudits = auditHistory.length;
  const passedAudits = auditHistory.filter(l => l.status === "PASS").length;
  const issuesFound = auditResult?.issues.length || 0;
  const complianceRate = totalAudits > 0 ? `${Math.round((passedAudits / totalAudits) * 100)}%` : "100%";
  const weeklyTrend = totalAudits > 0 ? `+${totalAudits * 3}% vs last week` : "+0% vs last week";

  return (
    <main className="min-h-screen bg-[#F4F6FA] text-slate-900 flex font-sans relative">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden md:flex flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-950">BrandGuard AI</h1>
              <p className="text-xs text-gray-400 -mt-0.5">Govern. Comply. Grow.</p>
            </div>
          </div>

          <nav className="space-y-3">
            {navItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.name)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeSection === item.name
                    ? "bg-[#EEF2FF] text-[#4F46E5]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-slate-950"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Security Status Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 mt-8 shadow-lg border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/50 flex items-center justify-center border border-indigo-400/30">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30">RAG Active</span>
          </div>
          <div>
            <h4 className="font-bold text-sm">ChromaDB Vector Vault</h4>
            <p className="text-xs text-indigo-200 mt-0.5">Connected to secure embedding store.</p>
          </div>
          <div className="pt-2 border-t border-indigo-800/60 flex justify-between items-center text-xs text-indigo-300">
            <span>Active Rules: <strong className="text-white">{totalGuidelines}</strong></span>
            <span>Latency: <strong className="text-emerald-400">42ms</strong></span>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-4">v1.0.0 • Round 3 Build</p>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950">BrandGuard AI <span className="text-[#4F46E5]">Dashboard</span></h1>
            <p className="text-gray-500 text-sm">Enterprise Brand Governance & Automated Compliance Gateway</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                System Online
            </button>
            <NotificationBell />
            
            {/* Interactive Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 bg-white py-1.5 px-3 rounded-full border border-gray-100 shadow-sm cursor-pointer hover:border-gray-200 transition"
              >
                <img src={`https://api.dicebear.com/8.x/adventurer/svg?seed=${userName}`} alt="User" className="w-8 h-8 rounded-full border border-gray-200" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    {userName} 
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                      {userRole}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400 -mt-0.5">{userEmail}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Profile Menu Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
                  <div className="px-4 py-2 border-b border-gray-50">
                    <p className="text-xs text-gray-400">Signed in as ({userRole})</p>
                    <p className="text-sm font-bold text-slate-950 truncate">{userEmail}</p>
                  </div>
                  <div className="py-1">
                    <button 
                      onClick={() => {
                        localStorage.removeItem("access_token");
                        localStorage.removeItem("user_role");
                        localStorage.removeItem("user_name");
                        localStorage.removeItem("user_email");
                        window.location.href = "/login";
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium transition flex items-center gap-2 cursor-pointer"
                    >
                      🚪 Sign Out / Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Guidelines in Vault", value: totalGuidelines, change: "+1", bgClass: "bg-emerald-50", textClass: "text-emerald-500", icon: BookOpen },
            { title: "Total Audits", value: totalAudits, change: weeklyTrend, bgClass: "bg-emerald-50", textClass: "text-emerald-500", icon: ShieldCheck },
            { title: "Issues Found", value: issuesFound, change: "+2", bgClass: "bg-rose-50", textClass: "text-rose-500", icon: AlertTriangle },
            { title: "Compliance Rate", value: complianceRate, change: "+2%", bgClass: "bg-emerald-50", textClass: "text-emerald-500", icon: CheckCircle2 },
          ].map((card, index) => (
            <div key={index} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-5 shadow-sm hover:shadow-md transition">
                <div className={`p-4 ${card.bgClass} rounded-xl`}>
                    <card.icon className={`w-7 h-7 ${card.textClass}`} />
                </div>
                <div>
                    <p className="text-sm text-gray-400 font-medium">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-950">{card.value}</p>
                    <p className={`text-xs font-semibold ${card.textClass} mt-0.5`}>{card.change}</p>
                </div>
            </div>
          ))}
        </div>

        {/* Main Grid (Vault, Scanner, History, Results) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Brand Knowledge Vault & Your Guidelines */}
          <section id="vault-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <span className="text-[#4F46E5] font-mono">1.</span> Brand Knowledge Vault
                {!isAdmin && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium ml-2">Viewer Mode</span>}
              </h2>
              {isAdmin ? (
                <button onClick={handleAddGuideline} className="bg-[#4F46E5] text-white text-sm px-5 py-2 rounded-xl font-semibold hover:bg-[#4338CA] flex items-center gap-2 transition cursor-pointer">
                  <PlusCircle className="w-4 h-4"/> Add Guideline
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Admin required to add rules</span>
              )}
            </div>
            
            <div className="space-y-4 pt-3 border-t border-gray-50">
              <input 
                type="text" 
                value={guidelineTitle} 
                onChange={e=>setGuidelineTitle(e.target.value)} 
                placeholder={isAdmin ? "e.g., Promotional Claim Policy" : "Admin access required to add guidelines"} 
                disabled={!isAdmin}
                className="w-full p-3 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#C7D2FE] bg-[#F9FAFB] text-slate-900 disabled:opacity-60" 
              />
              <textarea 
                value={guidelineContent} 
                onChange={e=>setGuidelineContent(e.target.value)} 
                placeholder={isAdmin ? "Enter guideline details..." : "Editors can view guidelines and run audits in the Compliance Scanner."} 
                disabled={!isAdmin}
                className="w-full p-3 border border-gray-100 rounded-xl text-sm h-20 resize-none focus:ring-2 focus:ring-[#C7D2FE] bg-[#F9FAFB] text-slate-900 disabled:opacity-60" 
              />
            </div>

            <div className="pt-4 border-t border-gray-50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <h3 className="font-semibold text-slate-800">Your Guidelines</h3>
                    <p className="text-gray-400">Total: {totalGuidelines}</p>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                    {guidelines.map((g) => (
                        <div key={g.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] border border-gray-100 rounded-xl hover:bg-white hover:border-gray-200 transition">
                           <div className="flex items-center gap-3">
                               <FileText className="w-5 h-5 text-emerald-500"/>
                               <div className="flex flex-col text-sm">
                                   <span className="font-medium text-slate-950">{g.title}</span>
                                   <span className="text-gray-400 text-xs truncate max-w-[200px]">{g.content}</span>
                               </div>
                           </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">Active</span>
                                {isAdmin && (
                                  <>
                                    <Edit2 onClick={() => handleEditGuideline(g)} className="w-4 h-4 text-gray-400 hover:text-slate-950 cursor-pointer" />
                                    <Trash2 onClick={() => handleDeleteGuideline(g.id)} className="w-4 h-4 text-gray-400 hover:text-rose-500 cursor-pointer" />
                                  </>
                                )}
                            </div>
                        </div>
                    ))}
                    {guidelines.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No rules in vault yet.</p>}
                </div>
                <button onClick={() => setShowAllGuidelinesModal(true)} className="text-[#4F46E5] text-sm font-semibold w-full text-center pt-3 border-t border-gray-50 hover:underline cursor-pointer">View All Guidelines →</button>
            </div>
          </section>

          {/* 2. Content Compliance Scanner */}
          <section id="scanner-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2"><span className="text-[#4F46E5] font-mono">2.</span> Compliance Scanner</h2>
                <button onClick={()=>setContentToAudit("")} className="text-gray-400 hover:text-rose-500 text-sm font-medium cursor-pointer">Clear</button>
            </div>
            <form onSubmit={handleAuditContent} className="flex-1 flex flex-col justify-between">
                <div className="relative flex-1">
                    <textarea
                      value={contentToAudit}
                      onChange={e=>setContentToAudit(e.target.value)}
                      placeholder="Paste your content here to check for compliance issues..."
                      className="w-full h-full min-h-[260px] p-5 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#C7D2FE] resize-none bg-[#F9FAFB] text-slate-900"
                      required
                    />
                     <div className="absolute bottom-4 right-4 text-xs text-gray-400">{contentToAudit.length} characters</div>
                </div>
                <button type="submit" disabled={loading} className="w-full mt-5 bg-[#4F46E5] text-white py-3.5 rounded-2xl font-bold text-lg hover:bg-[#4338CA] transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <ShieldCheck className="w-6 h-6" />}
                  {loading ? "Scanning Content via RAG..." : "Run Audit →"}
                </button>
            </form>
          </section>

          {/* 3. Audit History */}
          <section id="history-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2"><span className="text-[#4F46E5] font-mono">3.</span> Audit History</h2>
                <button onClick={() => setShowAllHistoryModal(true)} className="text-[#4F46E5] hover:underline text-sm font-medium cursor-pointer">View All →</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {auditHistory.map(log => (
                    <div key={log.id} className="p-3 bg-[#F9FAFB] border border-gray-100 rounded-xl hover:bg-white hover:border-gray-200 transition space-y-2">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <FileText className="w-5 h-5 text-gray-400"/>
                             <div className="flex flex-col text-sm">
                                 <span className="font-medium text-slate-950 truncate max-w-[200px]">{log.textSnippet}</span>
                                 <span className="text-gray-400 text-xs">{log.timestamp}</span>
                             </div>
                         </div>
                          <div className="flex items-center gap-2">
                              <span className={`text-xs ${log.status === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"} px-2.5 py-0.5 rounded-full font-bold`}>{log.status}</span>
                              <span className="text-sm font-medium text-slate-950">{log.issuesCount} issues</span>
                              <button onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className="p-1 hover:bg-gray-200 rounded cursor-pointer">
                                {expandedLogId === log.id ? <ChevronUp className="w-4 h-4 text-gray-600"/> : <ChevronDown className="w-4 h-4 text-gray-600"/>}
                              </button>
                          </div>
                      </div>
                      {expandedLogId === log.id && (
                        <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 bg-white p-2.5 rounded-lg">
                          <p className="font-semibold text-slate-800 mb-1">Full Scanned Text:</p>
                          <p className="italic">"{log.fullText}"</p>
                        </div>
                      )}
                    </div>
                ))}
                {auditHistory.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">No audits yet. Run one from the scanner!</p>}
            </div>
          </section>

          {/* 4. Audit Results & Approval Workflow */}
          <section id="results-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2"><span className="text-[#4F46E5] font-mono">4.</span> Audit Results</h2>
                {auditResult && (
                    <button onClick={exportReport} className="bg-slate-900 text-white text-sm px-4 py-1.5 rounded-xl font-medium hover:bg-slate-950 transition flex items-center gap-1.5 shadow-sm cursor-pointer">
                        <Download className="w-4 h-4"/> Download Full Report
                    </button>
                )}
            </div>
            
            {!auditResult && (
                 <div className="flex flex-col items-center justify-center gap-3 py-16 border-2 border-dashed border-gray-100 rounded-2xl bg-[#F9FAFB]">
                    <ShieldCheck className="w-16 h-16 text-gray-200" />
                    <h3 className="text-xl font-bold text-slate-950">Ready for Scan</h3>
                    <p className="text-sm text-gray-400 text-center max-w-[250px]">Paste your content and click 'Run Audit' to see compliance results here.</p>
                </div>
            )}

            {auditResult && (
                <div className="space-y-5">
                    <div className={`p-4 rounded-xl font-semibold flex justify-between items-center border ${auditResult.status === "PASS" || isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                      <span className="text-xs sm:text-sm">Status: {isApproved ? "✅ Approved by Reviewer for Publication" : auditResult.status === "PASS" ? "✅ Content Approved for Publication" : "⚠️ Compliance Issues Detected"}</span>
                      
                      {auditResult.status === "FLAGGED" && !isApproved && (
                        <button 
                          onClick={() => setIsApproved(true)}
                          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition cursor-pointer">
                          Override & Approve
                        </button>
                      )}
                    </div>

                    {auditResult.issues.length > 0 && !isApproved && (
                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {auditResult.issues.map((issue, idx) => (
                        <div key={idx} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                                <span className="font-bold text-rose-600 text-sm">{issue.issue_type}</span>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full font-mono">Match: "{issue.snippet}"</span>
                          </div>
                          <p className="text-sm text-gray-600"><strong>Why it failed:</strong> {issue.explanation}</p>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-50">
                            <p className="text-sm text-emerald-600 flex-1"><strong>Suggested Fix:</strong> {issue.suggested_fix}</p>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button 
                                type="button"
                                onClick={() => handleApplyFix(issue.suggested_fix)}
                                className="bg-white text-[#4F46E5] border border-[#C7D2FE] px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#EEF2FF] transition cursor-pointer">
                                Apply Fix
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleIgnoreIssue(idx)}
                                className="bg-white text-rose-600 border border-rose-100 px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 transition cursor-pointer">
                                Ignore
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                    {auditResult.issues.length === 0 && auditResult.status === "FLAGGED" && (
                      <p className="text-center text-gray-400 py-5 text-sm">Content flagged but no specific issues identified by LLM. Re-check guidelines.</p>
                    )}
                </div>
            )}
          </section>
        </div>
      </div>

      {/* View All Guidelines Modal */}
      {showAllGuidelinesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#4F46E5]" /> All Stored Brand Guidelines ({guidelines.length})
              </h3>
              <button onClick={() => setShowAllGuidelinesModal(false)} className="text-gray-400 hover:text-slate-950 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F9FAFB]">
              {guidelines.map((g) => (
                <div key={g.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-950 text-sm">{g.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium">Active</span>
                      {isAdmin && (
                        <button onClick={() => handleDeleteGuideline(g.id)} className="text-gray-400 hover:text-rose-500 text-xs cursor-pointer">Delete</button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{g.content}</p>
                </div>
              ))}
              {guidelines.length === 0 && (
                <p className="text-center text-gray-400 py-12 text-sm">No guidelines found in the Knowledge Vault yet.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
              <button onClick={() => setShowAllGuidelinesModal(false)} className="bg-[#4F46E5] text-white text-sm px-5 py-2 rounded-xl font-semibold hover:bg-[#4338CA] cursor-pointer">
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Audit History Modal */}
      {showAllHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                <History className="w-5 h-5 text-[#4F46E5]" /> Complete Audit History Log ({auditHistory.length})
              </h3>
              <button onClick={() => setShowAllHistoryModal(false)} className="text-gray-400 hover:text-slate-950 p-1 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F9FAFB]">
              {auditHistory.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-400">{log.timestamp}</span>
                    <span className={`text-xs ${log.status === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"} px-2.5 py-0.5 rounded-full font-bold`}>
                      {log.status} ({log.issuesCount} issues)
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium">Scanned Content:</p>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg italic">"{log.fullText}"</p>
                </div>
              ))}
              {auditHistory.length === 0 && (
                <p className="text-center text-gray-400 py-12 text-sm">No audit logs recorded in this session yet.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
              <button onClick={() => setShowAllHistoryModal(false)} className="bg-[#4F46E5] text-white text-sm px-5 py-2 rounded-xl font-semibold hover:bg-[#4338CA] cursor-pointer">
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function BarChart3Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}