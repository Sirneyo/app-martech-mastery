import React from 'react';
import { Lock } from 'lucide-react';

export default function PausedAccountScreen() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '48px 32px',
        maxWidth: '500px',
        color: '#ffffff'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <Lock size={80} style={{ 
            margin: '0 auto', 
            color: '#fbbf24',
            opacity: 0.9
          }} />
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '16px',
          color: '#ffffff'
        }}>
          Account Paused
        </h1>
        
        <p style={{
          fontSize: '16px',
          lineHeight: '1.6',
          marginBottom: '32px',
          color: '#e0e7ff',
          opacity: 0.9
        }}>
          Your account has been temporarily paused. You don't have access to the platform at this time.
        </p>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          backdropFilter: 'blur(10px)'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#e0e7ff',
            margin: '0',
            lineHeight: '1.6'
          }}>
            To regain access, please contact your administrator or support team for assistance.
          </p>
        </div>
        
        <p style={{
          fontSize: '12px',
          color: '#94a3b8',
          margin: '0'
        }}>
          If you believe this is a mistake, reach out to support@app.martech-mastery.com
        </p>
      </div>
    </div>
  );
}