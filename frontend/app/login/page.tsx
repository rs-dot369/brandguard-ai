"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://brandguard-ai-backend-m9r2.onrender.com";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isRegistering) {
      // Handle Registration
      try {
        const res = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, full_name: fullName, role: "editor" }),
        });
        const data = await res.json();
        if (res.ok) {
          alert("Registration successful! Please sign in.");
          setIsRegistering(false);
        } else {
          setError(data.detail || "Registration failed");
        }
      } catch (err) {
        setError("Error connecting to server");
      }
    } else {
      // Handle Login
      try {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const res = await fetch(`${API_URL}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_name", data.full_name || username);
        localStorage.setItem("user_email", username);
        localStorage.setItem("user_role", data.role || "editor");
        router.push("/");
        } else {
          setError(data.detail || "Invalid credentials");
        }
      } catch (err) {
        setError("Error connecting to server");
      }
    }
  };


  

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-[#1E293B] border border-slate-800 w-full max-w-md rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-indigo-400">
            {isRegistering ? "Create BrandGuard Account" : "BrandGuard AI Login"}
          </h1>
          <p className="text-xs text-slate-400">
            {isRegistering ? "Register a new editor profile" : "Enterprise Brand Governance Gateway"}
          </p>
        </div>

        {error && <div className="p-3 bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Anurag Kumar"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email / Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="name@brandguard.ai"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition duration-200 text-sm"
          >
            {isRegistering ? "Register Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
            className="text-xs text-indigo-400 hover:underline"
          >
            {isRegistering ? "Already have an account? Sign In" : "Need an account? Register here →"}
          </button>
        </div>

        {!isRegistering && (
          <div className="text-[11px] text-slate-500 text-center space-y-1 pt-2">
            <p>Demo Accounts:</p>
            <p>Admin: admin@brandguard.ai / admin123</p>
            <p>Editor: editor@brandguard.ai / editor123</p>
          </div>
        )}
      </div>
    </main>
  );
}