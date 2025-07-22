import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Utilisateur } from '../App';
import LottieLoader from './LottieLoader';

interface BadgeFormProps {
  utilisateur: Utilisateur;
  badgeId: string;
  heure: Date;
  onBack: (message?: string) => void;
  isIPAuthorized?: boolean;
  userIP?: string;
  locationLatitude?: string;
  locationLongitude?: string;
  locationName?: string;
  badgeMethod?: 'manual' | 'nfc'; // Ajout de la méthode de badge
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

const BadgeForm: React.FC<BadgeFormProps> = ({ utilisateur, badgeId, heure, onBack, isIPAuthorized = true, userIP, locationLatitude, locationLongitude, locationName, badgeMethod = 'manual' }) => {
  const [code, setCode] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [gpsConsent, setGpsConsent] = useState(true);
  const [typeAction, setTypeAction] = useState<'entrée' | 'sortie' | 'pause' | 'retour'>('entrée');

  // Détection des rôles
  const isManagerOrAdmin = utilisateur.role === 'Manager' || utilisateur.role === 'Admin';
  const isAE = utilisateur.role === 'A-E';
  const isFirstBadgeAE = isAE && !utilisateur.lieux;

  // GPS options selon le rôle
  const gpsOptions = isAE ? { enableHighAccuracy: false, timeout: 10000 } : { enableHighAccuracy: true, timeout: 10000 };

  // Masquer le champ type d'action si le lieu est connu (locationName défini ou Admin/Manager sur réseau inconnu)
  const lieuConnu = (isManagerOrAdmin && !isIPAuthorized) || (isIPAuthorized && locationName);

  // Appel du webhook à l'ouverture du formulaire (toujours, sans condition)
  React.useEffect(() => {
    if (utilisateur.role && utilisateur.role !== 'A-E') {
      (async () => {
        try {
          console.log('[WEBHOOK] Appel webhook n8n (ouverture formulaire)...');
          const res = await fetch('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              utilisateur_id: utilisateur.id,
              badge_id: badgeId,
              user_email: utilisateur.email,
            }),
          });
          console.log('[WEBHOOK] Réponse webhook', res.status, res.statusText);
        } catch (e: any) {
          console.error('Erreur webhook (ouverture formulaire):', e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // Si IP autorisée, utiliser les coordonnées de la base de données
    if (isIPAuthorized && locationLatitude && locationLongitude) {
      setLatitude(parseFloat(locationLatitude));
      setLongitude(parseFloat(locationLongitude));
      return;
    }
    // Pour Manager/Admin ou A-E, GPS obligatoire (précision selon rôle)
    if ((!isIPAuthorized && isManagerOrAdmin) || isAE) {
      if (!('geolocation' in navigator)) {
        setGeoError('La géolocalisation n\'est pas supportée par ce navigateur.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Précision réduite si A-E
          const lat = isAE ? Number(pos.coords.latitude.toFixed(3)) : pos.coords.latitude;
          const lon = isAE ? Number(pos.coords.longitude.toFixed(3)) : pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lon);
        },
        (err) => {
          setGeoError("Impossible d'obtenir la position GPS : " + err.message);
        },
        gpsOptions
      );
      return;
    }
    // Si IP non autorisée (autres rôles), ne pas récupérer automatiquement les coordonnées
    if (!isIPAuthorized) {
      return;
    }
    // Pour IP autorisée sans coordonnées en base, récupérer automatiquement
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
  }, [isIPAuthorized, locationLatitude, locationLongitude, isManagerOrAdmin, isAE]);

  // Forcer type_action à "entrée" pour le premier badgeage A-E
  React.useEffect(() => {
    if (isFirstBadgeAE) setTypeAction('entrée');
  }, [isFirstBadgeAE]);

  const heureStr = heure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    let finalLatitude = latitude;
    let finalLongitude = longitude;
    // Pour Manager/Admin ou A-E, GPS obligatoire (précision selon rôle)
    if ((!isIPAuthorized && isManagerOrAdmin) || isAE) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!('geolocation' in navigator)) {
            reject(new Error('Géolocalisation non supportée'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, gpsOptions);
        });
        finalLatitude = isAE ? Number(position.coords.latitude.toFixed(3)) : position.coords.latitude;
        finalLongitude = isAE ? Number(position.coords.longitude.toFixed(3)) : position.coords.longitude;
      } catch (error) {
        console.error('Erreur lors de la récupération GPS:', error);
      }
    }
    // Préparation des données à insérer
    // Pour A-E, toujours transmettre code auto (jamais de champ code saisi)
    const codeToSend = isAE ? utilisateur.numero_badge : (code || (badgeMethod === 'nfc' ? utilisateur.numero_badge : ''));
    const insertData: any = {
      utilisateur_id: utilisateur.id,
      code: codeToSend,
      latitude: finalLatitude,
      longitude: finalLongitude,
      commentaire: (!isManagerOrAdmin && !isAE && !isIPAuthorized) ? commentaire || null : null,
      lieux: (isManagerOrAdmin && !isIPAuthorized) ? 'Télétravail' : (isIPAuthorized && locationName ? locationName : undefined),
    };
    // Pour A-E, toujours transmettre type_action (entrée si premier badgeage, sinon valeur du dropdown)
    if (isAE) {
      insertData.type_action = isFirstBadgeAE ? 'entrée' : typeAction;
    } else if (!lieuConnu) {
      insertData.type_action = typeAction;
    }
    const { error: insertError } = await supabase.from('appbadge_badgeages').insert(insertData);
    if (!insertError) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onBack(`Bonne journée ${utilisateur.prenom} !`);
      }, 0);
      setCode('');
    } else {
      setError("Erreur : badge non enregistré. Vérifiez le code ou contactez l'administrateur.");
    }
    setLoading(false);
  };

  const codeArr = splitCode(code);

  // Affichage conditionnel des champs
  // Pour A-E :
  // - Premier badgeage : pas de champ code, pas de champ type d'action, mais transmettre code (auto), utilisateur_id, GPS, type_action = 'entrée'
  // - Après : uniquement champ type d'action, pas de champ code, transmettre code (auto), utilisateur_id, GPS, type_action (choisi)
  // Pour les autres rôles : comportement classique
  const showCodeInput = !isAE;
  // Pour A-E, deuxième badgeage : afficher uniquement le dropdown type d'action
  const showTypeAction = (isAE && !isFirstBadgeAE) || (!isAE && !lieuConnu);
  // Correction : Admin/Manager ne voient jamais les avertissements ni commentaire ni case GPS
  const showCommentaire = !isManagerOrAdmin && !isAE && !isIPAuthorized;
  const showAvertissement = !isManagerOrAdmin && !isAE && !isIPAuthorized;
  const showGeoBlock = !isManagerOrAdmin && !isAE && !isIPAuthorized;

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 2000
        }}>
          <LottieLoader />
        </div>
      )}
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
        <button type="button" onClick={() => window.location.reload()} style={{ marginBottom: 16, alignSelf: 'flex-start', background: 'none', border: 'none', color: '#1976d2', fontSize: 22, cursor: 'pointer' }}>
          ← Retour
        </button>
        {/* AVATAR, NOM, EMAIL */}
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
        {/* CODE à 4 chiffres */}
        {showCodeInput && !isAE && (
          <div style={{ marginBottom: 18, fontSize: 17, width: '100%' }}>
            Saisissez le code à 4 chiffres :
          </div>
        )}
        {showCodeInput && !isAE && (
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
        )}
        {/* TYPE D'ACTION */}
        {showTypeAction && (
          <div style={{ marginBottom: 18, width: '100%' }}>
            <label htmlFor="type-action-select" style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, display: 'block' }}>Type d'action :</label>
            <select
              id="type-action-select"
              value={typeAction}
              onChange={e => setTypeAction(e.target.value as any)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: '1.5px solid #bbb',
                fontSize: 16,
                marginBottom: 6
              }}
              required
              disabled={isFirstBadgeAE}
            >
              <option value="entrée">Entrée</option>
              <option value="sortie">Sortie</option>
              <option value="pause">Pause</option>
              <option value="retour">Retour</option>
            </select>
          </div>
        )}
        {/* AVERTISSEMENT reseau inconnu */}
        {showAvertissement && (
          <div style={{
            width: '100%',
            background: '#fff3cd',
            border: '1.5px solid #ffeaa7',
            borderRadius: 8,
            color: '#856404',
            fontWeight: 700,
            fontSize: 16,
            padding: '12px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>⚠️</span> Vous n'êtes pas connecté au réseau WiFi d'un kit
          </div>
        )}
        {/* COMMENTAIRE obligatoire */}
        {showCommentaire && (
          <div style={{ marginBottom: 22, width: '100%' }}>
            <div style={{ marginBottom: 8, fontSize: 15, color: '#666', fontWeight: 500 }}>
              Veuillez expliquer pourquoi vous accédez depuis cet emplacement :
            </div>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Expliquez pourquoi vous accédez depuis cet emplacement..."
              style={{
                width: '100%',
                minHeight: 80,
                padding: 12,
                border: '1.5px solid #d32f2f',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                background: '#fff8f8',
              }}
              required={showCommentaire}
            />
          </div>
        )}
        {/* GÉOLOCALISATION bloc + case à cocher */}
        {showGeoBlock && (
          <div style={{ marginBottom: 16, width: '100%' }}>
            <div style={{ 
              padding: 12, 
              backgroundColor: '#fffbe6', 
              border: '1px solid #ffeaa7', 
              borderRadius: 8,
              marginBottom: 8
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#856404', marginBottom: 4 }}>
                ⚠️ Géolocalisation
              </div>
              <div style={{ fontSize: 12, color: '#856404' }}>
                Pour des raisons de sécurité, nous devons relever vos coordonnées GPS. 
                Cela peut donner suite à une alerte RH.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={gpsConsent}
                onChange={(e) => setGpsConsent(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              J'accepte que les coordonnées GPS soient transmises
            </label>
          </div>
        )}
        {/* BOUTON BADGER */}
        <button type="submit" disabled={loading || (showCodeInput && code.length !== 4) || !!geoError || (showCommentaire && !commentaire.trim())} style={{
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
    </>
  );
};

export default BadgeForm; 