import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Utilisateur } from '../App';

type Props = {
  utilisateur: Utilisateur;
  onClose: () => void;
};

const UserPortal: React.FC<Props> = ({ utilisateur, onClose }) => {
  const [badgeages, setBadgeages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadgeages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('appbadge_badgeages')
        .select('id, code, created_at, latitude, longitude, type_action, lieux')
        .eq('utilisateur_id', utilisateur.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) setBadgeages(data);
      setLoading(false);
    };
    fetchBadgeages();
  }, [utilisateur.id]);

  return (
    <div style={{ minHeight: '100vh', background: '#fcf9f3' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#1976d2' }}>Mon espace</h2>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Fermer</button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {utilisateur.avatar ? (
            <img src={utilisateur.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1976d2', background: '#f4f6fa' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#bbb', border: '2px solid #1976d2' }}>👤</div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{utilisateur.prenom} {utilisateur.nom}</div>
            <div style={{ color: '#666' }}>{utilisateur.email}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{utilisateur.service || ''}{utilisateur.lieux ? ` • ${utilisateur.lieux}` : ''}</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1976d2' }}>Mes 10 derniers badgeages</div>
          {loading ? (
            <div>Chargement…</div>
          ) : badgeages.length === 0 ? (
            <div>Aucun badgeage.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {badgeages.map((b) => (
                <li key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                  <span>{new Date(b.created_at).toLocaleString('fr-FR')}</span>
                  <span>{b.type_action || '—'}</span>
                  <span>{b.lieux || '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1976d2' }}>Oubli de badgeage</div>
          <button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontWeight: 700 }}
            onClick={() => alert('Formulaire à implémenter (placeholder).')}
          >Remplir le formulaire</button>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;


