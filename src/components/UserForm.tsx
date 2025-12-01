import React, { useState, useEffect } from 'react';
import { createUser, updateUser, checkEmailExists, type User, type UserData } from '../services/userManagementService';

interface UserFormProps {
  user?: User | null;
  onSave: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
  const isEditMode = !!user;
  
  const [formData, setFormData] = useState<UserData>({
    email: user?.email || '',
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    role: user?.role || null,
    service: user?.service || null,
    actif: user?.actif !== undefined ? user.actif : true,
    avatar: user?.avatar || null,
    lieux: user?.lieux || null,
    heures_contractuelles_semaine: user?.heures_contractuelles_semaine || 35,
    telegramID: user?.telegramID || null,
    status: user?.status || null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [validatingEmail, setValidatingEmail] = useState(false);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check email uniqueness
  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !validateEmail(formData.email)) {
        setEmailError(null);
        return;
      }

      setValidatingEmail(true);
      try {
        const exists = await checkEmailExists(formData.email, user?.id);
        if (exists) {
          setEmailError('Cet email est déjà utilisé par un autre utilisateur.');
        } else {
          setEmailError(null);
        }
      } catch (err) {
        console.error('Error checking email:', err);
        setEmailError(null); // Don't block on check error
      } finally {
        setValidatingEmail(false);
      }
    };

    const timeoutId = setTimeout(checkEmail, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [formData.email, user?.id]);

  const handleChange = (field: keyof UserData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email') {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email.trim()) {
      setError('L\'email est requis.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Format d\'email invalide.');
      return;
    }

    if (emailError) {
      setError('Veuillez corriger l\'erreur d\'email.');
      return;
    }

    if (!formData.nom.trim()) {
      setError('Le nom est requis.');
      return;
    }

    if (!formData.prenom.trim()) {
      setError('Le prénom est requis.');
      return;
    }

    if (formData.heures_contractuelles_semaine !== undefined) {
      if (formData.heures_contractuelles_semaine < 0 || formData.heures_contractuelles_semaine > 60) {
        setError('Les heures contractuelles doivent être entre 0 et 60.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEditMode && user) {
        await updateUser(user.id, formData);
      } else {
        await createUser(formData);
      }
      onSave();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError(err.message || 'Erreur lors de la sauvegarde de l\'utilisateur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: 24, color: '#1976d2', fontWeight: 700 }}>
        {isEditMode ? 'Modifier l\'utilisateur' : 'Ajouter un nouvel utilisateur'}
      </h2>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #f5c6cb' }}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Email <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={loading || validatingEmail}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: emailError ? '2px solid #d32f2f' : '1px solid #ddd',
                fontSize: 14,
                opacity: loading || validatingEmail ? 0.6 : 1
              }}
            />
            {validatingEmail && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Vérification...</div>}
            {emailError && <div style={{ fontSize: 12, color: '#d32f2f', marginTop: 4 }}>{emailError}</div>}
          </div>

          {/* Role */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Rôle
            </label>
            <select
              value={formData.role || ''}
              onChange={(e) => handleChange('role', e.target.value || null)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            >
              <option value="">Sélectionner un rôle</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="A-E">A-E</option>
            </select>
            {formData.role && !['Admin', 'Manager', 'A-E'].includes(formData.role) && (
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="Autre rôle"
                style={{
                  width: '100%',
                  padding: 10,
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  marginTop: 8
                }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Nom */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Nom <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => handleChange('nom', e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>

          {/* Prénom */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Prénom <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.prenom}
              onChange={(e) => handleChange('prenom', e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Service */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Service
            </label>
            <input
              type="text"
              value={formData.service || ''}
              onChange={(e) => handleChange('service', e.target.value || null)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>

          {/* Lieux */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Lieu
            </label>
            <input
              type="text"
              value={formData.lieux || ''}
              onChange={(e) => handleChange('lieux', e.target.value || null)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Heures contractuelles */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Heures contractuelles par semaine
            </label>
            <input
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={formData.heures_contractuelles_semaine || 35}
              onChange={(e) => handleChange('heures_contractuelles_semaine', parseFloat(e.target.value) || 35)}
              disabled={loading}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Valeur entre 0 et 60 heures</div>
          </div>

          {/* Telegram ID */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Telegram ID
            </label>
            <input
              type="text"
              value={formData.telegramID || ''}
              onChange={(e) => handleChange('telegramID', e.target.value || null)}
              disabled={loading}
              placeholder="ID Telegram (ex: @username ou 123456789)"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                fontFamily: 'monospace',
                opacity: loading ? 0.6 : 1
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Avatar */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Lien de l'avatar
            </label>
            <input
              type="url"
              value={formData.avatar || ''}
              onChange={(e) => handleChange('avatar', e.target.value || null)}
              disabled={loading}
              placeholder="https://example.com/avatar.jpg"
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ddd',
                fontSize: 14,
                opacity: loading ? 0.6 : 1
              }}
            />
            {formData.avatar && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={formData.avatar}
                  alt="Avatar preview"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #e0e0e0'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Actif */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 14, marginBottom: 8 }}>
              Statut
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={formData.actif}
                onChange={(e) => handleChange('actif', e.target.checked)}
                disabled={loading}
                style={{ cursor: 'pointer', width: 18, height: 18 }}
              />
              <span>Utilisateur actif</span>
            </label>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {formData.actif ? 'L\'utilisateur peut se connecter et utiliser l\'application' : 'L\'utilisateur est désactivé et ne peut pas se connecter'}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: '1px solid #e0e0e0' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: '#f5f5f5',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !!emailError || validatingEmail}
            style={{
              background: loading || emailError || validatingEmail ? '#ccc' : '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || emailError || validatingEmail ? 'not-allowed' : 'pointer',
              opacity: loading || emailError || validatingEmail ? 0.6 : 1
            }}
          >
            {loading ? 'Enregistrement...' : isEditMode ? 'Enregistrer les modifications' : 'Créer l\'utilisateur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;

