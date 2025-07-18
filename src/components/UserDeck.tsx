import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Utilisateur } from '../App';

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
};

const UserDeck: React.FC<Props> = ({ onSelect }) => {
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const nfcAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('appbadge_utilisateurs')
        .select('id, nom, prenom, service, email, statut, avatar')
        .eq('actif', true)
        .order('nom', { ascending: true });
      if (!error && data) setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  // NFC listener
  useEffect(() => {
    // Only run on browsers with NFC support
    // @ts-ignore
    if (!('NDEFReader' in window)) return;
    const NDEFReader = (window as any).NDEFReader;
    const controller = new AbortController();
    nfcAbortRef.current = controller;
    const listenNfc = async () => {
      try {
        const ndef = new NDEFReader();
        await ndef.scan({ signal: controller.signal });
        ndef.onreading = async (event: any) => {
          // Try to get UID (serialNumber)
          const uid = event.serialNumber || (event.target && event.target.serialNumber);
          if (!uid) return;
          // Chercher badge actif avec ce uid_tag
          const { data: badges, error: badgeError } = await supabase
            .from('appbadge_badges')
            .select('utilisateur_id')
            .eq('uid_tag', uid)
            .eq('actif', true)
            .limit(1);
          if (!badgeError && badges && badges.length > 0) {
            const utilisateur_id = badges[0].utilisateur_id;
            // Chercher l'utilisateur
            const { data: usersFound, error: userError } = await supabase
              .from('appbadge_utilisateurs')
              .select('id, nom, prenom, service, email, statut, avatar')
              .eq('id', utilisateur_id)
              .limit(1);
            if (!userError && usersFound && usersFound.length > 0) {
              onSelect(usersFound[0]);
            }
          }
        };
      } catch (e) {
        // NFC non supporté ou refusé
      }
    };
    listenNfc();
    return () => {
      controller.abort();
    };
  }, [onSelect]);

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, flex: 1 }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 16,
              minWidth: 180,
              cursor: 'pointer',
              background: '#f9f9f9',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={() => onSelect(user)}
          >
            {user.avatar && (
              <img src={user.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: 8 }} />
            )}
            <div style={{ fontWeight: 'bold', fontSize: 18 }}>{user.prenom} {user.nom}</div>
            <div style={{ color: '#555' }}>{user.service}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{user.email}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#1976d2' }}>{user.statut || 'Non badgé'}</div>
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