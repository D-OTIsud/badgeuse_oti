import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Utilisateur } from '../App';
import type { UserSession } from '../types';
import { fetchUserSessions } from '../services/sessionService';
import SessionCard from './SessionCard';
import SessionEditForm from './SessionEditForm';

type Props = {
  utilisateur: Utilisateur;
  onClose: () => void;
  onLogout: () => Promise<void>;
};

const UserPortal: React.FC<Props> = ({ utilisateur, onClose, onLogout }) => {
  const [badgeages, setBadgeages] = useState<any[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setSessionsLoading(true);
      
      try {
        // Fetch badgeages
        const { data: badgeagesData, error: badgeagesError } = await supabase
          .from('appbadge_badgeages')
          .select('id, code, created_at, latitude, longitude, type_action, lieux')
          .eq('utilisateur_id', utilisateur.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!badgeagesError && badgeagesData) {
          setBadgeages(badgeagesData);
        }
        
        // Fetch sessions
        const sessionsData = await fetchUserSessions(utilisateur.id, 10);
        setSessions(sessionsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setSessionsLoading(false);
      }
    };
    
    fetchData();
  }, [utilisateur.id]);

  const handleEditSession = (session: UserSession) => {
    setEditingSession(session);
  };

  const handleCloseEditForm = () => {
    setEditingSession(null);
  };

  const handleSaveSession = (updatedSession: UserSession) => {
    // Placeholder for saving session
    console.log('Saving session:', updatedSession);
    setEditingSession(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fcf9f3' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#1976d2' }}>Mon espace</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onLogout} style={{ background: 'none', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Fermer</button>
          </div>
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
          <div style={{ fontWeight: 700, marginBottom: 16, color: '#1976d2', fontSize: 18 }}>Mes 10 dernières sessions</div>
          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Chargement des sessions…</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Aucune session complète trouvée.</div>
          ) : (
            <div>
              {sessions.map((session) => (
                <SessionCard
                  key={`${session.jour_local}-${session.entree_id}`}
                  session={session}
                  onEdit={handleEditSession}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: '#1976d2' }}>Oubli de badgeage</div>
          <button style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontWeight: 700 }}
            onClick={() => alert('Formulaire à implémenter (placeholder).')}
          >Remplir le formulaire</button>
        </div>
      </div>
      
      {/* Session Edit Form Modal */}
      {editingSession && (
        <SessionEditForm
          session={editingSession}
          onClose={handleCloseEditForm}
          onSave={handleSaveSession}
        />
      )}
    </div>
  );
};

export default UserPortal;


