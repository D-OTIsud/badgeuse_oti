import React, { useEffect, useState, useCallback } from 'react';
import type { Utilisateur } from '../App';
import type { UserSession } from '../../types';
import { fetchUserSessions, fetchSessionsWithModifications } from '../services/sessionService';
import { getSessionModificationStatuses, type SessionModificationStatus } from '../services/sessionModificationService';
import { fetchUserPendingOubliRequests, type OubliBadgeageRequestWithDetails } from '../services/oubliBadgeageService';
import SessionCard from './SessionCard';
import SessionEditForm from './SessionEditForm';
import manuelUtilisateur from '../assets/Manuel Utilisateur Badgeuse OTI.pdf?url';

type Props = {
  utilisateur: Utilisateur;
  onClose: () => void;
  onLogout: () => Promise<void>;
};

const UserPortal: React.FC<Props> = ({ utilisateur, onClose, onLogout }) => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [modificationStatuses, setModificationStatuses] = useState<Map<string, SessionModificationStatus>>(new Map());
  const [pendingOubliRequests, setPendingOubliRequests] = useState<OubliBadgeageRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<UserSession | null>(null);
  const [showOubliForm, setShowOubliForm] = useState(false);
  
  // Pagination state
  const [startDate, setStartDate] = useState<string | null>(null); // ISO date string (YYYY-MM-DD) or null for latest
  const [currentPageStartDate, setCurrentPageStartDate] = useState<string | null>(null); // Date of first session in current page
  const [paginationHistory, setPaginationHistory] = useState<(string | null)[]>([]); // Stack of dates for navigation

  const fetchSessions = useCallback(async (beforeDate?: string, isNavigatingBack = false) => {
    setSessionsLoading(true);
    try {
      // Fetch sessions and oubli requests in parallel (they don't depend on each other)
      const [modifiedSessions, regularSessionsData, oubliRequests] = await Promise.all([
        fetchSessionsWithModifications(utilisateur.id),
        fetchUserSessions(utilisateur.id, 10, beforeDate),
        fetchUserPendingOubliRequests(utilisateur.id)
      ]);
      
      // Filter out sessions that are already in modified list
      const modifiedEntreeIds = new Set(modifiedSessions.map(s => s.entree_id));
      const filteredRegularSessions = regularSessionsData.filter(
        s => !modifiedEntreeIds.has(s.entree_id)
      );
      
      // Combine all sessions
      const allSessions = [...modifiedSessions, ...filteredRegularSessions];
      
      // Sort all sessions chronologically (most recent first)
      // Sort by jour_local (date) descending, then by entree_ts descending
      const sortedSessions = allSessions.sort((a, b) => {
        const dateA = new Date(a.jour_local).getTime();
        const dateB = new Date(b.jour_local).getTime();
        if (dateB !== dateA) {
          return dateB - dateA; // Most recent first
        }
        // If same date, sort by entree_ts (most recent first)
        const timeA = new Date(a.entree_ts).getTime();
        const timeB = new Date(b.entree_ts).getTime();
        return timeB - timeA;
      });
      
      // Limit total to 10 when paginating
      const limitedSessions = beforeDate 
        ? sortedSessions.slice(0, 10)
        : sortedSessions; // On first load, show all
      
      setSessions(limitedSessions);
      setPendingOubliRequests(oubliRequests);
      
      // Update current page start date (date of first session)
      if (limitedSessions.length > 0) {
        const firstDate = limitedSessions[0].jour_local;
        setCurrentPageStartDate(firstDate);
      } else {
        setCurrentPageStartDate(null);
      }

      // Fetch modification statuses for all sessions
      // This can run in parallel with the session fetching, but we need the session IDs first
      // So we do it after, but it's still fast since it's a single optimized query
      if (limitedSessions.length > 0) {
        const entreeIds = limitedSessions.map(s => s.entree_id);
        // Run status fetch in parallel with any other operations if possible
        getSessionModificationStatuses(entreeIds).then(statuses => {
          setModificationStatuses(statuses);
        }).catch(error => {
          console.error('Error fetching modification statuses:', error);
        });
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

  // Set up periodic refresh every 30 seconds to catch validation updates
  useEffect(() => {
    if (sessions.length === 0) return;
    
    const refreshInterval = setInterval(async () => {
      try {
        const entreeIds = sessions.map(s => s.entree_id);
        const statuses = await getSessionModificationStatuses(entreeIds);
        setModificationStatuses(statuses);
        
        // Also refresh oubli badgeage requests
        const oubliRequests = await fetchUserPendingOubliRequests(utilisateur.id);
        setPendingOubliRequests(oubliRequests);
      } catch (error) {
        console.error('Error refreshing modification statuses:', error);
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [sessions, utilisateur.id]);

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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a
              href={manuelUtilisateur}
              download="Manuel_Utilisateur_Badgeuse_OTI.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 8,
                textDecoration: 'none',
                color: '#333',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e0e0e0';
                e.currentTarget.style.borderColor = '#1976d2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <span>📖</span>
              <span>Manuel utilisateur</span>
            </a>
            <button onClick={onLogout} style={{ background: 'none', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          {utilisateur.avatar ? (
            <img src={utilisateur.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1976d2', background: '#f4f6fa' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#bbb', border: '2px solid #1976d2' }}>👤</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{utilisateur.prenom} {utilisateur.nom}</div>
            <div style={{ color: '#666' }}>{utilisateur.email}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{utilisateur.service || ''}{utilisateur.lieux ? ` • ${utilisateur.lieux}` : ''}</div>
          </div>
          <div>
            <button 
              onClick={() => setShowOubliForm(true)}
              style={{ 
                background: '#1976d2', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                padding: '10px 16px', 
                cursor: 'pointer', 
                fontWeight: 700,
                fontSize: 14
              }}
            >
              Oubli de badgeage
            </button>
          </div>
        </div>

        {/* Pending Requests Block */}
        {!sessionsLoading && (() => {
          const pendingSessions = sessions.filter(session => {
            const status = modificationStatuses.get(session.entree_id);
            return status?.status === 'pending';
          });

          const totalPending = pendingSessions.length + pendingOubliRequests.length;
          if (totalPending === 0) return null;

          const formatTime = (timestamp: string): string => {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          };

          const formatDate = (timestamp: string): string => {
            const date = new Date(timestamp);
            return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          };

          return (
            <div style={{ 
              background: '#fff3e0', 
              borderRadius: 12, 
              padding: 16, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)', 
              marginBottom: 16,
              border: '1px solid #ffb74d'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                marginBottom: 12 
              }}>
                <span style={{ fontSize: 20 }}>⏳</span>
                <div style={{ fontWeight: 700, color: '#e65100', fontSize: 16 }}>
                  Demandes en attente ({totalPending})
                </div>
              </div>
              
              {/* Session Modifications */}
              {pendingSessions.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 600 }}>
                    Modifications de session :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: pendingOubliRequests.length > 0 ? 16 : 0 }}>
                    {pendingSessions.map((session) => (
                      <SessionCard
                        key={`pending-${session.jour_local}-${session.entree_id}`}
                        session={session}
                        modificationStatus={modificationStatuses.get(session.entree_id)}
                        onEdit={handleEditSession}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Oubli de Badgeage Requests */}
              {pendingOubliRequests.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontWeight: 600 }}>
                    Oubli de badgeage :
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingOubliRequests.map((request) => {
                      const dateStr = request.date_heure_entree.split('T')[0];
                      const date = new Date(dateStr);
                      const jourLocal = date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      
                      return (
                        <div
                          key={`oubli-${request.id}`}
                          style={{
                            background: '#fff',
                            borderRadius: 8,
                            padding: 12,
                            border: '1px solid #ffcc80',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 14 }}>
                              {jourLocal}
                            </div>
                            <div style={{
                              background: '#ff9800',
                              color: '#fff',
                              padding: '4px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>⏳</span>
                              <span>En attente</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Entrée</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1976d2' }}>
                                {formatTime(request.date_heure_entree)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Sortie</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1976d2' }}>
                                {formatTime(request.date_heure_sortie)}
                              </div>
                            </div>
                          </div>

                          {request.date_heure_pause_debut && request.date_heure_pause_fin && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Début pause</div>
                                <div style={{ fontSize: 13, color: '#666' }}>
                                  {formatTime(request.date_heure_pause_debut)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Fin pause</div>
                                <div style={{ fontSize: 13, color: '#666' }}>
                                  {formatTime(request.date_heure_pause_fin)}
                                </div>
                              </div>
                            </div>
                          )}

                          {request.lieux && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Lieu</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1976d2' }}>
                                {request.lieux}
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Raison</div>
                            <div style={{ fontSize: 12, color: '#333' }}>
                              {request.raison}
                            </div>
                            {request.commentaire && (
                              <>
                                <div style={{ fontSize: 11, color: '#666', marginTop: 6, marginBottom: 4 }}>Commentaire</div>
                                <div style={{ fontSize: 12, color: '#666' }}>
                                  {request.commentaire}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}

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
      </div>
      
      {/* Session Edit Form Modal */}
      {editingSession && (
        <SessionEditForm
          session={editingSession}
          onClose={handleCloseEditForm}
          onSave={handleSaveSession}
        />
      )}

      {/* Oubli de Badgeage Form Modal */}
      {showOubliForm && (
        <SessionEditForm
          utilisateur={utilisateur}
          mode="oubli"
          onClose={() => setShowOubliForm(false)}
          onSave={() => {
            setShowOubliForm(false);
          }}
        />
      )}
    </div>
  );
};

export default UserPortal;


