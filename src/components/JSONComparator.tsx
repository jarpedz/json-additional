import React, { useMemo, useState } from 'react';
import { useJSONStore } from '../store/useJSONStore';
import { JSONEditor } from './JSONEditor';
import { HistoryPanel } from './HistoryPanel';
import { ChevronRight, Plus, Check } from 'lucide-react';

interface Diff {
  path: string[];
  value: any;
}

export const JSONComparator: React.FC = () => {
  const { targetJSON, sourceJSON, setTargetJSON, setSourceJSON, importKey, importAll, highlightedLines } = useJSONStore();
  const [targetError, setTargetError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const findMissingKeys = (target: any, source: any, path: string[] = []): Diff[] => {
    let diffs: Diff[] = [];
    
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      for (const key in source) {
        const currentPath = [...path, key];
        if (!(key in target)) {
          diffs.push({ path: currentPath, value: source[key] });
        } else if (typeof source[key] === 'object' && source[key] !== null) {
          diffs = [...diffs, ...findMissingKeys(target[key] || {}, source[key], currentPath)];
        }
      }
    }
    
    return diffs;
  };

  const diffs = useMemo(() => {
    try {
      const target = JSON.parse(targetJSON);
      setTargetError(null);
      const source = JSON.parse(sourceJSON);
      setSourceError(null);
      return findMissingKeys(target, source);
    } catch (e: any) {
      if (targetJSON.trim() !== '') {
        try { JSON.parse(targetJSON); } catch (e) { setTargetError('Invalid JSON'); }
      }
      if (sourceJSON.trim() !== '') {
        try { JSON.parse(sourceJSON); } catch (e) { setSourceError('Invalid JSON'); }
      }
      return [];
    }
  }, [targetJSON, sourceJSON]);

  return (
    <div className="comparator-container">
      <div className="editors-grid">
        <JSONEditor 
          label="Target JSON (Main/Prd)" 
          value={targetJSON} 
          onChange={setTargetJSON} 
          error={targetError}
          highlightLines={highlightedLines}
        />
        <JSONEditor 
          label="Source JSON (New/Dev)" 
          value={sourceJSON} 
          onChange={setSourceJSON} 
          error={sourceError}
        />
      </div>

      <div className="diff-section">
        <div className="diff-header">
          <h3>Missing Keys in Target ({diffs.length})</h3>
          {diffs.length > 0 && (
            <button onClick={() => importAll(diffs)} className="btn-primary">
              <Plus size={16} /> Import All
            </button>
          )}
        </div>
        
        <div className="diff-list">
          {diffs.length === 0 ? (
            <div className="no-diffs">
              <Check size={48} />
              <p>No missing keys found.</p>
            </div>
          ) : (
            diffs.map((diff, idx) => (
              <div key={idx} className="diff-item">
                <div className="diff-path">
                  {diff.path.map((segment, i) => (
                    <React.Fragment key={i}>
                      <span className="path-segment">{segment}</span>
                      {i < diff.path.length - 1 && <ChevronRight size={14} />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="diff-value">
                  <code>{JSON.stringify(diff.value)}</code>
                </div>
                <button 
                  onClick={() => importKey(diff.path, diff.value)}
                  className="btn-icon"
                  title="Import this key"
                >
                  <Plus size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <HistoryPanel />
    </div>
  );
};
