import React, { useMemo, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';

interface JSONEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  highlightLines?: number[];
}

export const JSONEditor: React.FC<JSONEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  error, 
  highlightLines 
}) => {
  const extensions = useMemo(() => [json()], []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const applyHighlight = () => {
      if (!wrapperRef.current) return;

      const cmLines = wrapperRef.current.querySelectorAll('.cm-line');
      
      // Remove all highlights first
      cmLines.forEach((line) => {
        line.classList.remove('cm-highlighted-line');
      });

      // Add highlights to specified lines
      if (highlightLines && highlightLines.length > 0 && cmLines.length > 0) {
        highlightLines.forEach((lineNum) => {
          if (lineNum > 0 && lineNum <= cmLines.length) {
            const lineElement = cmLines[lineNum - 1] as HTMLElement;
            if (lineElement) {
              lineElement.classList.add('cm-highlighted-line');
            }
          }
        });
      }
    };

    // Apply initial highlight
    applyHighlight();

    // Use mutation observer to watch for new lines being added
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new MutationObserver(() => {
      applyHighlight();
    });

    observerRef.current.observe(wrapperRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [highlightLines]);

  return (
    <div className="json-editor">
      <div className="editor-header">
        <label>{label}</label>
        {error && <span className="error-text">{error}</span>}
      </div>
      <div className="codemirror-wrapper" ref={wrapperRef}>
        <CodeMirror
          value={value}
          extensions={extensions}
          onChange={onChange}
          height="350px"
          theme="dark"
          className="json-codemirror"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
          }}
        />
        {highlightLines && highlightLines.length > 0 && (
          <div className="highlight-info">
            ✓ Added lines: {highlightLines.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};
