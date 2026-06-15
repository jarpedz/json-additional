import React from 'react';
import { useJSONStore } from '../store/useJSONStore';
import { History, ChevronRight, Trash2 } from 'lucide-react';

export const HistoryPanel: React.FC = () => {
  const { history, clearHistory } = useJSONStore();

  if (history.length === 0) return null;

  return (
    <div className="history-panel">
      <div className="history-header">
        <div className="title">
          <History size={18} />
          <h3>Import History</h3>
        </div>
        <button onClick={clearHistory} className="btn-text" title="Clear History">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="history-list">
        {history.map((entry, idx) => (
          <div key={idx} className="history-item">
            <div className="history-meta">
              <span className="timestamp">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className={`badge ${entry.type}`}>{entry.type === 'all' ? 'Bulk' : 'Single'}</span>
            </div>
            <div className="history-path">
              {entry.path.map((segment, i) => (
                <React.Fragment key={i}>
                  <span>{segment}</span>
                  {i < entry.path.length - 1 && <ChevronRight size={12} />}
                </React.Fragment>
              ))}
            </div>
            <div className="history-value">
              <code>{JSON.stringify(entry.value)}</code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
