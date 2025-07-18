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
    setBadgeageCtx({ utilisateur: user, badgeId, heure: new Date() });
    setLoading(false);
  };

  const handleBack = () => {
    setBadgeageCtx(null);
    setWebhookError(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fcf9f3' }}>
      <Header />
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