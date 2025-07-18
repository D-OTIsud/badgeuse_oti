import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Utilisateur } from '../App';

interface BadgeFormProps {
  utilisateur: Utilisateur;
  badgeId: string;
  heure: Date;
  onBack: () => void;
}

const splitCode = (code: string) => {
  const arr = code.split('');
  while (arr.length < 4) arr.push('');
  return arr;
};

const SuccessPopup: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div style={{
    position: 'fixed',
    top: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#43a047',
    color: '#fff',
    padding: '18px 32px',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    zIndex: 1000,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 1,
    minWidth: 220,
    textAlign: 'center',
  }}>
    {message}
    <button onClick={onClose} style={{ marginLeft: 24, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
  </div>
);

const BadgeForm: React.FC<BadgeFormProps> = ({ utilisateur, badgeId, heure, onBack }) => {
  const [code, setCode] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  React.useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('La géolocalisation n\'est pas supportée par ce navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      (err) => {
        setGeoError("Impossible d'obtenir la position GPS : " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const heureStr = heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    const { error: insertError } = await supabase.from('appbadge_badgeages').insert({
      utilisateur_id: utilisateur.id,
      code,
      type_action: 'entrée',
      latitude,
      longitude,
      commentaire: commentaire || null,
    });
    if (!insertError) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onBack();
      }, 3000);
      setCode('');
    } else {
      setError("Erreur : badge non enregistré. Vérifiez le code ou contactez l'administrateur.");
    }
    setLoading(false);
  };

  const codeArr = splitCode(code);

  return (
    <form onSubmit={handleBadge} style={{
      maxWidth: 420,
      margin: '48px auto',
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      padding: 36,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Segoe UI, Arial, sans-serif',
    }}>
      {showSuccess && (
        <SuccessPopup message={`Bonne journée ${utilisateur.prenom} !`} onClose={() => { setShowSuccess(false); onBack(); }} />
      )}
      <button type="button" onClick={onBack} style={{ marginBottom: 16, alignSelf: 'flex-start', background: 'none', border: 'none', color: '#1976d2', fontSize: 22, cursor: 'pointer' }}>
        ← Retour
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, width: '100%' }}>
        {utilisateur.avatar ? (
          <img src={utilisateur.avatar} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1976d2', background: '#f4f6fa' }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#bbb', border: '2px solid #1976d2' }}>
            <span>👤</span>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 22 }}>{utilisateur.prenom} {utilisateur.nom}</div>
          <div style={{ color: '#888', fontSize: 15 }}>{utilisateur.email}</div>
        </div>
      </div>
      <div style={{ marginBottom: 18, fontSize: 17, width: '100%' }}>
        Saisissez le code à 4 chiffres :
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {codeArr.map((val, idx) => (
          <input
            key={idx}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={val}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 1);
              let newCode = codeArr.slice();
              newCode[idx] = v;
              setCode(newCode.join('').slice(0, 4));
              // Focus next
              if (v && idx < 3) {
                const next = document.getElementById(`code-input-${idx + 1}`);
                if (next) (next as HTMLInputElement).focus();
              }
            }}
            id={`code-input-${idx}`}
            style={{
              width: 48,
              height: 48,
              fontSize: 28,
              textAlign: 'center',
              border: '1.5px solid #bbb',
              borderRadius: 8,
              background: '#f8f8f8',
              outline: 'none',
              fontWeight: 600,
            }}
            disabled={loading || !!geoError}
            autoFocus={idx === 0}
          />
        ))}
      </div>
      <button type="submit" disabled={loading || code.length !== 4 || !!geoError || latitude === null || longitude === null} style={{
        fontSize: 20,
        background: '#1976d2',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '14px 0',
        width: '100%',
        fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        marginBottom: 12,
        boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
        transition: 'background 0.2s',
      }}>
        {loading ? 'Badge en cours...' : 'Badger'}
      </button>
      {geoError && (
        <div style={{ color: 'red', marginBottom: 16 }}>{geoError}</div>
      )}
      {message && !showSuccess && <div style={{ marginTop: 16, fontWeight: 'bold', color: 'green' }}>{message}</div>}
      {error && <div style={{ marginTop: 16, fontWeight: 'bold', color: 'red' }}>{error}</div>}
    </form>
  );
};

export default BadgeForm; 