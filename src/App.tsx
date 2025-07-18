import React, { useState } from 'react';
import UserDeck from './components/UserDeck';
import BadgeForm from './components/BadgeForm';
import Header from './components/Header';
import { supabase } from './supabaseClient';

export type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  service?: string;
  email: string;
  status?: string | null;
  avatar?: string | null;
};

export type BadgeageContext = {
  utilisateur: Utilisateur;
  badgeId: string;
  heure: Date;
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

function App() {
  const [badgeageCtx, setBadgeageCtx] = useState<BadgeageContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelectUser = async (user: Utilisateur) => {
    setLoading(true);
    setWebhookError(null);
    // Récupérer le badge actif
    const { data: badges, error: badgeError } = await supabase
      .from('appbadge_badges')
      .select('id')
      .eq('utilisateur_id', user.id)
      .eq('actif', true)
      .limit(1);
    if (badgeError || !badges || badges.length === 0) {
      setWebhookError("Aucun badge actif trouvé pour cet utilisateur.");
      setLoading(false);
      return;
    }
    const badgeId = badges[0].id;
    // Appel webhook
    try {
      await fetch('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilisateur_id: user.id,
          badge_id: badgeId,
          user_email: user.email,
        }),
      });
    } catch (e) {
      setWebhookError("Erreur lors de l'appel au webhook. Veuillez réessayer.");
      setLoading(false);
      return;
    }
    setBadgeageCtx({ utilisateur: user, badgeId, heure: new Date() });
    setLoading(false);
  };

  // Nouvelle version : onBack peut recevoir un message de succès
  const handleBack = (successMsg?: string) => {
    setBadgeageCtx(null);
    setWebhookError(null);
    if (successMsg) {
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fcf9f3' }}>
      <Header />
      {successMessage && <SuccessPopup message={successMessage} onClose={() => setSuccessMessage(null)} />}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {loading && <div style={{ color: '#1976d2', marginBottom: 16 }}>Connexion au badge...</div>}
        {webhookError && <div style={{ color: 'red', marginBottom: 16 }}>{webhookError}</div>}
        {badgeageCtx ? (
          <BadgeForm
            utilisateur={badgeageCtx.utilisateur}
            badgeId={badgeageCtx.badgeId}
            heure={badgeageCtx.heure}
            onBack={handleBack}
          />
        ) : (
          <UserDeck onSelect={handleSelectUser} />
        )}
      </div>
    </div>
  );
}

export default App; 