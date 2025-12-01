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
    <div style={{ 
      background: '#fff', 
      borderRadius: 16, 
      padding: '32px', 
      maxWidth: 1000, 
      margin: '0 auto',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ marginBottom: 32 }}>
        {error && (
          <div style={{ 
            background: '#fff3cd', 
            color: '#856404', 
            padding: '14px 16px', 
            borderRadius: 10, 
            marginBottom: 24, 
            border: '1px solid #ffeaa7',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section: Informations de base */}
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: 12, 
            padding: '28px', 
            marginBottom: 32,
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#495057', 
              fontSize: 16, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>👤</span> Informations de base
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Email <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  disabled={loading || validatingEmail}
                  placeholder="exemple@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: emailError ? '2px solid #dc3545' : '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading || validatingEmail ? 0.6 : 1,
                    transition: 'all 0.2s',
                    background: '#fff'
                  }}
                  onFocus={(e) => {
                    if (!emailError) e.currentTarget.style.borderColor = '#1976d2';
                  }}
                  onBlur={(e) => {
                    if (!emailError) e.currentTarget.style.borderColor = '#ced4da';
                  }}
                />
                {validatingEmail && <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⏳</span> Vérification...
                </div>}
                {emailError && <div style={{ fontSize: 12, color: '#dc3545', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>❌</span> {emailError}
                </div>}
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Rôle
                </label>
                <select
                  value={formData.role || ''}
                  onChange={(e) => handleChange('role', e.target.value || null)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
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
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #ced4da',
                      fontSize: 14,
                      marginTop: 8,
                      background: '#fff',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section: Identité */}
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: 12, 
            padding: '28px', 
            marginBottom: 32,
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#495057', 
              fontSize: 16, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>📝</span> Identité
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Nom */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Nom <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Nom de famille"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
              </div>

              {/* Prénom */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Prénom <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => handleChange('prenom', e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Prénom"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
              </div>
            </div>
          </div>

          {/* Section: Organisation */}
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: 12, 
            padding: '28px', 
            marginBottom: 32,
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#495057', 
              fontSize: 16, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>🏢</span> Organisation
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Service */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Service
                </label>
                <input
                  type="text"
                  value={formData.service || ''}
                  onChange={(e) => handleChange('service', e.target.value || null)}
                  disabled={loading}
                  placeholder="Service ou département"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
              </div>

              {/* Lieux */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Lieu
                </label>
                <input
                  type="text"
                  value={formData.lieux || ''}
                  onChange={(e) => handleChange('lieux', e.target.value || null)}
                  disabled={loading}
                  placeholder="Lieu de travail"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
              </div>
            </div>
          </div>

          {/* Section: Paramètres */}
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: 12, 
            padding: '28px', 
            marginBottom: 32,
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#495057', 
              fontSize: 16, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚙️</span> Paramètres
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Heures contractuelles */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
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
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>💡 Valeur entre 0 et 60 heures</div>
              </div>

              {/* Telegram ID */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Telegram ID
                </label>
                <input
                  type="text"
                  value={formData.telegramID || ''}
                  onChange={(e) => handleChange('telegramID', e.target.value || null)}
                  disabled={loading}
                  placeholder="@username ou 123456789"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
              </div>
            </div>
          </div>

          {/* Section: Profil */}
          <div style={{ 
            background: '#f8f9fa', 
            borderRadius: 12, 
            padding: '28px', 
            marginBottom: 32,
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              margin: '0 0 24px 0', 
              color: '#495057', 
              fontSize: 16, 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>🖼️</span> Profil
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {/* Avatar */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
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
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #ced4da',
                    fontSize: 14,
                    opacity: loading ? 0.6 : 1,
                    background: '#fff',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#1976d2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
                />
                {formData.avatar && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={formData.avatar}
                      alt="Avatar preview"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #1976d2',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Aperçu</span>
                  </div>
                )}
              </div>

              {/* Actif */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 13, marginBottom: 10 }}>
                  Statut
                </label>
                <div style={{
                  background: '#fff',
                  border: '1px solid #ced4da',
                  borderRadius: 8,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 500
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.actif}
                      onChange={(e) => handleChange('actif', e.target.checked)}
                      disabled={loading}
                      style={{ 
                        cursor: loading ? 'not-allowed' : 'pointer', 
                        width: 20, 
                        height: 20,
                        accentColor: formData.actif ? '#28a745' : '#6c757d'
                      }}
                    />
                    <span style={{ color: formData.actif ? '#28a745' : '#6c757d', fontWeight: 600 }}>
                      {formData.actif ? '✓ Utilisateur actif' : '✗ Utilisateur inactif'}
                    </span>
                  </label>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#6c757d', 
                    paddingLeft: 32,
                    lineHeight: 1.5
                  }}>
                    {formData.actif 
                      ? '✅ L\'utilisateur peut se connecter et utiliser l\'application' 
                      : '❌ L\'utilisateur est désactivé et ne peut pas se connecter'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            justifyContent: 'flex-end', 
            marginTop: 8,
            paddingTop: 24, 
            borderTop: '2px solid #e9ecef'
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                background: '#fff',
                color: '#6c757d',
                border: '2px solid #dee2e6',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#adb5bd';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#dee2e6';
                }
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !!emailError || validatingEmail}
              style={{
                background: loading || emailError || validatingEmail 
                  ? '#adb5bd' 
                  : '#4caf50',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 32px',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading || emailError || validatingEmail ? 'not-allowed' : 'pointer',
                opacity: loading || emailError || validatingEmail ? 0.6 : 1,
                boxShadow: loading || emailError || validatingEmail 
                  ? 'none' 
                  : '0 2px 8px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading && !emailError && !validatingEmail) {
                  e.currentTarget.style.background = '#45a049';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !emailError && !validatingEmail) {
                  e.currentTarget.style.background = '#4caf50';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(76, 175, 80, 0.3)';
                }
              }}
            >
              {loading ? '⏳ Enregistrement...' : isEditMode ? '💾 Enregistrer les modifications' : '✨ Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;

