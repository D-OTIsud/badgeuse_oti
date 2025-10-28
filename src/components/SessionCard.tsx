import React from 'react';
import type { UserSession } from '../types';
import { formatDuration, formatTime, formatDate } from '../services/sessionService';

interface SessionCardProps {
  session: UserSession;
  onEdit: (session: UserSession) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onEdit }) => {
  const handleEdit = () => {
    onEdit(session);
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
      {/* Header with date and edit button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
      }}>
        <div style={{
          fontWeight: 700,
          color: '#1976d2',
          fontSize: 16
        }}>
          {formatDate(session.jour_local)}
        </div>
        <button
          onClick={handleEdit}
          style={{
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
            color: '#666',
            fontWeight: 500
          }}
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
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#2e7d32'
          }}>
            {formatTime(session.entree_ts)}
          </div>
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
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#d32f2f'
          }}>
            {formatTime(session.sortie_ts)}
          </div>
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
