import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './components/Login';
import { JSONComparator } from './components/JSONComparator';
import './App.css';

function App() {
  const { user, setUser, initialized, setInitialized, setLoading, signOut } = useAuthStore();

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setInitialized(true);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setInitialized]);

  if (!initialized) {
    return <div className="loading">Initializing...</div>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>JSON Additional</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={signOut} className="btn-secondary">Sign Out</button>
        </div>
      </header>
      <main>
        <JSONComparator />
      </main>
    </div>
  );
}

export default App;
