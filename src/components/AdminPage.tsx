import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Composant popup de succès
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

const AdminPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Liste des utilisateurs actifs
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [nfcTag, setNfcTag] = useState('');
  const [lieu, setLieu] = useState('');
  const [ip, setIp] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [message, setMessage] = useState('');

  // Admin NFC auth
  const [adminUser, setAdminUser] = useState<any>(null);
  const [nfcAuthError, setNfcAuthError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);

  // Section de l'administration actuelle
  const [adminSection, setAdminSection] = useState<string | null>(null);

  // Popup de succès
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Recherche utilisateur pour le menu déroulant
  const [userSearch, setUserSearch] = useState('');
  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase();
    return (
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q)
    );
  });

  // Fonction pour afficher le popup de succès et revenir à la page d'administration
  const showSuccessAndReturn = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setAdminSection(null); // Revenir à la page d'administration
      setMessage(''); // Réinitialiser les messages
      setNfcTag(''); // Réinitialiser le tag NFC
      setSelectedUser(''); // Réinitialiser la sélection d'utilisateur
      setLieu(''); // Réinitialiser le lieu
    }, 2000);
  };

  // Récupérer la liste des utilisateurs actifs au montage
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('appbadge_utilisateurs')
        .select('id, nom, prenom, role, actif, avatar')
        .eq('actif', true)
        .order('nom', { ascending: true });
      if (!error && data) setUsers(data);
    };
    fetchUsers();
  }, []);

  // NFC scan pour authentification admin
  const handleAdminNfcScan = async () => {
    setIsScanning(true);
    setNfcAuthError('');
    setMessage('');
    setNfcTag('');
    if (!('NDEFReader' in window)) {
      setNfcAuthError('NFC non supporté sur ce navigateur/appareil.');
      setIsScanning(false);
      return;
    }
    try {
      const NDEFReader = (window as any).NDEFReader;
      const controller = new AbortController();
      nfcAbortRef.current = controller;
      const ndef = new NDEFReader();
      await ndef.scan({ signal: controller.signal });
      ndef.onreading = async (event: any) => {
        let uid = event.serialNumber || (event.target && event.target.serialNumber);
        if (!uid) {
          setNfcAuthError('Tag scanné, mais aucun numéro de série (UID) trouvé.');
          setIsScanning(false);
          return;
        }
        setNfcTag(uid);
        // Recherche du badge dans la table appbadge_badges
        const { data: badges } = await supabase
          .from('appbadge_badges')
          .select('utilisateur_id')
          .eq('uid_tag', uid)
          .eq('actif', true)
          .limit(1);
        if (!badges || badges.length === 0) {
          setNfcAuthError('Badge inconnu ou inactif.');
          setIsScanning(false);
          return;
        }
        const utilisateurId = badges[0].utilisateur_id;
        // Recherche de l'utilisateur (on veut le champ role)
        const { data: usersFound } = await supabase
          .from('appbadge_utilisateurs')
          .select('id, nom, prenom, role')
          .eq('id', utilisateurId)
          .limit(1);
        if (!usersFound || usersFound.length === 0) {
          setNfcAuthError('Utilisateur non trouvé.');
          setIsScanning(false);
          return;
        }
        const user = usersFound[0];
        if (user.role !== 'Admin') {
          setNfcAuthError('Accès refusé : vous n\'êtes pas administrateur.');
          setIsScanning(false);
          return;
        }
        setAdminUser(user);
        setIsScanning(false);
        if (nfcAbortRef.current) nfcAbortRef.current.abort();
      };
    } catch (e) {
      setNfcAuthError('Erreur lors du scan NFC.');
      setIsScanning(false);
    }
  };

  // Association NFC à un utilisateur
  const handleAssociateNfc = async () => {
    setIsAssociating(true);
    setMessage('');
    setNfcTag('');
    if (!('NDEFReader' in window)) {
      setMessage('NFC non supporté sur ce navigateur/appareil.');
      setIsAssociating(false);
      return;
    }
    try {
      const NDEFReader = (window as any).NDEFReader;
      const controller = new AbortController();
      nfcAbortRef.current = controller;
      const ndef = new NDEFReader();
      await ndef.scan({ signal: controller.signal });
      ndef.onreading = async (event: any) => {
        let uid = event.serialNumber || (event.target && event.target.serialNumber);
        if (!uid) {
          setMessage('Tag scanné, mais aucun numéro de série (UID) trouvé.');
          setIsAssociating(false);
          return;
        }
        setNfcTag(uid);
        // Insertion dans appbadge_badges
        const { error } = await supabase.from('appbadge_badges').insert({
          utilisateur_id: selectedUser,
          uid_tag: uid
        });
        if (!error) {
          showSuccessAndReturn('Badge associé avec succès !');
        } else {
          setMessage("Erreur lors de l'association du badge.");
        }
        setIsAssociating(false);
        if (nfcAbortRef.current) nfcAbortRef.current.abort();
      };
    } catch (e) {
      setMessage('Erreur lors du scan NFC.');
      setIsAssociating(false);
    }
  };

  // Nettoyage NFC à la fermeture
  useEffect(() => {
    return () => {
      if (nfcAbortRef.current) nfcAbortRef.current.abort();
    };
  }, []);

  // IP et GPS mock
  const handleGetIpGps = async () => {
    setIp('192.168.1.100');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toString());
          setLongitude(pos.coords.longitude.toString());
        },
        () => {
          setLatitude('');
          setLongitude('');
        }
      );
    }
  };

  // Réinitialiser le tag NFC à chaque ouverture du formulaire d'association
  useEffect(() => {
    if (adminSection === 'associer-tag') {
      setNfcTag('');
    }
  }, [adminSection]);

  // Récupération auto IP + GPS à l'ouverture du formulaire d'ajout de lieu
  useEffect(() => {
    if (adminSection === 'ajouter-lieu') {
      // IP via ipify
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setIp(data.ip))
        .catch(() => setIp(''));
      // GPS
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLatitude(pos.coords.latitude.toString());
            setLongitude(pos.coords.longitude.toString());
          },
          () => {
            setLatitude('');
            setLongitude('');
          }
        );
      }
    }
  }, [adminSection]);

  // Ajoute l'état pour le dropdown custom
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  // Ferme le dropdown si on clique en dehors
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const el = document.getElementById('admin-user-dropdown');
      if (el && !el.contains(e.target as Node)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserDropdown]);

  // État pour le formulaire d'horaires standards
  const [horaireLieu, setHoraireLieu] = useState('');
  const [horaireHeureDebut, setHoraireHeureDebut] = useState('');
  const [horaireHeureFin, setHoraireHeureFin] = useState('');
  const [horaireIp, setHoraireIp] = useState('');
  const [horaireLatitude, setHoraireLatitude] = useState('');
  const [horaireLongitude, setHoraireLongitude] = useState('');

  // Formulaire d'ajout d'horaires standards
  if (adminSection === 'ajouter-horaire') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Ajouter un horaire standard</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Lieu</label>
          <input value={horaireLieu} onChange={e => setHoraireLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de début *</label>
          <input type="time" value={horaireHeureDebut} onChange={e => setHoraireHeureDebut(e.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de fin</label>
          <input type="time" value={horaireHeureFin} onChange={e => setHoraireHeureFin(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Adresse IP (optionnel)</label>
          <input value={horaireIp} onChange={e => setHoraireIp(e.target.value)} placeholder="IP" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Latitude (optionnel)</label>
          <input value={horaireLatitude} onChange={e => setHoraireLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Longitude (optionnel)</label>
          <input value={horaireLongitude} onChange={e => setHoraireLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <button 
            onClick={async () => {
              if (!horaireLieu || !horaireHeureDebut) return;
              const { error } = await supabase.from('appbadge_horaires_standards').insert({
                lieux: horaireLieu,
                heure_debut: horaireHeureDebut,
                heure_fin: horaireHeureFin || null,
                ip_address: horaireIp || null,
                latitude: horaireLatitude || null,
                longitude: horaireLongitude || null
              });
              if (!error) {
                showSuccessAndReturn('Horaire ajouté avec succès !');
                setHoraireLieu(''); setHoraireHeureDebut(''); setHoraireHeureFin(''); setHoraireIp(''); setHoraireLatitude(''); setHoraireLongitude('');
              } else {
                setMessage("Erreur lors de l'ajout de l'horaire.");
              }
            }}
            disabled={!horaireLieu || !horaireHeureDebut} 
            style={{ marginTop: 18, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !horaireLieu || !horaireHeureDebut ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}
          >
            Ajouter l'horaire
          </button>
        </div>
        {message && <div style={{ color: '#1976d2', marginTop: 18, fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        <h2 style={{ marginTop: 0 }}>Authentification Admin</h2>
        <p>Veuillez scanner votre badge NFC admin pour accéder à la gestion.</p>
        <button onClick={handleAdminNfcScan} disabled={isScanning} style={{
          marginBottom: 12,
          fontSize: 18,
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '14px 0',
          fontWeight: 700,
          cursor: isScanning ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
          transition: 'background 0.2s',
          width: '100%',
        }}
          onMouseOver={e => (e.currentTarget.style.background = '#125ea2')}
          onMouseOut={e => (e.currentTarget.style.background = '#1976d2')}
        >
          {isScanning ? 'En attente du scan...' : 'Scanner mon badge'}
        </button>
        {nfcAuthError && <div style={{ color: 'red', marginTop: 12 }}>{nfcAuthError}</div>}
      </div>
    );
  }

  // Page d'accueil admin : choix des fonctions
  if (!adminSection) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 600, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0 }}>Administration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 32 }}>
          <button onClick={() => setAdminSection('associer-tag')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #1976d2', background: '#f4f6fa', color: '#1976d2', fontWeight: 600, cursor: 'pointer' }}>Associer un nouveau tag</button>
          <button onClick={() => setAdminSection('ajouter-lieu')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #1976d2', background: '#f4f6fa', color: '#1976d2', fontWeight: 600, cursor: 'pointer' }}>Ajouter un nouveau lieu</button>
        </div>
      </div>
    );
  }

  // Formulaire d'association de tag
  if (adminSection === 'associer-tag') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Associer un tag NFC à un utilisateur</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Utilisateur</label>
          {/* Champ autocomplete utilisateur */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
              value={selectedUser ? (users.find(u => u.id === selectedUser)?.prenom + ' ' + users.find(u => u.id === selectedUser)?.nom) : userSearch}
              onChange={e => {
                setUserSearch(e.target.value);
                setSelectedUser('');
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              style={{
                fontSize: 16,
                padding: '12px 12px 12px 44px',
                borderRadius: 8,
                border: '1.5px solid #bbb',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#f8f8f8',
                marginBottom: 2,
                display: 'block',
              }}
            />
            {/* Avatar dans le champ */}
            <div style={{ position: 'absolute', left: 8, top: 8 }}>
              {selectedUser && users.find(u => u.id === selectedUser)?.avatar ? (
                <img src={users.find(u => u.id === selectedUser)?.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2' }}>👤</div>
              )}
            </div>
            {showUserDropdown && filteredUsers.length > 0 && (
              <div id="admin-user-dropdown" style={{ 
                position: 'absolute', 
                top: 48, 
                left: 0, 
                right: 0,
                width: '100%', 
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#fff', 
                border: '1.5px solid #1976d2', 
                borderRadius: 8, 
                boxShadow: '0 4px 16px rgba(25,118,210,0.08)', 
                zIndex: 1000, 
                maxHeight: 220, 
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                isolation: 'isolate'
              }}>
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => { setSelectedUser(u.id); setUserSearch(''); setShowUserDropdown(false); }} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: 10, 
                    cursor: 'pointer', 
                    borderBottom: '1px solid #f0f0f0', 
                    background: selectedUser === u.id ? '#e3f2fd' : '#fff',
                    minWidth: 0,
                    overflow: 'hidden',
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative',
                    zIndex: 1001
                  }}>
                    {u.avatar ? (
                      <img src={u.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2', flexShrink: 0 }}>👤</div>
                    )}
                    <span style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{u.prenom} {u.nom}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Fin autocomplete */}
          <button onClick={handleAssociateNfc} disabled={!selectedUser || isAssociating} style={{ marginTop: 8, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !selectedUser || isAssociating ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}>
            {isAssociating ? 'En attente du scan...' : 'Associer'}
          </button>
          {nfcTag && <div style={{ margin: '10px 0 0 0', color: '#1976d2', fontWeight: 600, fontSize: 15 }}>Tag scanné : <b>{nfcTag}</b></div>}
          {message && <div style={{ color: '#1976d2', marginTop: 12, fontWeight: 600 }}>{message}</div>}
        </div>
      </div>
    );
  }

  // Supprimer le formulaire d'ajout d'horaires standards séparé
  // Fusionner les champs horaires dans le formulaire d'ajout de lieu
  if (adminSection === 'ajouter-lieu') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Ajouter un nouveau lieu</h2>
        <div style={{ background: '#fffbe6', border: '1.5px solid #ffe58f', color: '#ad8b00', borderRadius: 10, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span>Assurez-vous d'être connecté au réseau de l'OTI avant d'ajouter un nouveau lieu.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Nom du lieu</label>
          <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de début *</label>
          <input type="time" value={horaireHeureDebut} onChange={e => setHoraireHeureDebut(e.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de fin</label>
          <input type="time" value={horaireHeureFin} onChange={e => setHoraireHeureFin(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Adresse IP</label>
          <input value={ip} onChange={e => setIp(e.target.value)} placeholder="IP" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Latitude</label>
          <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Longitude</label>
          <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <button 
            onClick={async () => {
              if (!lieu || !horaireHeureDebut) return;
              // Ajout du lieu
              const { error: lieuError } = await supabase.from('appbadge_lieux').insert({
                nom: lieu,
                ip: ip,
                latitude: latitude,
                longitude: longitude
              });
              // Ajout de l'horaire standard
              const { error: horaireError } = await supabase.from('appbadge_horaires_standards').insert({
                lieux: lieu,
                heure_debut: horaireHeureDebut,
                heure_fin: horaireHeureFin || null,
                ip_address: ip || null,
                latitude: latitude || null,
                longitude: longitude || null
              });
              if (!lieuError && !horaireError) {
                showSuccessAndReturn('Lieu et horaire ajoutés avec succès !');
                setLieu(''); setHoraireHeureDebut(''); setHoraireHeureFin(''); setIp(''); setLatitude(''); setLongitude('');
              } else {
                setMessage("Erreur lors de l'ajout du lieu ou de l'horaire.");
              }
            }}
            disabled={!lieu || !horaireHeureDebut} 
            style={{ marginTop: 18, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !lieu || !horaireHeureDebut ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}
          >
            Ajouter le lieu et l'horaire
          </button>
        </div>
        {message && <div style={{ color: '#1976d2', marginTop: 18, fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, maxWidth: 600, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
      </div>
      <h2 style={{ marginTop: 0 }}>Administration</h2>
      <div style={{ marginBottom: 32 }}>
        <h3>Associer un tag NFC à un utilisateur</h3>
        <button onClick={handleAssociateNfc} disabled={!selectedUser || isAssociating} style={{ marginBottom: 8 }}>
          {isAssociating ? 'En attente du scan...' : 'Associer'}
        </button>
        {nfcTag && <div style={{ marginBottom: 8 }}>Tag scanné : <b>{nfcTag}</b></div>}
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
          <option value="">Sélectionner un utilisateur</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Ajouter un nouveau lieu</h3>
        <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', marginBottom: 8 }} />
        <button onClick={handleGetIpGps} style={{ marginBottom: 8 }}>Récupérer IP et GPS</button>
        <input value={ip} onChange={e => setIp(e.target.value)} placeholder="IP" style={{ width: '100%', marginBottom: 8 }} />
        <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', marginBottom: 8 }} />
        <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', marginBottom: 8 }} />
        <button disabled={!lieu || !ip} style={{ marginBottom: 8 }}>Ajouter le lieu</button>
      </div>
      {message && <div style={{ color: '#1976d2', marginTop: 12 }}>{message}</div>}
    </div>
  );
};

export default AdminPage; 