import React from 'react';
import { Lock, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PausedAccountScreen() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'all'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '90%',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        color: '#ffffff'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <Lock size={56} style={{ margin: '0 auto', color: '#fbbf24' }} />
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '12px',
          color: '#ffffff'
        }}>
          Account Paused
        </h1>

        <p style={{
          fontSize: '15px',
          lineHeight: '1.7',
          marginBottom: '24px',
          color: 'rgba(255,255,255,0.75)'
        }}>
          Your account has been temporarily paused and you cannot access the platform right now.
          Please contact your administrator to regain access.
        </p>

        <p style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: '28px'
        }}>
          admin@app.martech-mastery.com
        </p>

        <button
          onClick={() => base44.auth.logout()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </div>
  );
}