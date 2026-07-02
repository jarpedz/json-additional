import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/useAuthStore';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { QueryUtilities } from './components/QueryUtilities';
import { JSONComparator } from './components/JSONComparator';
import { NoteManager } from './components/NoteManager';
import { AccessDenied } from './components/AccessDenied';
import { LayoutDashboard, Database, GitCompare, FileText, LogOut, Shield } from 'lucide-react';
import './App.css';

function App() {
  const { user, setUser, initialized, setInitialized, signOut } = useAuthStore();
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const role = user?.role;

  // Handle Hash Routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      setCurrentRoute(hash || 'dashboard');
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch or Provision Profile on Load / Session Change
  useEffect(() => {
    const syncUserProfile = async (authUserId: string, email: string) => {
      try {
        // Fetch existing user profile from tb_users
        const { data: profile, error } = await supabase
          .from('tb_users')
          .select('*')
          .eq('id', authUserId)
          .single();

        if (error) {
          // If no profile exists, automatically provision one with a default 'support' role
          if (error.code === 'PGRST116') {
            const { data: newProfile, error: insertError } = await supabase
              .from('tb_users')
              .insert({
                id: authUserId,
                email: email,
                role: 'support',
                create_by: 'system'
              })
              .select('*')
              .single();

            if (insertError) {
              console.error('Error auto-provisioning user profile:', insertError);
              setUser({ id: authUserId, email, role: 'support' });
            } else if (newProfile) {
              setUser(newProfile);
            }
          } else {
            console.error('Error fetching user profile:', error);
            setUser({ id: authUserId, email, role: 'support' }); // Fallback
          }
        } else if (profile) {
          setUser(profile);
        }
      } catch (err) {
        console.error('Exception syncing user profile:', err);
        setUser({ id: authUserId, email, role: 'support' }); // Fallback
      } finally {
        useAuthStore.setState({ loading: false });
        setInitialized(true);
      }
    };

    // Listen to Supabase Auth State Changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        syncUserProfile(currentUser.id, currentUser.email || '');
      } else {
        setUser(null);
        useAuthStore.setState({ loading: false });
        setInitialized(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        syncUserProfile(currentUser.id, currentUser.email || '');
      } else {
        setUser(null);
        useAuthStore.setState({ loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setInitialized]);

  if (!initialized) {
    return <div className="loading">Initializing...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'query-utilities':
        return <QueryUtilities />;
      case 'json-comparator':
        return role === 'deployer' ? <JSONComparator /> : <AccessDenied />;
      case 'notes':
        return <NoteManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <Shield size={24} />
          <h1>JSON Utilities</h1>
        </div>
        <nav className="nav-links">
          <a href="#dashboard" className={`nav-link ${currentRoute === 'dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
          <a href="#query-utilities" className={`nav-link ${currentRoute === 'query-utilities' ? 'active' : ''}`}>
            <Database size={18} />
            <span>Query Utilities</span>
          </a>
          {/* Always show the JSON Comparator link but visually indicate if locked or direct to AccessDenied */}
          <a href="#json-comparator" className={`nav-link ${currentRoute === 'json-comparator' ? 'active' : ''}`}>
            <GitCompare size={18} />
            <span>JSON Comparator {role !== 'deployer' && '🔒'}</span>
          </a>
          <a href="#notes" className={`nav-link ${currentRoute === 'notes' ? 'active' : ''}`}>
            <FileText size={18} />
            <span>Notes</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="avatar-placeholder" style={{ width: 32, height: 32 }}>
              <span>{user.email?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-text-info">
              <div className="user-email-text" title={user.email}>{user.email}</div>
              <span className="badge-role" style={{ fontSize: 9, padding: '2px 4px', display: 'inline-block', marginTop: 2 }}>
                {role || 'loading...'}
              </span>
            </div>
          </div>
          <button onClick={signOut} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="main-content-layout">
        <header className="top-bar">
          <div className="user-info">
            <span>Logged in as: <strong>{user.email}</strong></span>
          </div>
        </header>
        <main style={{ maxWidth: '100%', padding: '2rem' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
