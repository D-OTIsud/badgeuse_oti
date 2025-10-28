import React, { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import UserDeck from './components/UserDeck';
import BadgeForm from './components/BadgeForm';
import Header from './components/Header';
import { supabase } from './supabaseClient';
import { checkIPAuthorization, getWelcomeMessage } from './services/ipService';
import AdminPage from './components/AdminPage';
import LottieLoader from './components/LottieLoader';
import UserPortal from './components/UserPortal';

export type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  service?: string;
  email: string;
  status?: string | null;
  avatar?: string | null;
  role?: string;
  lieux?: string | null;
  numero_badge?: string;
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
  const [ipCheck, setIpCheck] = useState<{
    isAuthorized: boolean;
    locationName?: string;
    userIP: string;
    latitude?: string;
    longitude?: string;
  } | null>(null);
  const [ipCheckLoading, setIpCheckLoading] = useState(true);
  const [deckKey, setDeckKey] = useState(Date.now());
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [showPortalFor, setShowPortalFor] = useState<Utilisateur | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // MOCK : à remplacer par la vraie logique d'authentification/autorisation
  const isAdmin = true;

  const handleSelectUser = useCallback(async (user: Utilisateur) => {
    setLoading(true);
    setWebhookError(null);
    
    // Check if there's an active session and if the user matches
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user?.email) {
      const authedEmail = session.user.email.toLowerCase();
      const cardEmail = user.email.toLowerCase();
      
      if (authedEmail !== cardEmail) {
        // User clicked on a different card - terminate their session immediately
        console.log('User clicked on different card, terminating session');
        await supabase.auth.signOut();
        setSession(null);
        setShowPortalFor(null);
        // Clear any stored portal user
        try {
          localStorage.removeItem('portalUser');
        } catch {}
      }
    }
    
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
    
    // Appel webhook une fois lors du clic sur carte pour envoyer le code
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
  }, [ipCheck]);

  // Nouvelle version : onBack peut recevoir un message de succès
  // Vérification de l'IP au chargement de l'app
  useEffect(() => {
    const checkIP = async () => {
      try {
        const result = await checkIPAuthorization();
        setIpCheck(result);
      } catch (error) {
        console.error('Erreur lors de la vérification IP:', error);
        // En cas d'erreur, on autorise l'accès par défaut
        setIpCheck({
          isAuthorized: true,
          userIP: '127.0.0.1'
        });
      } finally {
        setIpCheckLoading(false);
      }
    };
    
    checkIP();
  }, []);

  // Check Supabase session on mount and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If we have a session (OAuth completed in a popup or redirect), restore portal user and close popup
      try {
        if (session && !showPortalFor) {
          const raw = localStorage.getItem('portalUser');
          if (raw) {
            const user = JSON.parse(raw) as Utilisateur;
            // Ensure the authenticated user matches the selected card
            const authedEmail = session.user?.email || '';
            if (authedEmail && user.email && authedEmail.toLowerCase() === user.email.toLowerCase()) {
              setShowPortalFor(user);
            } else {
              // User doesn't match - clear localStorage and don't open portal
              console.log('Authenticated user email does not match selected card user');
            }
            localStorage.removeItem('portalUser');
          }
        }
        const anyWindow: any = window as any;
        if (anyWindow.__oauthPopup && !anyWindow.__oauthPopup.closed) {
          anyWindow.__oauthPopup.close();
          anyWindow.__oauthPopup = null;
        }
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('oauth') === '1') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch {}
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If session established after OAuth (popup or redirect), restore portal user and close popup
      try {
        if (session && !showPortalFor) {
          const raw = localStorage.getItem('portalUser');
          if (raw) {
            const user = JSON.parse(raw) as Utilisateur;
            const authedEmail = session.user?.email || '';
            if (authedEmail && user.email && authedEmail.toLowerCase() === user.email.toLowerCase()) {
              setShowPortalFor(user);
            } else {
              // User doesn't match - clear localStorage and don't open portal
              console.log('Authenticated user email does not match selected card user');
            }
            localStorage.removeItem('portalUser');
          }
        }
        const anyWindow: any = window as any;
        if (anyWindow.__oauthPopup && !anyWindow.__oauthPopup.closed) {
          anyWindow.__oauthPopup.close();
          anyWindow.__oauthPopup = null;
        }
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('oauth') === '1') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch {}
    });

    return () => subscription.unsubscribe();
  }, []);

  // Full-page redirect flow: handle return from OAuth, open portal immediately
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isOAuthReturn = urlParams.get('oauth') === '1';
      const isAdminOAuthReturn = urlParams.get('admin_oauth') === '1';
      
      if (isOAuthReturn) {
        (async () => {
          try {
            const anyAuth: any = supabase.auth as any;
            if (typeof anyAuth.exchangeCodeForSession === 'function') {
              await anyAuth.exchangeCodeForSession();
            } else {
              await supabase.auth.getSession();
            }
          } catch {}
          // Restore user and clean URL
          const raw = localStorage.getItem('portalUser');
          if (raw) {
            const user = JSON.parse(raw) as Utilisateur;
            // Verify current session matches selected user email
            const { data: s } = await supabase.auth.getSession();
            const authedEmail = s.session?.user?.email || '';
            if (authedEmail && user.email && authedEmail.toLowerCase() === user.email.toLowerCase()) {
              setShowPortalFor(user);
            } else {
              // User doesn't match - clear localStorage and don't open portal
              // This allows the new user to see the connection button again
              console.log('Authenticated user email does not match selected card user');
            }
            localStorage.removeItem('portalUser');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })();
      } else if (isAdminOAuthReturn) {
        (async () => {
          try {
            const anyAuth: any = supabase.auth as any;
            if (typeof anyAuth.exchangeCodeForSession === 'function') {
              await anyAuth.exchangeCodeForSession();
            } else {
              await supabase.auth.getSession();
            }
          } catch {}
          // Restore admin user and clean URL
          const raw = localStorage.getItem('adminUser');
          if (raw) {
            const adminUser = JSON.parse(raw);
            // Verify current session matches selected admin email
            const { data: s } = await supabase.auth.getSession();
            const authedEmail = s.session?.user?.email || '';
            if (authedEmail && adminUser.email && authedEmail.toLowerCase() === adminUser.email.toLowerCase()) {
              // Admin OAuth successful - the AdminPage component will handle the rest
              console.log('Admin OAuth successful for:', adminUser.email);
            } else {
              console.log('Authenticated user email does not match selected admin user');
            }
            localStorage.removeItem('adminUser');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })();
      }
    } catch {}
  }, []);



  const handleBack = (successMsg?: string) => {
    setBadgeageCtx(null);
    setShowPortalFor(null);
    setWebhookError(null);
    // Forcer le rechargement du deck en ajoutant un timestamp
    setDeckKey(Date.now());
    if (successMsg) {
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowPortalFor(null);
  };

  // Affichage du chargement IP
  if (ipCheckLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fcf9f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LottieLoader />
      </div>
    );
  }

  // On ne bloque plus l'accès, on passe l'info d'autorisation IP au composant

  return (
    <div style={{ minHeight: '100vh', background: '#fcf9f3' }}>
      <Header 
        welcomeMessage={ipCheck ? getWelcomeMessage(ipCheck.locationName, ipCheck.isAuthorized) : undefined}
        onAdminClick={isAdmin ? () => setShowAdminPage(true) : undefined}
      />
      {showAdminPage ? (
        <AdminPage onClose={() => setShowAdminPage(false)} />
      ) : (
        <>
          {successMessage && <SuccessPopup message={successMessage} onClose={() => setSuccessMessage(null)} />}
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
            {loading && <div style={{ color: '#1976d2', marginBottom: 16 }}>Connexion au badge...</div>}
            {webhookError && <div style={{ color: 'red', marginBottom: 16 }}>{webhookError}</div>}
            {showPortalFor && session ? (
              <UserPortal utilisateur={showPortalFor} onClose={() => setShowPortalFor(null)} onLogout={handleLogout} />
            ) : badgeageCtx ? (
              <BadgeForm
                utilisateur={badgeageCtx.utilisateur}
                badgeId={badgeageCtx.badgeId}
                heure={badgeageCtx.heure}
                onBack={handleBack}
                onConnect={(u) => { setShowPortalFor(u); setBadgeageCtx(null); }}
                isIPAuthorized={ipCheck?.isAuthorized ?? true}
                userIP={ipCheck?.userIP}
                locationLatitude={ipCheck?.latitude}
                locationLongitude={ipCheck?.longitude}
                locationName={ipCheck?.locationName}
              />
            ) : (
              <UserDeck key={deckKey} onSelect={handleSelectUser} isIPAuthorized={ipCheck?.isAuthorized ?? true} locationName={ipCheck?.locationName} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App; 