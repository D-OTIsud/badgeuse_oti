import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Utilisateur } from '../App';

// Props étendus
interface BadgeFormProps {
  utilisateur: Utilisateur;
  badgeId: string;
  heure: Date;
  onBack: () => void;
}

const BadgeForm: React.FC<BadgeFormProps> = ({ utilisateur, badgeId, heure, onBack }) => {
  const [code, setCode] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Géolocalisation
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

  // Format heure
  const heureStr = heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Validation du badgeage
  const handleBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    // Insertion dans Supabase
    const { error: insertError } = await supabase.from('appbadge_badgeages').insert({
      utilisateur_id: utilisateur.id,
      code,
      type_action: 'entrée', // ou à choisir selon le contexte
      latitude,
      longitude,
      commentaire: commentaire || null,
    });
    if (!insertError) {
      setMessage(`Bonne journée ${utilisateur.prenom} !`);
      setCode('');
      setTimeout(() => {
        setMessage(null);
        onBack();
      }, 3000);
    } else {
      setError("Erreur : badge non enregistré. Vérifiez le code ou contactez l'administrateur.");
      // Rappel du webhook pour renvoyer un code
      try {
        await fetch('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            utilisateur_id: utilisateur.id,
            badge_id: badgeId,
            user_email: utilisateur.email,
          }),
        });
      } catch {}
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleBadge} style={{ maxWidth: 400, margin: '0 auto' }}>
      <button type="button" onClick={onBack} style={{ marginBottom: 16 }}>
        ← Retour
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        {utilisateur.avatar && (
          <img src={utilisateur.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 20 }}>{utilisateur.prenom} {utilisateur.nom}</div>
          <div style={{ color: '#888', fontSize: 14 }}>{utilisateur.email}</div>
        </div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 16 }}>
        Heure de badgeage : <b>{heureStr}</b>
      </div>
      {geoError && (
        <div style={{ color: 'red', marginBottom: 16 }}>{geoError}</div>
      )}
      <div style={{ marginBottom: 16 }}>
        <label>Code à 4 chiffres reçu sur Slack :</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          pattern="\d{4}"
          maxLength={4}
          required
          style={{ fontSize: 24, letterSpacing: 8, width: 120, textAlign: 'center' }}
          disabled={loading || !!geoError}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label>Commentaire (facultatif) :</label>
        <input
          type="text"
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
          style={{ width: '100%', fontSize: 16 }}
          maxLength={200}
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading || code.length !== 4 || !!geoError || latitude === null || longitude === null} style={{ fontSize: 18 }}>
        {loading ? 'Badge en cours...' : 'Badger'}
      </button>
      {latitude !== null && longitude !== null && !geoError && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          Position GPS : {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </div>
      )}
      {message && <div style={{ marginTop: 16, fontWeight: 'bold', color: 'green' }}>{message}</div>}
      {error && <div style={{ marginTop: 16, fontWeight: 'bold', color: 'red' }}>{error}</div>}
    </form>
  );
};

export default BadgeForm; 