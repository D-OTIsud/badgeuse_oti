import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Utilisateur } from '../App';
import LottieLoader from './LottieLoader';

// Logo NFC SVG
const NfcLogo = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.5 }}>
    <circle cx="16" cy="16" r="16" fill="#1976d2" />
    <path d="M10 16a6 6 0 0 1 12 0" stroke="#fff" strokeWidth="2" fill="none" />
    <path d="M13 16a3 3 0 0 1 6 0" stroke="#fff" strokeWidth="2" fill="none" />
    <circle cx="16" cy="16" r="1.2" fill="#fff" />
  </svg>
);

type Props = {
  onSelect: (user: Utilisateur) => void;
  isIPAuthorized?: boolean;
  locationName?: string;
};

const isNfcSupported = () => {
  // @ts-ignore
  return typeof window !== 'undefined' && 'NDEFReader' in window;
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

const UserDeck: React.FC<Props> = ({ onSelect, isIPAuthorized = true, locationName }) => {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nfcAbortRef = useRef<AbortController | null>(null);
  const [nfcLoading, setNfcLoading] = useState(false);
  
  // États pour la vérification des permissions
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt');
  const [nfcPermission, setNfcPermission] = useState<'granted' | 'denied' | 'unsupported'>('unsupported');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setSearch(''); // Réinitialiser la recherche
      setNfcMessage(null); // Réinitialiser les messages NFC
      setSuccess(null); // Réinitialiser les messages de succès
      const { data, error } = await supabase
        .from('appbadge_utilisateurs')
        .select('id, nom, prenom, service, email, status, avatar, lieux, role')
        .eq('actif', true)
        .order('nom', { ascending: true });
      if (!error && data) setUsers(data);
      setLoading(false);
    };
    
    fetchUsers();
    
    // Subscription en temps réel pour les changements de statut
    const subscription = supabase
      .channel('user_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appbadge_utilisateurs',
          filter: 'actif=eq.true'
        },
        (payload) => {
          console.log('Changement détecté:', payload);
          
          // Mettre à jour seulement l'utilisateur modifié
          if (payload.eventType === 'UPDATE') {
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.id === payload.new.id 
                  ? { ...user, ...payload.new }
                  : user
              )
            );
          } else if (payload.eventType === 'INSERT') {
            // Ajouter le nouvel utilisateur
            setUsers(prevUsers => [...prevUsers, payload.new as Utilisateur].sort((a, b) => a.nom.localeCompare(b.nom)));
          } else if (payload.eventType === 'DELETE') {
            // Supprimer l'utilisateur
            setUsers(prevUsers => prevUsers.filter(user => user.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    // Nettoyer la subscription à la fin
    return () => {
      subscription.unsubscribe();
    };
  }, [isIPAuthorized]); // Ajouter isIPAuthorized comme dépendance pour forcer le rechargement

  // Vérification des permissions au chargement
  useEffect(() => {
    const checkPermissions = async () => {
      // Vérifier la permission GPS
      if ('geolocation' in navigator) {
        try {
          // Tester la permission GPS
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          setGpsPermission('granted');
        } catch (error: any) {
          if (error.code === 1) {
            setGpsPermission('denied');
          } else {
            setGpsPermission('prompt');
          }
        }
      } else {
        setGpsPermission('unsupported');
      }

      // Vérifier la permission NFC
      if (isNfcSupported()) {
        try {
          const NDEFReader = (window as any).NDEFReader;
          const ndef = new NDEFReader();
          // Essayer de scanner pour tester la permission
          await ndef.scan();
          setNfcPermission('granted');
        } catch (error) {
          setNfcPermission('denied');
        }
      } else {
        setNfcPermission('unsupported');
      }

      setPermissionsChecked(true);
    };

    checkPermissions();
  }, []);

  // NFC listener auto (background, silencieux)
  useEffect(() => {
    if (!isNfcSupported()) return;
    const NDEFReader = (window as any).NDEFReader;
    const controller = new AbortController();
    nfcAbortRef.current = controller;
    const listenNfc = async () => {
      try {
        const ndef = new NDEFReader();
        await ndef.scan({ signal: controller.signal });
        ndef.onreading = async (event: any) => {
          let uid = event.serialNumber || (event.target && event.target.serialNumber);
          if (!uid) {
            setNfcMessage('Tag scanné, mais aucun numéro de série (UID) trouvé.');
            return;
          }
          setNfcMessage('Tag scanné. Numéro de série : ' + uid);
          setNfcLoading(true);
          
          // Chercher le badge actif avec ce uid_tag
          const { data: badges, error: badgeError } = await supabase
            .from('appbadge_badges')
            .select('id, utilisateur_id, numero_badge')
            .eq('uid_tag', uid)
            .eq('actif', true)
            .limit(1);
          if (!badgeError && badges && badges.length > 0) {
            const { utilisateur_id, numero_badge } = badges[0];
            // Chercher l'utilisateur
            const { data: usersFound, error: userError } = await supabase
              .from('appbadge_utilisateurs')
              .select('id, nom, prenom, service, email, status, avatar, role, lieux')
              .eq('id', utilisateur_id)
              .limit(1);
            if (!userError && usersFound && usersFound.length > 0) {
              const user = usersFound[0];
              // Récupérer la position GPS
              let latitude: number | null = null;
              let longitude: number | null = null;
              try {
                await new Promise<void>((resolve) => {
                  if (!('geolocation' in navigator)) return resolve();
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      latitude = pos.coords.latitude;
                      longitude = pos.coords.longitude;
                      resolve();
                    },
                    () => resolve(),
                    { enableHighAccuracy: true, timeout: 7000 }
                  );
                });
              } catch {}
              // Logique selon l'autorisation IP
              const isManagerOrAdmin = user.role === 'Manager' || user.role === 'Admin';
              const isAE = user.role === 'A-E';
              const isFirstBadgeAE = isAE && !user.lieux;

              // Cas A-E :
              if (isAE) {
                if (isFirstBadgeAE) {
                  // Premier badgeage : badgeage direct
                  const insertData: any = {
                    utilisateur_id,
                    code: numero_badge,
                    latitude,
                    longitude,
                    type_action: 'entrée',
                  };
                  const { error: insertError } = await supabase.from('appbadge_badgeages').insert(insertData);
                  setNfcLoading(false);
                  if (!insertError) {
                    setSuccess(`Badge enregistré (entrée) pour ${user.prenom} ${user.nom}`);
                    setTimeout(() => setSuccess(null), 3000);
                    setNfcMessage(null);
                  } else {
                    setNfcMessage("Erreur lors de l'enregistrement du badge.");
                  }
                } else {
                  setNfcLoading(false);
                  // Après premier badgeage : rediriger vers le formulaire pour choisir le type d'action
                  onSelect(user);
                }
                return;
              }

              if (isIPAuthorized) {
                // IP autorisée : badgeage direct sans webhook
                const insertData: any = {
                  utilisateur_id,
                  code: numero_badge,
                  latitude,
                  longitude,
                };
                if (locationName) {
                  insertData.lieux = locationName;
                }
                // Pour A-E, transmettre type_action: 'entrée' uniquement si premier badgeage
                if (isFirstBadgeAE) {
                  insertData.type_action = 'entrée';
                }
                const { error: insertError } = await supabase.from('appbadge_badgeages').insert(insertData);
                setNfcLoading(false);
                if (!insertError) {
                  setSuccess(`Badge enregistré pour ${user.prenom} ${user.nom}`);
                  setTimeout(() => setSuccess(null), 3000);
                  setNfcMessage(null);
                } else {
                  setNfcMessage("Erreur lors de l'enregistrement du badge.");
                }
              } else if (isManagerOrAdmin) {
                // Admin/Manager sur réseau inconnu : badgeage direct, lieu = Télétravail, pas de webhook, pas de formulaire
                const insertData: any = {
                  utilisateur_id,
                  code: numero_badge,
                  latitude,
                  longitude,
                  lieux: 'Télétravail',
                };
                const { error: insertError } = await supabase.from('appbadge_badgeages').insert(insertData);
                setNfcLoading(false);
                if (!insertError) {
                  setSuccess(`Badge enregistré (Télétravail) pour ${user.prenom} ${user.nom}`);
                  setTimeout(() => setSuccess(null), 3000);
                  setNfcMessage(null);
                } else {
                  setNfcMessage("Erreur lors de l'enregistrement du badge.");
                }
              } else {
                // IP non autorisée : rediriger vers le formulaire avec commentaire obligatoire
                setNfcLoading(false);
                onSelect(user);
              }
            }
          } else {
            setNfcLoading(false);
            setNfcMessage("Aucun badge actif trouvé pour ce tag.");
          }
        };
      } catch (e) {
        // NFC non supporté ou refusé
        setNfcLoading(false);
      }
    };
    listenNfc();
    return () => {
      controller.abort();
    };
  }, []);

  // Filtrage utilisateurs
  const filteredUsers = users.filter(user => {
    const q = search.trim().toLowerCase();
    return (
      user.nom?.toLowerCase().includes(q) ||
      user.prenom?.toLowerCase().includes(q)
    );
  });

  // Composant de vérification des permissions
  const PermissionsCheck = () => {
    const requestGpsPermission = async () => {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        setGpsPermission('granted');
      } catch (error: any) {
        if (error.code === 1) {
          setGpsPermission('denied');
        }
      }
    };

    const requestNfcPermission = async () => {
      try {
        const NDEFReader = (window as any).NDEFReader;
        const ndef = new NDEFReader();
        await ndef.scan();
        setNfcPermission('granted');
      } catch (error) {
        setNfcPermission('denied');
      }
    };

    return (
      <div style={{
        background: '#fff',
        borderRadius: 16,
        maxWidth: 600,
        margin: '40px auto',
        padding: 32,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        textAlign: 'center'
      }}>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700 }}>Permissions requises</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          Pour fonctionner correctement, l'application a besoin d'accéder à votre position GPS et aux fonctionnalités NFC.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {/* GPS Permission */}
          <div style={{
            padding: 16,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#f8f8f8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>📍 Géolocalisation</span>
              <span style={{
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                background: gpsPermission === 'granted' ? '#4caf50' : 
                           gpsPermission === 'denied' ? '#f44336' : '#ff9800',
                color: '#fff'
              }}>
                {gpsPermission === 'granted' ? 'Autorisé' : 
                 gpsPermission === 'denied' ? 'Refusé' : 
                 gpsPermission === 'unsupported' ? 'Non supporté' : 'En attente'}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
              Nécessaire pour enregistrer votre position lors du badgeage
            </p>
            {gpsPermission === 'prompt' && (
              <button 
                onClick={requestGpsPermission}
                style={{
                  marginTop: 8,
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Autoriser la géolocalisation
              </button>
            )}
          </div>

          {/* NFC Permission */}
          <div style={{
            padding: 16,
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#f8f8f8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>📱 NFC</span>
              <span style={{
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                background: nfcPermission === 'granted' ? '#4caf50' : 
                           nfcPermission === 'denied' ? '#f44336' : '#ff9800',
                color: '#fff'
              }}>
                {nfcPermission === 'granted' ? 'Autorisé' : 
                 nfcPermission === 'denied' ? 'Refusé' : 'Non supporté'}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
              Nécessaire pour scanner les badges NFC
            </p>
            {nfcPermission === 'denied' && (
              <button 
                onClick={requestNfcPermission}
                style={{
                  marginTop: 8,
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                Réessayer NFC
              </button>
            )}
          </div>
        </div>

        <button 
          onClick={() => setPermissionsChecked(true)}
          disabled={gpsPermission === 'denied' && nfcPermission === 'denied'}
          style={{
            padding: '12px 24px',
            background: (gpsPermission === 'denied' && nfcPermission === 'denied') ? '#ccc' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: (gpsPermission === 'denied' && nfcPermission === 'denied') ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          Continuer
        </button>
      </div>
    );
  };

  if (loading) return <div>Chargement...</div>;
  
  // Afficher la vérification des permissions si pas encore vérifiées
  if (!permissionsChecked) {
    return <PermissionsCheck />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh', position: 'relative' }}>
      {nfcLoading && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.7)',
          zIndex: 3000
        }}>
          <LottieLoader />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 700 }}>
          <input
            type="text"
            placeholder="Rechercher par nom ou prénom..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontSize: 18,
              padding: '8px 38px 8px 12px',
              borderRadius: 6,
              border: '1px solid #ccc',
              width: '100%',
              boxSizing: 'border-box',
              background: '#fff',
            }}
          />
          <span style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#aaa',
            pointerEvents: 'none',
            fontSize: 20,
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="7" stroke="#aaa" strokeWidth="2" />
              <line x1="14.4142" y1="14" x2="18" y2="17.5858" stroke="#aaa" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
      </div>
      {nfcMessage && <div style={{ color: '#1976d2', marginBottom: 12 }}>{nfcMessage}</div>}
      {success && <SuccessPopup message={success} onClose={() => setSuccess(null)} />}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 14,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'start',
          width: '100%',
          maxWidth: 700,
          margin: '0 auto',
        }}
      >
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: 12,
              padding: 10,
              minWidth: 0,
              maxWidth: 180,
              height: 140,
              maxHeight: 140,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              cursor: 'pointer',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'box-shadow 0.2s',
              marginBottom: 8,
              overflow: 'hidden',
              justifyContent: 'center',
            }}
            onClick={() => onSelect(user)}
            onMouseOver={e => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(25,118,210,0.10)')}
            onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)')}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="avatar" style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                marginBottom: 8, 
                objectFit: 'cover', 
                border: '2px solid #1976d2',
                boxShadow: '0 2px 8px rgba(25,118,210,0.15)'
              }} />
            ) : (
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%', 
                marginBottom: 8, 
                background: '#f4f6fa', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 20, 
                color: '#bbb', 
                border: '2px solid #1976d2',
                boxShadow: '0 2px 8px rgba(25,118,210,0.15)'
              }}>
                👤
              </div>
            )}
            <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{user.prenom} {user.nom}</div>
            <div style={{ color: '#555', fontSize: 10, marginBottom: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{user.service}</div>
            <div style={{ fontSize: 9, color: '#888', marginBottom: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{user.email}</div>
            <div style={{ 
              marginTop: 4, 
              fontSize: 10, 
              fontWeight: 500, 
              textAlign: 'center', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}>
              <div style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: user.status === 'Entré' ? '#4caf50' : 
                               user.status === 'En pause' ? '#ff9800' : '#cccccc'
              }} />
              <span style={{ 
                color: user.status === 'Entré' ? '#4caf50' : 
                       user.status === 'En pause' ? '#ff9800' : '#cccccc'
              }}>
                {user.status === 'Entré' ? 'Actif' : (user.status || 'Non badgé')}
              </span>
            </div>
            {user.lieux && (
              <div style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {user.lieux}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 8 }}>
        <NfcLogo />
      </div>
    </div>
  );
};

export default UserDeck; 