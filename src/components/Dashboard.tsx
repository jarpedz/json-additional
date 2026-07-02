import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { Database, FileText, GitCompare, User } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.role;
  const [queriesCount, setQueriesCount] = useState<number | null>(null);
  const [notesCount, setNotesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        const [queriesRes, notesRes] = await Promise.all([
          supabase.from('tb_queries').select('*', { count: 'exact', head: true }),
          supabase.from('tb_note').select('*', { count: 'exact', head: true }),
        ]);

        setQueriesCount(queriesRes.count);
        setNotesCount(notesRes.count);
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  const displayRole = role || 'loading...';
  const roleClass = role === 'deployer' ? 'role-deployer' : 'role-support';

  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <div className="welcome-card">
          <div className="welcome-info">
            <div className="avatar-placeholder">
              <User size={32} />
            </div>
            <div>
              <h2>Welcome back,</h2>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <div className="role-tag-container">
            <span>Your System Role:</span>
            <span className={`badge-role ${roleClass}`}>{displayRole}</span>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <div className="icon-wrapper queries-icon">
              <Database size={24} />
            </div>
            <span className="metric-title">Saved Queries</span>
          </div>
          <div className="metric-value">
            {loading ? <span className="spinner">...</span> : queriesCount ?? 0}
          </div>
          <p className="metric-desc">Total reusable SQL queries configured.</p>
          <a href="#query-utilities" className="metric-action-btn">
            Manage Queries →
          </a>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="icon-wrapper notes-icon">
              <FileText size={24} />
            </div>
            <span className="metric-title">Deployment Notes</span>
          </div>
          <div className="metric-value">
            {loading ? <span className="spinner">...</span> : notesCount ?? 0}
          </div>
          <p className="metric-desc">Total deployment logs & notes recorded.</p>
          <a href="#notes" className="metric-action-btn">
            Manage Notes →
          </a>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="icon-wrapper comparator-icon">
              <GitCompare size={24} />
            </div>
            <span className="metric-title">JSON Comparator</span>
          </div>
          <div className="metric-value">
            <GitCompare size={28} style={{ opacity: 0.8 }} />
          </div>
          <p className="metric-desc">Compare environment configs side-by-side.</p>
          {role === 'deployer' ? (
            <a href="#json-comparator" className="metric-action-btn">
              Open Comparator →
            </a>
          ) : (
            <span className="metric-action-locked">🔒 Deployer Role Required</span>
          )}
        </div>
      </div>

      <div className="shortcuts-section">
        <h3>Quick Shortcuts</h3>
        <div className="shortcuts-grid">
          <a href="#query-utilities" className="shortcut-item">
            <h4>Database Queries</h4>
            <p>Access hospital query utilities and stored queries.</p>
          </a>
          <a href="#notes" className="shortcut-item">
            <h4>Log Notes</h4>
            <p>Write notes, descriptions, and updates for deployments.</p>
          </a>
          {role === 'deployer' && (
            <a href="#json-comparator" className="shortcut-item">
              <h4>JSON Config Comparator</h4>
              <p>Compare config-prd.json vs local configuration keys.</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
