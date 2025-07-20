import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const AdminPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // MOCK : liste d'utilisateurs pour association NFC
  const [users] = useState([
    { id: '1', nom: 'Dupont', prenom: 'Jean' },
    { id: '2', nom: 'Martin', prenom: 'Alice' },
  ]);
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

  // NFC scan pour authentification admin
  const handleAdminNfcScan = async () => {
    setIsScanning(true);
    setNfcAuthError('');
    setMessage('');
    // MOCK NFC : remplace par la vraie API NFC
    setTimeout(async () => {
      // Simule un UID NFC
      const uid = prompt('Simulez le scan d\'un badge NFC (entrez un UID de badge admin) :', 'ADMIN_UID_123');
      if (!uid) {
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
      // Recherche de l'utilisateur
      const { data: usersFound } = await supabase
        .from('appbadge_utilisateurs')
        .select('id, nom, prenom, status')
        .eq('id', utilisateurId)
        .limit(1);
      if (!usersFound || usersFound.length === 0) {
        setNfcAuthError('Utilisateur non trouvé.');
        setIsScanning(false);
        return;
      }
      const user = usersFound[0];
      if (user.status !== 'Admin') {
        setNfcAuthError('Accès refusé : vous n\'êtes pas administrateur.');
        setIsScanning(false);
        return;
      }
      setAdminUser(user);
      setIsScanning(false);
    }, 500);
  };

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

  if (!adminUser) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        <h2 style={{ marginTop: 0 }}>Authentification Admin</h2>
        <p>Veuillez scanner votre badge NFC admin pour accéder à la gestion.</p>
        <button onClick={handleAdminNfcScan} disabled={isScanning} style={{ marginBottom: 12 }}>
          {isScanning ? 'En attente du scan...' : 'Scanner mon badge'}
        </button>
        {nfcAuthError && <div style={{ color: 'red', marginTop: 12 }}>{nfcAuthError}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, maxWidth: 600, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
      </div>
      <h2 style={{ marginTop: 0 }}>Administration</h2>
      <div style={{ marginBottom: 32 }}>
        <h3>Associer un tag NFC à un utilisateur</h3>
        <button onClick={() => setNfcTag('NFC_TAG_' + Math.floor(Math.random() * 10000))} style={{ marginBottom: 12 }}>Scanner un tag NFC</button>
        {nfcTag && <div style={{ marginBottom: 8 }}>Tag scanné : <b>{nfcTag}</b></div>}
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
          <option value="">Sélectionner un utilisateur</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
        </select>
        <button disabled={!nfcTag || !selectedUser} style={{ marginBottom: 8 }}>Associer</button>
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