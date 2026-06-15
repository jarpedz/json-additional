import { create } from 'zustand';

interface HistoryEntry {
  timestamp: number;
  path: string[];
  value: any;
  type: 'single' | 'all';
}

interface JSONStore {
  targetJSON: string;
  sourceJSON: string;
  history: HistoryEntry[];
  setTargetJSON: (json: string) => void;
  setSourceJSON: (json: string) => void;
  importKey: (path: string[], value: any) => void;
  importAll: (diffs: any[]) => void;
  clearHistory: () => void;
}

export const useJSONStore = create<JSONStore>((set, get) => ({
  targetJSON: '{}',
  sourceJSON: '{}',
  history: [],
  setTargetJSON: (targetJSON) => set({ targetJSON }),
  setSourceJSON: (sourceJSON) => set({ sourceJSON }),
  clearHistory: () => set({ history: [] }),
  
  importKey: (path, value) => {
    const { targetJSON, sourceJSON, history } = get();
    try {
      const targetObj = JSON.parse(targetJSON);
      const sourceObj = JSON.parse(sourceJSON);
      
      const newTarget = insertWithOrder(targetObj, sourceObj, path, value);
      
      set({ 
        targetJSON: JSON.stringify(newTarget, null, 2),
        history: [{ timestamp: Date.now(), path, value, type: 'single' }, ...history]
      });
    } catch (e) {
      console.error('Failed to parse JSON for import', e);
    }
  },

  importAll: (diffs) => {
    const { targetJSON, sourceJSON, history } = get();
    try {
      let currentTarget = JSON.parse(targetJSON);
      const sourceObj = JSON.parse(sourceJSON);
      
      diffs.forEach(diff => {
        currentTarget = insertWithOrder(currentTarget, sourceObj, diff.path, diff.value);
      });
      
      const newEntries: HistoryEntry[] = diffs.map(d => ({
        timestamp: Date.now(),
        path: d.path,
        value: d.value,
        type: 'all'
      }));

      set({ 
        targetJSON: JSON.stringify(currentTarget, null, 2),
        history: [...newEntries, ...history]
      });
    } catch (e) {
      console.error('Failed to parse JSON for import all', e);
    }
  }
}));

/**
 * Helper to insert a key into target while trying to maintain the order found in source
 */
function insertWithOrder(target: any, source: any, path: string[], value: any): any {
  if (path.length === 0) return value;
  
  const newTarget = { ...target };
  const key = path[0];
  
  if (path.length === 1) {
    // We are at the level where we need to insert the key
    const result: any = {};
    const sourceKeys = Object.keys(source);
    const targetKeys = Object.keys(target);
    
    // Merge keys in order of source
    sourceKeys.forEach(sk => {
      if (sk === key) {
        result[sk] = value;
      } else if (targetKeys.includes(sk)) {
        result[sk] = target[sk];
      }
    });
    
    // Add any target keys that weren't in source at the end
    targetKeys.forEach(tk => {
      if (!(tk in result)) {
        result[tk] = target[tk];
      }
    });

    // If for some reason key wasn't in sourceKeys (shouldn't happen with our diff logic)
    if (!(key in result)) {
      result[key] = value;
    }
    
    return result;
  } else {
    // Deep insertion
    const subSource = source[key] || {};
    const subTarget = target[key] || {};
    newTarget[key] = insertWithOrder(subTarget, subSource, path.slice(1), value);
    return newTarget;
  }
}
