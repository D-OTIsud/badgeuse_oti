import React, { useEffect, useState, useCallback } from 'react';
import type { Utilisateur } from '../App';
import type { UserSession } from '../../types';
import { fetchUserSessions, fetchSessionsWithModifications } from '../services/sessionService';
import { getSessionModificationStatuses, type SessionModificationStatus } from '../services/sessionModificationService';
import SessionCard from './SessionCard';
import SessionEditForm from './SessionEditForm';

type Props = {
  utilisateur: Utilisateur;
  onClose: () => void;
  onLogout: () => Promise<void>;
};

const UserPortal: React.FC<Props> = ({ utilisateur, onClose, onLogout }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [modificationStatuses, setModificationStatuses] = useState<Map<string, SessionModificationStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<UserSession | null>(null);
  
  // Pagination state
  const [startDate, setStartDate] = useState<string | null>(null); // ISO date string (YYYY-MM-DD) or null for latest
  const [currentPageStartDate, setCurrentPageStartDate] = useState<string | null>(null); // Date of first session in current page
  const [paginationHistory, setPaginationHistory] = useState<(string | null)[]>([]); // Stack of dates for navigation

  const fetchSessions = useCallback(async (beforeDate?: string, isNavigatingBack = false) => {
    setSessionsLoading(true);
    try {
      // Always fetch sessions with modifications first
      const modifiedSessions = await fetchSessionsWithModifications(utilisateur.id);
      
      // Fetch regular sessions (excluding those already in modified list)
      const modifiedEntreeIds = new Set(modifiedSessions.map(s => s.entree_id));
      const regularSessionsData = await fetchUserSessions(utilisateur.id, 10, beforeDate);
      
      // Filter out sessions that are already in modified list
      const filteredRegularSessions = regularSessionsData.filter(
        s => !modifiedEntreeIds.has(s.entree_id)
      );
      
      // Combine: modified sessions first, then regular sessions
      const allSessions = [...modifiedSessions, ...filteredRegularSessions];
      
      // Limit total to 10 if we're not showing modified sessions at top
      // But if we have modified sessions, we want to show them all + regular up to 10
      const limitedSessions = beforeDate 
        ? allSessions.slice(0, 10) // When paginating, limit to 10
        : allSessions; // On first load, show all modified + up to 10 regular
      
      setSessions(limitedSessions);
      
      // Update current page start date (date of first session)
      if (limitedSessions.length > 0) {
        const firstDate = limitedSessions[0].jour_local;
        setCurrentPageStartDate(firstDate);
      } else {
        setCurrentPageStartDate(null);
      }

      // Fetch modification statuses for all sessions
      if (limitedSessions.length > 0) {
        const entreeIds = limitedSessions.map(s => s.entree_id);
        const statuses = await getSessionModificationStatuses(entreeIds);
        setModificationStatuses(statuses);
      } else {
        setModificationStatuses(new Map());
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, [utilisateur.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch initial sessions (latest 10)
        await fetchSessions();
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [utilisateur.id, fetchSessions]);

  // Handle date selection for pagination
  const handleDateSelect = (date: string) => {
    // Clear pagination history when user manually selects a date
    // since they're jumping to a new starting point
    setPaginationHistory([]);
    setStartDate(date);
    fetchSessions(date);
  };

  // Navigate to next 10 sessions (earlier dates)
  const handleNextPage = () => {
    if (sessions.length === 0) return;
    // Store current page's startDate in history before navigating forward
    // This allows us to go back to this page later
    setPaginationHistory(prev => [...prev, startDate || null]);
    // Get the date of the last session in current page
    const lastSessionDate = sessions[sessions.length - 1].jour_local;
    setStartDate(lastSessionDate);
    fetchSessions(lastSessionDate, false);
  };

  // Navigate to previous 10 sessions (later dates)
  const handlePreviousPage = () => {
    if (paginationHistory.length > 0) {
      // Pop from history to go back
      const newHistory = [...paginationHistory];
      const previousDate = newHistory.pop() || null;
      setPaginationHistory(newHistory);
      setStartDate(previousDate);
      fetchSessions(previousDate || undefined, true);
    } else {
      // No history, go to latest (first page)
      setStartDate(null);
      setPaginationHistory([]);
      fetchSessions(undefined, true);
    }
  };

  // Reset to latest sessions
  const handleResetToLatest = () => {
    setStartDate(null);
    setPaginationHistory([]);
    fetchSessions();
  };

  const handleEditSession = (session: UserSession) => {
    setEditingSession(session);
  };

  const handleCloseEditForm = () => {
    setEditingSession(null);
  };

  const handleSaveSession = async () => {
    // Refresh sessions after modification request is submitted
    await fetchSessions(startDate || undefined, false);
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
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18 }}>
              Mes sessions
            </div>
            
            {/* Pagination controls */}
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Date selector */}
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleDateSelect(e.target.value);
                  } else {
                    handleResetToLatest();
                  }
                }}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  fontSize: 13
                }}
              />
              
              {/* Navigation buttons */}
              <button
                onClick={handlePreviousPage}
                disabled={(paginationHistory.length === 0 && !startDate) || sessionsLoading}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: ((paginationHistory.length === 0 && !startDate) || sessionsLoading) ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  color: '#666',
                  opacity: ((paginationHistory.length === 0 && !startDate) || sessionsLoading) ? 0.5 : 1
                }}
                title="Sessions plus récentes"
              >
                ← Précédent
              </button>
              
              <button
                onClick={handleNextPage}
                disabled={sessions.length < 10 || sessionsLoading}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: (sessions.length < 10 || sessionsLoading) ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  color: '#666',
                  opacity: (sessions.length < 10 || sessionsLoading) ? 0.5 : 1
                }}
                title="Sessions plus anciennes"
              >
                Suivant →
              </button>
              
              {startDate && (
                <button
                  onClick={handleResetToLatest}
                  disabled={sessionsLoading}
                  style={{
                    background: '#1976d2',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    cursor: sessionsLoading ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    color: '#fff',
                    opacity: sessionsLoading ? 0.6 : 1
                  }}
                  title="Retour aux dernières sessions"
                >
                  Dernières
                </button>
              )}
            </div>
          </div>

          {sessionsLoading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>Chargement des sessions…</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
              {startDate ? 'Aucune session trouvée avant cette date.' : 'Aucune session complète trouvée.'}
            </div>
          ) : (
            <div>
              {sessions.map((session) => (
                <SessionCard
                  key={`${session.jour_local}-${session.entree_id}`}
                  session={session}
                  modificationStatus={modificationStatuses.get(session.entree_id)}
                  onEdit={handleEditSession}
                />
              ))}
            </div>
          )}
          
          {!sessionsLoading && sessions.length > 0 && (
            <div style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid #f0f0f0',
              fontSize: 12,
              color: '#666',
              textAlign: 'center'
            }}>
              Affichage de {sessions.length} session{sessions.length > 1 ? 's' : ''}
              {startDate && ` avant le ${new Date(startDate).toLocaleDateString('fr-FR')}`}
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


