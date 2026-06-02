import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/config/firebaseServices";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await sendPasswordResetEmail(auth(), email);
      setSent(true);
    } catch { setError("Could not send reset email. Check the address and try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg p-8">
          <button onClick={() => navigate("/login")} className="text-sm text-text-secondary hover:text-primary mb-6 flex items-center gap-1">← Back to sign in</button>
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Check your email</h2>
              <p className="text-text-secondary text-sm">A password reset link has been sent to <strong>{email}</strong>.</p>
              <button onClick={() => navigate("/login")} className="mt-6 w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-green-dark transition-colors">Back to Sign In</button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-text-primary mb-1">Forgot password?</h2>
              <p className="text-text-secondary text-sm mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" />
                </div>
                {error && <p className="text-sm text-alert-red bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-green-dark transition-colors disabled:opacity-60">
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
