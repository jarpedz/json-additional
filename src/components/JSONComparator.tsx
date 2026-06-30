import React, { useMemo } from 'react';
import { useJSONStore } from '../store/useJSONStore';
import { JSONEditor } from './JSONEditor';
import { HistoryPanel } from './HistoryPanel';
import { ChevronRight, Plus, Check } from 'lucide-react';

interface Diff {
  path: string[];
  value: unknown;
}

function findMissingKeys(target: Record<string, unknown>, source: Record<string, unknown>, path: string[] = []): Diff[] {
  let diffs: Diff[] = [];
  
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const key in source) {
      const currentPath = [...path, key];
      if (!(key in target)) {
        diffs.push({ path: currentPath, value: source[key] });
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        const nextTarget = (target[key] && typeof target[key] === 'object') ? (target[key] as Record<string, unknown>) : {};
        const nextSource = source[key] as Record<string, unknown>;
        diffs = [...diffs, ...findMissingKeys(nextTarget, nextSource, currentPath)];
      }
    }
  }
  
  return diffs;
}

export const JSONComparator: React.FC = () => {
  const { targetJSON, sourceJSON, setTargetJSON, setSourceJSON, importKey, importAll, highlightedLines } = useJSONStore();

  const { diffs, targetError, sourceError } = useMemo(() => {
    let target: Record<string, unknown> | null = null;
    let source: Record<string, unknown> | null = null;
    let targetErr: string | null = null;
    let sourceErr: string | null = null;

    if (targetJSON.trim() !== '') {
      try {
        target = JSON.parse(targetJSON);
      } catch {
        targetErr = 'Invalid JSON';
      }
    }

    if (sourceJSON.trim() !== '') {
      try {
        source = JSON.parse(sourceJSON);
      } catch {
        sourceErr = 'Invalid JSON';
      }
    }

    const missingKeys = (!targetErr && !sourceErr && target && source)
      ? findMissingKeys(target, source)
      : [];

    return {
      diffs: missingKeys,
      targetError: targetErr,
      sourceError: sourceErr,
    };
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
