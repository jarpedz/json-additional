import React from 'react';

interface JSONEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export const JSONEditor: React.FC<JSONEditorProps> = ({ label, value, onChange, error }) => {
  return (
    <div className="json-editor">
      <div className="editor-header">
        <label>{label}</label>
        {error && <span className="error-text">{error}</span>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder='{ "key": "value" }'
      />
    </div>
  );
};
