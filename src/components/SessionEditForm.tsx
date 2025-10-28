import React from 'react';
import type { UserSession } from '../types';

interface SessionEditFormProps {
  session: UserSession;
  onClose: () => void;
  onSave: (updatedSession: UserSession) => void;
}

const SessionEditForm: React.FC<SessionEditFormProps> = ({ session, onClose, onSave }) => {
  const handleSave = () => {
    // Placeholder - in a real implementation, this would update the session
    alert('Fonctionnalité de modification en cours de développement');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        maxWidth: 500,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <h3 style={{
            margin: 0,
            color: '#1976d2',
            fontSize: 20
          }}>
            Modifier la session
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#666',
              padding: 4
            }}
          >
            ×
          </button>
        </div>

        {/* Session info */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: 8,
          padding: 16,
          marginBottom: 20
        }}>
          <div style={{
            fontSize: 14,
            color: '#666',
            marginBottom: 8
          }}>
            Session du {new Date(session.jour_local).toLocaleDateString('fr-FR')}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            fontSize: 14
          }}>
            <div>
              <strong>Entrée:</strong> {new Date(session.entree_ts).toLocaleTimeString('fr-FR')}
            </div>
            <div>
              <strong>Sortie:</strong> {new Date(session.sortie_ts).toLocaleTimeString('fr-FR')}
            </div>
            <div>
              <strong>Durée:</strong> {Math.floor(session.duree_minutes / 60)}h{Math.round(session.duree_minutes % 60).toString().padStart(2, '0')}
            </div>
            <div>
              <strong>Lieu:</strong> {session.lieux || 'Non spécifié'}
            </div>
          </div>
        </div>

        {/* Placeholder form fields */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 12,
            color: '#333'
          }}>
            Modifications disponibles prochainement :
          </div>
          <ul style={{
            paddingLeft: 20,
            color: '#666',
            lineHeight: 1.6
          }}>
            <li>Modification des heures d'entrée et de sortie</li>
            <li>Changement du lieu de travail</li>
            <li>Ajout de commentaires</li>
            <li>Correction des données de badgeage</li>
          </ul>
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 14,
              color: '#666'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            style={{
              background: '#1976d2',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 14,
              color: '#fff',
              fontWeight: 600
            }}
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionEditForm;
