import React, { useState } from 'react';
import UserDeck from './components/UserDeck';
import BadgeForm from './components/BadgeForm';
import { supabase } from './supabaseClient';

export type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  service?: string;
  email: string;
  statut?: string | null;
  avatar?: string | null;
};

export type BadgeageContext = {
  utilisateur: Utilisateur;
  badgeId: string;
  heure: Date;
};

function App() {
  const [badgeageCtx, setBadgeageCtx] = useState<BadgeageContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

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
      const resp = await fetch('https://n8n.otisud.re/webhook/a83f4c49-f3a5-4573-9dfd-4ab52fed6874', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilisateur_id: user.id,
          badge_id: badgeId,
          user_email: user.email,
        }),
      });
      if (!resp.ok) throw new Error('Erreur webhook');
      setBadgeageCtx({ utilisateur: user, badgeId, heure: new Date() });
    } catch (e) {
      setWebhookError("Erreur lors de l'appel au webhook. Veuillez réessayer.");
    }
    setLoading(false);
  };

  const handleBack = () => {
    setBadgeageCtx(null);
    setWebhookError(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Badgeuse OTI</h1>
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
  );
}

export default App; 