import React from 'react';
import usersGearIcon from '../icons/users-gear-solid.svg';

const LOGO_URL = 'https://supabertel.otisud.re/storage/v1/object/public/logo//logo200X200.png';

interface HeaderProps {
  welcomeMessage?: string;
  onAdminClick?: () => void;
  onRGPDClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ welcomeMessage, onAdminClick, onRGPDClick }) => (
  <header
    style={{
      width: '100%',
      background: '#4ca585',
      minHeight: 110,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      marginBottom: 32,
    }}
  >
    <img
      src={LOGO_URL}
      alt="Logo OTI du SUD"
      style={{
        height: 'clamp(48px, 8vw, 80px)',
        width: 'clamp(48px, 8vw, 80px)',
        objectFit: 'contain',
        position: 'absolute',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '2px solid #fff',
      }}
    />
    {/* Icône paramètre en haut à droite */}
    <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 16, alignItems: 'center' }}>
      {onRGPDClick && (
        <button
          onClick={onRGPDClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: '#fff',
            opacity: 0.9,
            padding: '4px 8px',
            textDecoration: 'underline',
            fontWeight: 500,
          }}
          title="Mentions RGPD"
        >
          RGPD
        </button>
      )}
      {onAdminClick && (
        <button
          onClick={onAdminClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 28,
            color: '#fff',
            opacity: 0.85,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Administration"
        >
          <img src={usersGearIcon} alt="admin" style={{ width: 28, height: 28, display: 'block' }} />
        </button>
      )}
    </div>
    <div style={{ textAlign: 'center' }}>
      <h1
        style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: 'clamp(20px, 5vw, 36px)',
          letterSpacing: 1,
          margin: 0,
          textAlign: 'center',
          fontFamily: 'Segoe UI, Arial, sans-serif',
        }}
      >
        OTI du SUD
      </h1>
      {welcomeMessage && (
        <div
          style={{
            color: '#fff',
            fontSize: 'clamp(14px, 3vw, 18px)',
            fontWeight: 500,
            marginTop: 8,
            opacity: 0.9,
            fontFamily: 'Segoe UI, Arial, sans-serif',
          }}
        >
          {welcomeMessage}
        </div>
      )}
    </div>
  </header>
);

export default Header; 