import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { LogIn } from "lucide-react";

export const Login: React.FC = () => {
  const { signIn, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signIn(email, password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null && "message" in err) {
        // Supabase PostgrestError is a plain object, not an Error instance
        setError(String((err as { message: string }).message));
      } else {
        setError("Failed to sign in. Please try again.");
      }
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <div className="login-header">
          <LogIn size={32} />
          <h2>JSON Additional</h2>
          <p>Sign in to compare configurations</p>
        </div>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="developer@example.com"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};
