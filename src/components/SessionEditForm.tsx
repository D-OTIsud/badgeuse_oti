import React, { useState } from 'react';
import type { UserSession } from '../types';
import { formatTime, formatDate, formatDuration } from '../services/sessionService';
import { createSessionModificationRequest, type SessionModificationRequest } from '../services/sessionModificationService';

interface SessionEditFormProps {
  session: UserSession;
  onClose: () => void;
  onSave: () => void; // Callback after successful submission
}

const SessionEditForm: React.FC<SessionEditFormProps> = ({ session, onClose, onSave }) => {
  // Extract current times from timestamps
  const getTimeFromTimestamp = (ts: string): string => {
    const timeMatch = ts.match(/(\d{2}):(\d{2})/);
    return timeMatch ? timeMatch[0] : '';
  };

  const getDateFromTimestamp = (ts: string): string => {
    const dateMatch = ts.match(/(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? dateMatch[0] : '';
  };

  const initialEntreeTime = getTimeFromTimestamp(session.entree_ts);
  const initialSortieTime = getTimeFromTimestamp(session.sortie_ts);
  const sessionDate = getDateFromTimestamp(session.entree_ts) || session.jour_local;

  const [entreeTime, setEntreeTime] = useState(initialEntreeTime);
  const [sortieTime, setSortieTime] = useState(initialSortieTime);
  const [pauseDelta, setPauseDelta] = useState(0);
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Convert time string to timestamp
  // The database stores local Reunion time marked as +00 (representing local time, not UTC)
  // So we send timestamps as +00:00 to match the database storage format
  const timeToTimestamp = (dateStr: string, timeStr: string): string => {
    if (!timeStr || !dateStr) return '';
    // Create timestamp with +00:00 (database stores local time with +00 marker)
    // Format: "2025-10-28T09:52:00+00:00"
    return `${dateStr}T${timeStr}:00+00:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Build proposed timestamps
      // If user didn't change the time, keep the original timestamp from the session
      // If user changed it, convert to timestamp format
      const proposedEntreeTs = entreeTime !== initialEntreeTime 
        ? timeToTimestamp(sessionDate, entreeTime) 
        : session.entree_ts; // Keep original if not modified
      
      const proposedSortieTs = sortieTime !== initialSortieTime 
        ? timeToTimestamp(sessionDate, sortieTime) 
        : session.sortie_ts; // Keep original if not modified

      // Validate that at least one field is changed from original
      const hasEntreeChange = proposedEntreeTs !== session.entree_ts;
      const hasSortieChange = proposedSortieTs !== session.sortie_ts;
      
      if (!hasEntreeChange && !hasSortieChange && pauseDelta === 0 && !motif && !commentaire) {
        setError('Veuillez modifier au moins un champ');
        setLoading(false);
        return;
      }

      // Validate that sortie is after entree
      if (proposedEntreeTs && proposedSortieTs) {
        const entreeDate = new Date(proposedEntreeTs);
        const sortieDate = new Date(proposedSortieTs);
        if (sortieDate <= entreeDate) {
          setError('L\'heure de sortie doit être après l\'heure d\'entrée');
          setLoading(false);
          return;
        }
      }

      // Log session details for debugging
      console.log('Submitting modification request for session:', {
        entree_id: session.entree_id,
        utilisateur_id: session.utilisateur_id,
        jour_local: session.jour_local,
        has_entree_id: !!session.entree_id
      });

      const request: SessionModificationRequest = {
        entree_id: session.entree_id,
        utilisateur_id: session.utilisateur_id,
        proposed_entree_ts: proposedEntreeTs,
        proposed_sortie_ts: proposedSortieTs,
        pause_delta_minutes: pauseDelta || 0,
        motif: motif || null,
        commentaire: commentaire || null,
      };

      await createSessionModificationRequest(request);
      
      setSuccess(true);
      setTimeout(() => {
        onSave(); // Refresh the session list
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error submitting modification request:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Une erreur est survenue lors de la soumission de la demande.';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.code === 'P0001' || err.code === 'SESSION_NOT_FOUND') {
        errorMessage = 'La session sélectionnée n\'existe plus ou n\'est plus accessible. Veuillez actualiser la page et réessayer.';
      } else if (err.code === '23505') {
        errorMessage = 'Une demande de modification existe déjà pour cette session.';
      } else if (err.code === 'INVALID_ENTREE_TYPE') {
        errorMessage = 'L\'ID fourni ne correspond pas à une entrée de session valide.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
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
    }} onClick={onClose}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        maxWidth: 600,
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={(e) => e.stopPropagation()}>
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
            Demande de rectification de session
          </h3>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#666',
              padding: 4,
              opacity: loading ? 0.5 : 1
            }}
          >
            ×
          </button>
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background: '#d4edda',
            color: '#155724',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #c3e6cb'
          }}>
            ✓ Demande de modification soumise avec succès. Vous recevrez un email une fois la demande traitée.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #f5c6cb'
          }}>
            ⚠ {error}
          </div>
        )}

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
            marginBottom: 8,
            fontWeight: 600
          }}>
            Session du {formatDate(session.jour_local)}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            fontSize: 14
          }}>
            <div>
              <strong>Entrée actuelle:</strong> {formatTime(session.entree_ts)}
            </div>
            <div>
              <strong>Sortie actuelle:</strong> {formatTime(session.sortie_ts)}
            </div>
            <div>
              <strong>Durée:</strong> {formatDuration(session.duree_minutes)}
            </div>
            <div>
              <strong>Lieu:</strong> {session.lieux || 'Non spécifié'}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Heure d'entrée */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              Nouvelle heure d'entrée
            </label>
            <input
              type="time"
              value={entreeTime}
              onChange={(e) => setEntreeTime(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                opacity: loading ? 0.6 : 1
              }}
            />
            {entreeTime !== initialEntreeTime && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Heure actuelle: {initialEntreeTime}
              </div>
            )}
          </div>

          {/* Heure de sortie */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              Nouvelle heure de sortie
            </label>
            <input
              type="time"
              value={sortieTime}
              onChange={(e) => setSortieTime(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                opacity: loading ? 0.6 : 1
              }}
            />
            {sortieTime !== initialSortieTime && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Heure actuelle: {initialSortieTime}
              </div>
            )}
          </div>

          {/* Ajustement de pause */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              Ajustement de pause (en minutes)
            </label>
            <input
              type="number"
              min="-480"
              max="480"
              value={pauseDelta}
              onChange={(e) => setPauseDelta(parseInt(e.target.value) || 0)}
              disabled={loading}
              placeholder="0"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                opacity: loading ? 0.6 : 1
              }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              Valeur négative = pause supprimée, positive = pause ajoutée (entre -480 et +480 min)
            </div>
          </div>

          {/* Motif */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              Motif de la demande *
            </label>
            <select
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              disabled={loading}
              required
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 16,
                opacity: loading ? 0.6 : 1,
                background: '#fff'
              }}
            >
              <option value="">Sélectionnez un motif</option>
              <option value="oubli_badgeage">Oubli de badgeage</option>
              <option value="erreur_badgeage">Erreur de badgeage</option>
              <option value="correction_heure">Correction d'heure</option>
              <option value="probleme_technique">Problème technique</option>
              <option value="pause_oubli">Pause oubliée/non enregistrée</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Commentaire */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              marginBottom: 8
            }}>
              Commentaire (optionnel)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="Décrivez brièvement la raison de cette demande..."
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>

          {/* Info */}
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            fontSize: 12,
            color: '#856404'
          }}>
            ℹ️ Votre demande sera soumise pour validation. Vous recevrez un email une fois la demande traitée par un administrateur.
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
                color: '#666',
                opacity: loading ? 0.6 : 1
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || success}
              style={{
                background: success ? '#28a745' : '#1976d2',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: (loading || success) ? 'not-allowed' : 'pointer',
                fontSize: 14,
                color: '#fff',
                fontWeight: 600,
                opacity: (loading || success) ? 0.8 : 1
              }}
            >
              {loading ? 'Envoi...' : success ? '✓ Envoyé' : 'Soumettre la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionEditForm;
