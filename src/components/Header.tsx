import React from 'react';

const LOGO_URL = 'https://supabertel.otisud.re/storage/v1/object/public/logo//logo200X200.png';

const Header: React.FC = () => (
  <header style={{
    width: '100%',
    background: '#4ca585',
    minHeight: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    marginBottom: 32,
  }}>
    <img
      src={LOGO_URL}
      alt="Logo OTI du SUD"
      style={{
        height: 80,
        width: 80,
        objectFit: 'contain',
        position: 'absolute',
        left: 32,
        top: '50%',
        transform: 'translateY(-50%)',
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '2px solid #fff',
      }}
    />
    <h1 style={{
      color: '#fff',
      fontWeight: 700,
      fontSize: 36,
      letterSpacing: 1,
      margin: 0,
      textAlign: 'center',
      fontFamily: 'Segoe UI, Arial, sans-serif',
    }}>
      OTI du SUD
    </h1>
  </header>
);

export default Header; 