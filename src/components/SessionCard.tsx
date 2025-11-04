import React from 'react';
import type { UserSession } from '../../types';
import { formatDuration, formatTime, formatDate } from '../services/sessionService';
import type { SessionModificationStatus } from '../services/sessionModificationService';

interface SessionCardProps {
  session: UserSession;
  modificationStatus?: SessionModificationStatus;
  onEdit: (session: UserSession) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, modificationStatus, onEdit }) => {
  const status = modificationStatus?.status || 'none';
  const isEditDisabled = status === 'pending' || status === 'approved';
  
  const handleEdit = () => {
    if (!isEditDisabled) {
      onEdit(session);
    }
  };

  // Determine which times to show based on status
  const getDisplayTimes = () => {
    const status = modificationStatus?.status || 'none';

    if (status === 'none') {
      // No modification: show original times
      return {
        entree: { time: session.entree_ts, strikethrough: false },
        sortie: { time: session.sortie_ts, strikethrough: false }
      };
    }

    if (status === 'pending' || status === 'approved') {
      // Pending or approved: show original (strikethrough) and proposed (normal)
      return {
        entree: {
          original: session.entree_ts,
          proposed: modificationStatus?.proposed_entree_ts || session.entree_ts,
          showOriginal: true,
          showProposed: true
        },
        sortie: {
          original: session.sortie_ts,
          proposed: modificationStatus?.proposed_sortie_ts || session.sortie_ts,
          showOriginal: true,
          showProposed: true
        }
      };
    }

    if (status === 'rejected') {
      // Rejected: show original (normal) and proposed (strikethrough)
      return {
        entree: {
          original: session.entree_ts,
          proposed: modificationStatus?.proposed_entree_ts || session.entree_ts,
          showOriginal: true,
          showProposed: true,
          rejected: true
        },
        sortie: {
          original: session.sortie_ts,
          proposed: modificationStatus?.proposed_sortie_ts || session.sortie_ts,
          showOriginal: true,
          showProposed: true,
          rejected: true
        }
      };
    }

    return {
      entree: { time: session.entree_ts, strikethrough: false },
      sortie: { time: session.sortie_ts, strikethrough: false }
    };
  };

  const displayTimes = getDisplayTimes();

  const getStatusBadge = () => {
    if (status === 'none') return null;
    
    const statusConfig = {
      pending: { text: 'En attente', color: '#ff9800', bg: '#fff3e0' },
      approved: { text: 'Approuvée', color: '#2e7d32', bg: '#e8f5e9' },
      rejected: { text: 'Refusée', color: '#d32f2f', bg: '#ffebee' }
    };

    const config = statusConfig[status];
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        marginLeft: 8
      }}>
        <span>{status === 'pending' ? '⏳' : status === 'approved' ? '✓' : '✗'}</span>
        {config.text}
      </div>
    );
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f0',
      marginBottom: 12,
      position: 'relative'
    }}>
      {/* Header with date, status badge, and edit button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4
        }}>
          <div style={{
            fontWeight: 700,
            color: '#1976d2',
            fontSize: 16
          }}>
            {formatDate(session.jour_local)}
          </div>
          {getStatusBadge()}
        </div>
        <button
          onClick={handleEdit}
          disabled={isEditDisabled}
          style={{
            background: isEditDisabled ? '#e0e0e0' : '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: isEditDisabled ? 'not-allowed' : 'pointer',
            fontSize: 12,
            color: isEditDisabled ? '#999' : '#666',
            fontWeight: 500,
            opacity: isEditDisabled ? 0.6 : 1
          }}
          title={
            status === 'pending'
              ? 'Une demande de modification est déjà en attente'
              : status === 'approved'
              ? 'Cette session a déjà été modifiée et approuvée'
              : 'Modifier cette session'
          }
        >
          ✏️ Modifier
        </button>
      </div>

      {/* Session details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 12
      }}>
        {/* Entry time */}
        <div>
          <div style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 4,
            fontWeight: 500
          }}>
            Entrée
          </div>
          {('original' in displayTimes.entree) ? (
            <div style={{ fontSize: 14 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: displayTimes.entree.rejected ? '#2e7d32' : '#999',
                textDecoration: displayTimes.entree.rejected ? 'none' : 'line-through',
                marginBottom: 4
              }}>
                {formatTime('original' in displayTimes.entree ? displayTimes.entree.original : session.entree_ts)}
              </div>
              {('original' in displayTimes.entree && displayTimes.entree.proposed) && displayTimes.entree.proposed !== displayTimes.entree.original && (
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: displayTimes.entree.rejected ? '#999' : '#2e7d32',
                  textDecoration: displayTimes.entree.rejected ? 'line-through' : 'none'
                }}>
                  → {formatTime(displayTimes.entree.proposed)}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#2e7d32'
            }}>
              {formatTime(session.entree_ts)}
            </div>
          )}
        </div>

        {/* Exit time */}
        <div>
          <div style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 4,
            fontWeight: 500
          }}>
            Sortie
          </div>
          {('original' in displayTimes.sortie) ? (
            <div style={{ fontSize: 14 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: displayTimes.sortie.rejected ? '#d32f2f' : '#999',
                textDecoration: displayTimes.sortie.rejected ? 'none' : 'line-through',
                marginBottom: 4
              }}>
                {formatTime('original' in displayTimes.sortie ? displayTimes.sortie.original : session.sortie_ts)}
              </div>
              {('original' in displayTimes.sortie && displayTimes.sortie.proposed) && displayTimes.sortie.proposed !== displayTimes.sortie.original && (
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: displayTimes.sortie.rejected ? '#999' : '#d32f2f',
                  textDecoration: displayTimes.sortie.rejected ? 'line-through' : 'none'
                }}>
                  → {formatTime(displayTimes.sortie.proposed)}
                </div>
              )}
            </div>
          ) : (
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#d32f2f'
            }}>
              {formatTime(session.sortie_ts)}
            </div>
          )}
        </div>
      </div>

      {/* Duration and location */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTop: '1px solid #f0f0f0'
      }}>
        <div>
          <div style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 4,
            fontWeight: 500
          }}>
            Durée
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1976d2'
          }}>
            {formatDuration(session.duree_minutes)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 12,
            color: '#888',
            marginBottom: 4,
            fontWeight: 500
          }}>
            Lieu
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#333'
          }}>
            {session.lieux || 'Non spécifié'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCard;
