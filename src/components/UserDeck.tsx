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

  // Composant pour le filtre par lieu (dropdown discret)
 const LocationFilter: React.FC<{
   locations: string[];
   selectedLocation: string | null;
   onLocationSelect: (location: string | null) => void;
   userCounts: Record<string, number>;
 }> = ({ locations, selectedLocation, onLocationSelect, userCounts }) => {
   const [isOpen, setIsOpen] = useState(false);
   
   return (
     <div style={{
       position: 'relative',
       width: '100%',
       maxWidth: 800,
       margin: '0 auto 20px auto',
       boxSizing: 'border-box'
     }}>
       <button
         onClick={() => setIsOpen(!isOpen)}
         style={{
           width: '100%',
           padding: '8px 12px',
           background: '#fff',
           border: '1px solid #e0e0e0',
           borderRadius: '6px',
           cursor: 'pointer',
           fontSize: '14px',
           color: '#333',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
         }}
       >
         <span>
           {selectedLocation ? `${selectedLocation} (${userCounts[selectedLocation]})` : `Tous les lieux (${Object.values(userCounts).reduce((sum, count) => sum + count, 0)})`}
         </span>
         <span style={{ fontSize: '12px', color: '#666' }}>▼</span>
       </button>
       
       {isOpen && (
         <div style={{
           position: 'absolute',
           top: '100%',
           left: 0,
           right: 0,
           background: '#fff',
           border: '1px solid #e0e0e0',
           borderRadius: '6px',
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           zIndex: 1000,
           maxHeight: '300px',
           overflowY: 'auto'
         }}>
           <div
             onClick={() => {
               onLocationSelect(null);
               setIsOpen(false);
             }}
             style={{
               padding: '10px 12px',
               cursor: 'pointer',
               borderBottom: '1px solid #f0f0f0',
               background: selectedLocation === null ? '#f8f9fa' : 'transparent',
               fontWeight: selectedLocation === null ? '600' : '400'
             }}
           >
             Tous les lieux ({Object.values(userCounts).reduce((sum, count) => sum + count, 0)})
           </div>
           
           {locations.map((location) => (
             <div
               key={location}
               onClick={() => {
                 onLocationSelect(location);
                 setIsOpen(false);
               }}
               style={{
                 padding: '10px 12px',
                 cursor: 'pointer',
                 borderBottom: '1px solid #f0f0f0',
                 background: selectedLocation === location ? '#f8f9fa' : 'transparent',
                 fontWeight: selectedLocation === location ? '600' : '400',
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center'
               }}
             >
               <span style={{ 
                 textDecoration: location === 'Non badgé' ? 'italic' : 'normal',
                 opacity: location === 'Non badgé' ? 0.8 : 1
               }}>
                 {location}
               </span>
               <span style={{
                 background: '#e9ecef',
                 color: '#666',
                 padding: '2px 6px',
                 borderRadius: '12px',
                 fontSize: '11px',
                 fontWeight: '500'
               }}>
                 {userCounts[location]}
               </span>
             </div>
           ))}
         </div>
       )}
       
       {/* Overlay pour fermer le dropdown en cliquant ailleurs */}
       {isOpen && (
         <div
           onClick={() => setIsOpen(false)}
           style={{
             position: 'fixed',
             top: 0,
             left: 0,
             right: 0,
             bottom: 0,
             zIndex: 999
           }}
         />
       )}
     </div>
   );
 };

 // Composant pour afficher tous les utilisateurs groupés par lieu (sans sections)
 const UsersByLocation: React.FC<{
   groupedUsers: Record<string, Utilisateur[]>;
   sortedLocations: string[];
   onSelect: (user: Utilisateur) => void;
 }> = ({ groupedUsers, sortedLocations, onSelect }) => (
   <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
    {/* Grille de toutes les cartes */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 14,
      justifyContent: 'center',
      alignItems: 'start',
    }}>
      {sortedLocations.map((location) => 
        groupedUsers[location].map((user) => (
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
              position: 'relative'
            }}
                         onClick={() => onSelect(user)}
            onMouseOver={e => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(25,118,210,0.10)')}
            onMouseOut={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)')}
          >
                                                                {/* Indicateur de lieu avec code couleur */}
                                 <div style={{
                   position: 'absolute',
                   top: '-6px',
                   left: 0,
                   background: location === 'Entre-Deux' ? '#76B097' :
                              location === 'Bourg-Murat' ? '#B34B3D' :
                              location === 'Le Baril' ? '#0F6885' :
                              location === 'Manapany' ? '#DAB848' :
                              location === 'Télétravail' ? '#8B5A96' :
                              location === 'inconnu' ? '#6B7280' :
                              location === 'Non badgé' ? '#9CA3AF' : '#f0f0f0',
                   color: '#fff',
                   padding: '2px 6px',
                   borderRadius: '0 8px 8px 0',
                   fontSize: '13',
                   fontWeight: '500',
                   boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                   minWidth: 'fit-content',
                   maxWidth: '80px',
                   whiteSpace: 'nowrap',
                   overflow: 'hidden',
                   textOverflow: 'ellipsis',
                   zIndex: 1
                 }}>
                  {location}
                </div>
            
                                      {user.avatar ? (
                <img src={user.avatar} alt="avatar" style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  marginTop: 12,
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
                  marginTop: 12,
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
          </div>
        ))
      )}
    </div>
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
     const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

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
        .order('prenom', { ascending: true }); // Trier par prénom
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
          // log supprimé (bruit inutile en production)
          
          // Mettre à jour seulement l'utilisateur modifié
          if (payload.eventType === 'UPDATE') {
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.id === payload.new.id 
                  ? { ...user, ...payload.new }
                  : user
              ).sort((a, b) => a.prenom.localeCompare(b.prenom))
            );
          } else if (payload.eventType === 'INSERT') {
            // Ajouter le nouvel utilisateur
            setUsers(prevUsers => [...prevUsers, payload.new as Utilisateur].sort((a, b) => a.prenom.localeCompare(b.prenom)));
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
               let hasGpsData = false;
               let gpsErrorReason = '';
               let gpsErrorCode: string | null = null;
               
               try {
                 await new Promise<void>((resolve, reject) => {
                   if (!('geolocation' in navigator)) {
                     gpsErrorReason = 'GPS non supporté par le navigateur';
                     gpsErrorCode = 'UNSUPPORTED';
                     return resolve();
                   }
                   
                   navigator.geolocation.getCurrentPosition(
                     (pos) => {
                       // Limiter à 3 décimales maximum
                       latitude = Math.round(pos.coords.latitude * 1000) / 1000;
                       longitude = Math.round(pos.coords.longitude * 1000) / 1000;
                       hasGpsData = true;
                       resolve();
                     },
                     (error) => {
                       // Capturer les erreurs GPS spécifiques
                       switch (error.code) {
                         case 1:
                           gpsErrorCode = 'PERMISSION_DENIED';
                           gpsErrorReason = 'Permission GPS refusée par l\'utilisateur';
                           break;
                         case 2:
                           gpsErrorCode = 'POSITION_UNAVAILABLE';
                           gpsErrorReason = 'Position GPS temporairement indisponible';
                           break;
                         case 3:
                           gpsErrorCode = 'TIMEOUT';
                           gpsErrorReason = 'Timeout GPS (7 secondes dépassées)';
                           break;
                         default:
                           gpsErrorCode = 'UNKNOWN_ERROR';
                           gpsErrorReason = `Erreur GPS inconnue: ${error.message}`;
                       }
                       resolve();
                     },
                     { enableHighAccuracy: true, timeout: 7000 }
                   );
                 });
               } catch (error) {
                 gpsErrorCode = 'EXCEPTION';
                 gpsErrorReason = `Exception GPS: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
               }
               
                               // Le webhook GPS sera appelé seulement lors de l'enregistrement d'une entrée sans GPS
                // Pas besoin de l'appeler ici, on l'appellera après l'insertion réussie
               
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
                     // Appeler le webhook GPS seulement si pas de données GPS ET insertion réussie
                     if (!hasGpsData) {
                       try {
                         await fetch('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
                           method: 'POST',
                           headers: {
                             'Content-Type': 'application/json',
                           },
                           body: JSON.stringify({
                             user_email: user.email,
                             user_name: `${user.prenom} ${user.nom}`,
                             user_role: user.role,
                             badge_code: numero_badge,
                             timestamp: new Date().toISOString(),
                             message: 'Badgeage sans données GPS - notification envoyée',
                             gps_error_code: gpsErrorCode,
                             gps_error_reason: gpsErrorReason,
                             device_info: {
                               user_agent: navigator.userAgent,
                               platform: navigator.platform,
                               language: navigator.language
                             }
                           })
                         });
                       } catch (webhookError) {
                         console.error('Erreur webhook GPS:', webhookError);
                       }
                     }
                     
                     const gpsStatus = hasGpsData ? 'avec GPS' : 'sans GPS (webhook notifié)';
                     setSuccess(`Badge enregistré (entrée) pour ${user.prenom} ${user.nom} - ${gpsStatus}`);
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
                   // Appeler le webhook GPS seulement si pas de données GPS ET insertion réussie
                   if (!hasGpsData) {
                     try {
                       await fetch('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                           user_email: user.email,
                           user_name: `${user.prenom} ${user.nom}`,
                           user_role: user.role,
                           badge_code: numero_badge,
                           timestamp: new Date().toISOString(),
                           message: 'Badgeage sans données GPS - notification envoyée',
                           gps_error_code: gpsErrorCode,
                           gps_error_reason: gpsErrorReason,
                           device_info: {
                             user_agent: navigator.userAgent,
                             platform: navigator.platform,
                             language: navigator.language
                           }
                         })
                       });
                     } catch (webhookError) {
                       console.error('Erreur webhook GPS:', webhookError);
                     }
                   }
                   
                   const gpsStatus = hasGpsData ? 'avec GPS' : 'sans GPS (webhook notifié)';
                   setSuccess(`Badge enregistré pour ${user.prenom} ${user.nom} - ${gpsStatus}`);
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
                   // Appeler le webhook GPS seulement si pas de données GPS ET insertion réussie
                   if (!hasGpsData) {
                     try {
                       await fetch('https://n8n.otisud.re/webhook/09c6d45a-fe1a-46ea-a951-1fb833065b55', {
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                         },
                         body: JSON.stringify({
                           user_email: user.email,
                           user_name: `${user.prenom} ${user.nom}`,
                           user_role: user.role,
                           badge_code: numero_badge,
                           timestamp: new Date().toISOString(),
                           message: 'Badgeage sans données GPS - notification envoyée',
                           gps_error_code: gpsErrorCode,
                           gps_error_reason: gpsErrorReason,
                           device_info: {
                             user_agent: navigator.userAgent,
                             platform: navigator.platform,
                             language: navigator.language
                           }
                         })
                       });
                     } catch (webhookError) {
                       console.error('Erreur webhook GPS:', webhookError);
                     }
                   }
                   
                   const gpsStatus = hasGpsData ? 'avec GPS' : 'sans GPS (webhook notifié)';
                   setSuccess(`Badge enregistré (Télétravail) pour ${user.prenom} ${user.nom} - ${gpsStatus}`);
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

  // Grouper les utilisateurs par lieu et trier par prénom
  const groupedUsers = filteredUsers.reduce((groups, user) => {
    const location = user.lieux || 'Non badgé';
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(user);
    return groups;
  }, {} as Record<string, Utilisateur[]>);

  // Trier les lieux (Non badgé en dernier)
  const sortedLocations = Object.keys(groupedUsers).sort((a, b) => {
    if (a === 'Non badgé') return 1;
    if (b === 'Non badgé') return -1;
    return a.localeCompare(b);
  });

  // Trier les utilisateurs dans chaque groupe par prénom
  Object.keys(groupedUsers).forEach(location => {
    groupedUsers[location].sort((a, b) => a.prenom.localeCompare(b.prenom));
  });

  // Créer un objet avec les comptes d'utilisateurs par lieu
  const userCounts = Object.keys(groupedUsers).reduce((counts, location) => {
    counts[location] = groupedUsers[location].length;
    return counts;
  }, {} as Record<string, number>);

  const handleLocationSelect = (location: string | null) => {
    setSelectedLocation(location);
  };

  // Filtrer les utilisateurs selon le lieu sélectionné
  const filteredGroupedUsers = selectedLocation 
    ? { [selectedLocation]: groupedUsers[selectedLocation] || [] }
    : groupedUsers;

  const filteredSortedLocations = selectedLocation 
    ? [selectedLocation]
    : sortedLocations;

  

     if (loading) return <div>Chargement...</div>;

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
         <div style={{ position: 'relative', width: '100%', maxWidth: 800 }}>
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
      
      

             {/* Filtre discret */}
       <LocationFilter
         locations={sortedLocations}
         selectedLocation={selectedLocation}
         onLocationSelect={handleLocationSelect}
         userCounts={userCounts}
       />
       
       {/* Grille des utilisateurs */}
       <UsersByLocation
         groupedUsers={filteredGroupedUsers}
         sortedLocations={filteredSortedLocations}
         onSelect={onSelect}
       />
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 8 }}>
        <NfcLogo />
      </div>
    </div>
  );
};

export default UserDeck; 