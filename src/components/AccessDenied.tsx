import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied: React.FC = () => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <ShieldAlert size={64} className="error-icon" />
        <h2>Access Denied</h2>
        <p>You do not have permission to access the JSON Comparator.</p>
        <div className="role-requirement">
          <span>Required Role:</span>
          <span className="badge-required">deployer</span>
        </div>
        <p className="contact-admin">
          If you believe this is an error, please contact your administrator to update your role in the system.
        </p>
        <a href="#dashboard" className="btn-primary back-home-btn">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
};
