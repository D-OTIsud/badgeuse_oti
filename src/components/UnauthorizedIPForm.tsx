import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface UnauthorizedIPFormProps {
  onBack: () => void;
  userIP: string;
  locationName?: string;
}

const UnauthorizedIPForm: React.FC<UnauthorizedIPFormProps> = ({ onBack, userIP, locationName }) => {
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('appbadge_horaires_standards').insert({
        ip_address: userIP,
        commentaire: commentaire,
        created_at: new Date().toISOString(),
        type: 'unauthorized_access'
      });

      if (insertError) {
        setError("Erreur lors de l'enregistrement. Veuillez réessayer.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.");
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div style={{
        maxWidth: 420,
        margin: '48px auto',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        padding: 36,
        textAlign: 'center',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}>
        <div style={{ fontSize: 24, color: '#43a047', marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Accès enregistré</div>
        <div style={{ color: '#666', fontSize: 14 }}>Votre demande a été enregistrée avec succès.</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 420,
      margin: '48px auto',
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      padding: 36,
      fontFamily: 'Segoe UI, Arial, sans-serif',
    }}>
      <button type="button" onClick={onBack} style={{ 
        marginBottom: 16, 
        alignSelf: 'flex-start', 
        background: 'none', 
        border: 'none', 
        color: '#1976d2', 
        fontSize: 22, 
        cursor: 'pointer' 
      }}>
        ← Retour
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 24, color: '#f57c00', marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
          Accès non autorisé
        </div>
        <div style={{ color: '#666', fontSize: 14, lineHeight: 1.4 }}>
          Votre adresse IP ({userIP}) n'est pas dans la liste des emplacements autorisés.
          {locationName && <><br />Emplacement attendu : <strong>{locationName}</strong></>}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            fontWeight: 600, 
            fontSize: 16 
          }}>
            Justification de l'accès :
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Expliquez pourquoi vous accédez depuis cet emplacement..."
            required
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              border: '1.5px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !commentaire.trim()} 
          style={{
            fontSize: 16,
            background: '#f57c00',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '14px 0',
            width: '100%',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(245,124,0,0.2)',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer l\'accès'}
        </button>

        {error && (
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            background: '#ffebee', 
            color: '#c62828', 
            borderRadius: 8, 
            fontSize: 14 
          }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default UnauthorizedIPForm; 