import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Dashboard from './Dashboard';
import { fetchPendingModificationRequests, validateModificationRequest, type ModificationRequestWithDetails } from '../services/sessionModificationService';
import { fetchPendingOubliRequests, validateOubliRequest, type OubliBadgeageRequestWithDetails } from '../services/oubliBadgeageService';
import { formatTime, formatDate, formatDuration } from '../services/sessionService';

// Composant popup de succès
const SuccessPopup: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div style={{
    position: 'fixed',
    top: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#43a047',
    color: '#fff',
    padding: '18px 32px',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    zIndex: 1000,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: 1,
    minWidth: 220,
    textAlign: 'center',
  }}>
    {message}
    <button onClick={onClose} style={{ marginLeft: 24, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
  </div>
);

// Unified component for validating both session modifications and oubli badgeage requests
const UnifiedValidationSection: React.FC<{ 
  adminUser: any; 
  onBack: () => void;
  onSuccess: (message: string) => void;
}> = ({ adminUser, onBack, onSuccess }) => {
  const [modificationRequests, setModificationRequests] = useState<ModificationRequestWithDetails[]>([]);
  const [oubliRequests, setOubliRequests] = useState<OubliBadgeageRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validatorComment, setValidatorComment] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modifs, oublis] = await Promise.all([
        fetchPendingModificationRequests(),
        fetchPendingOubliRequests()
      ]);
      setModificationRequests(modifs);
      setOubliRequests(oublis);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError('Erreur lors du chargement des demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleValidateModification = async (modifId: string, approuve: boolean) => {
    if (!adminUser?.id) {
      setError('Administrateur non identifié.');
      return;
    }

    setValidatingId(modifId);
    setError(null);

    try {
      const comment = validatorComment[modifId] || null;
      await validateModificationRequest(modifId, adminUser.id, approuve, comment);
      onSuccess(approuve ? 'Demande de modification approuvée avec succès !' : 'Demande de modification refusée.');
      setModificationRequests(prev => prev.filter(r => r.id !== modifId));
      setValidatorComment(prev => {
        const next = { ...prev };
        delete next[modifId];
        return next;
      });
    } catch (err: any) {
      console.error('Error validating modification request:', err);
      setError(err.message || 'Erreur lors de la validation de la demande.');
    } finally {
      setValidatingId(null);
    }
  };

  const handleValidateOubli = async (requestId: string, approuve: boolean) => {
    if (!adminUser?.id) {
      setError('Administrateur non identifié.');
      return;
    }

    setValidatingId(requestId);
    setError(null);

    try {
      const comment = validatorComment[requestId] || null;
      await validateOubliRequest(requestId, adminUser.id, approuve, comment);
      onSuccess(approuve ? 'Demande d\'oubli de badgeage approuvée avec succès !' : 'Demande d\'oubli de badgeage refusée.');
      setOubliRequests(prev => prev.filter(r => r.id !== requestId));
      setValidatorComment(prev => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    } catch (err: any) {
      console.error('Error validating oubli request:', err);
      setError(err.message || 'Erreur lors de la validation de la demande.');
    } finally {
      setValidatingId(null);
    }
  };

  const getTimeFromTimestamp = (ts: string | null): string => {
    if (!ts) return 'N/A';
    const timeMatch = ts.match(/(\d{2}):(\d{2})/);
    return timeMatch ? timeMatch[0] : formatTime(ts);
  };

  const totalRequests = modificationRequests.length + oubliRequests.length;

  return (
    <div style={{ background: '#fff', borderRadius: 20, maxWidth: 1000, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Valider les demandes</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchRequests} disabled={loading} style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14 }}>🔄 Actualiser</button>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #f5c6cb' }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Chargement des demandes...</div>
      ) : totalRequests === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666', background: '#f8f9fa', borderRadius: 12 }}>
          ✓ Aucune demande en attente
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Session Modification Requests */}
          {modificationRequests.map((request) => (
            <div key={request.id} style={{ 
              border: '2px solid #e0e0e0', 
              borderRadius: 12, 
              padding: 20, 
              background: '#fafafa',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              {/* Type badge */}
              <div style={{ 
                display: 'inline-block', 
                background: '#1976d2', 
                color: '#fff', 
                padding: '4px 12px', 
                borderRadius: 6, 
                fontSize: 12, 
                fontWeight: 600, 
                marginBottom: 16 
              }}>
                MODIFICATION DE SESSION
              </div>

              {/* User and date header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e0e0e0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 4 }}>
                    {request.utilisateur_prenom} {request.utilisateur_nom}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {request.utilisateur_email}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                    Session du {formatDate(request.session_jour_local)}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Demande du {new Date(request.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Current vs Proposed changes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                {/* Current values */}
                <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                  <div style={{ fontWeight: 600, color: '#666', marginBottom: 12, fontSize: 14 }}>Valeurs actuelles</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Entrée: </span>
                    <strong>{getTimeFromTimestamp(request.session_entree_ts)}</strong>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Sortie: </span>
                    <strong>{getTimeFromTimestamp(request.session_sortie_ts)}</strong>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Durée: </span>
                    <strong>{formatDuration(request.session_duree_minutes)}</strong>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Pause: </span>
                    <strong>{formatDuration(request.session_pause_minutes || 0)}</strong>
                  </div>
                  {request.session_lieux && (
                    <div>
                      <span style={{ color: '#666', fontSize: 13 }}>Lieu: </span>
                      <strong>{request.session_lieux}</strong>
                    </div>
                  )}
                </div>

                {/* Proposed values */}
                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, border: '1px solid #ffcc80' }}>
                  <div style={{ fontWeight: 600, color: '#ff9800', marginBottom: 12, fontSize: 14 }}>Valeurs proposées</div>
                  {request.proposed_entree_ts && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontSize: 13 }}>Entrée: </span>
                      <strong style={{ color: request.proposed_entree_ts !== request.session_entree_ts ? '#ff9800' : '#333' }}>
                        {getTimeFromTimestamp(request.proposed_entree_ts)}
                      </strong>
                    </div>
                  )}
                  {request.proposed_sortie_ts && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontSize: 13 }}>Sortie: </span>
                      <strong style={{ color: request.proposed_sortie_ts !== request.session_sortie_ts ? '#ff9800' : '#333' }}>
                        {getTimeFromTimestamp(request.proposed_sortie_ts)}
                      </strong>
                    </div>
                  )}
                  {request.proposed_entree_ts && request.proposed_sortie_ts && (() => {
                    const proposedPauseMinutes = Math.max(0, (request.session_pause_minutes || 0) + request.pause_delta_minutes);
                    const totalMinutes = Math.round((new Date(request.proposed_sortie_ts).getTime() - new Date(request.proposed_entree_ts).getTime()) / 60000);
                    const proposedDurationMinutes = Math.max(0, totalMinutes - proposedPauseMinutes);
                    return (
                      <>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: '#666', fontSize: 13 }}>Durée: </span>
                          <strong style={{ color: proposedDurationMinutes !== request.session_duree_minutes ? '#ff9800' : '#333' }}>
                            {formatDuration(proposedDurationMinutes)}
                          </strong>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ color: '#666', fontSize: 13 }}>Pause: </span>
                          <strong style={{ color: proposedPauseMinutes !== (request.session_pause_minutes || 0) ? '#ff9800' : '#333' }}>
                            {formatDuration(proposedPauseMinutes)}
                          </strong>
                        </div>
                      </>
                    );
                  })()}
                  {request.pause_delta_minutes !== 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontSize: 13 }}>Ajustement pause: </span>
                      <strong style={{ color: request.pause_delta_minutes > 0 ? '#4caf50' : '#f44336' }}>
                        {request.pause_delta_minutes > 0 ? '+' : ''}{request.pause_delta_minutes} min
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Motif and commentaire */}
              <div style={{ marginBottom: 16 }}>
                {request.motif && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, color: '#666', fontSize: 13 }}>Motif: </span>
                    <span>{request.motif}</span>
                  </div>
                )}
                {request.commentaire && (
                  <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 14, color: '#333' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13, color: '#666' }}>Commentaire de l'utilisateur:</div>
                    {request.commentaire}
                  </div>
                )}
              </div>

              {/* Validator comment input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 13, marginBottom: 8 }}>
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={validatorComment[request.id] || ''}
                  onChange={(e) => setValidatorComment(prev => ({ ...prev, [request.id]: e.target.value }))}
                  placeholder="Ajouter un commentaire pour cette validation..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleValidateModification(request.id, false)}
                  disabled={validatingId === request.id}
                  style={{
                    background: '#f44336',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: validatingId === request.id ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: validatingId === request.id ? 0.6 : 1
                  }}
                >
                  {validatingId === request.id ? 'Traitement...' : '✗ Refuser'}
                </button>
                <button
                  onClick={() => handleValidateModification(request.id, true)}
                  disabled={validatingId === request.id}
                  style={{
                    background: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: validatingId === request.id ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: validatingId === request.id ? 0.6 : 1
                  }}
                >
                  {validatingId === request.id ? 'Traitement...' : '✓ Approuver'}
                </button>
              </div>
            </div>
          ))}

          {/* Oubli Badgeage Requests */}
          {oubliRequests.map((request) => (
            <div key={request.id} style={{ 
              border: '2px solid #e0e0e0', 
              borderRadius: 12, 
              padding: 20, 
              background: '#fafafa',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              {/* Type badge */}
              <div style={{ 
                display: 'inline-block', 
                background: '#ff9800', 
                color: '#fff', 
                padding: '4px 12px', 
                borderRadius: 6, 
                fontSize: 12, 
                fontWeight: 600, 
                marginBottom: 16 
              }}>
                OUBLI DE BADGEAGE
              </div>

              {/* User and date header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e0e0e0' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 4 }}>
                    {request.utilisateur_prenom} {request.utilisateur_nom}
                  </div>
                  <div style={{ fontSize: 14, color: '#666' }}>
                    {request.utilisateur_email}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                    Date: {formatDate(request.date_heure_entree)}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    Demande du {new Date(request.date_heure_saisie).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e0e0e0' }}>
                  <div style={{ fontWeight: 600, color: '#666', marginBottom: 12, fontSize: 14 }}>Heures déclarées</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Entrée: </span>
                    <strong>{formatTime(request.date_heure_entree)}</strong>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Sortie: </span>
                    <strong>{formatTime(request.date_heure_sortie)}</strong>
                  </div>
                  {request.date_heure_pause_debut && request.date_heure_pause_fin && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#666', fontSize: 13 }}>Pause: </span>
                      <strong>{formatTime(request.date_heure_pause_debut)} - {formatTime(request.date_heure_pause_fin)}</strong>
                      <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
                        ({Math.round((new Date(request.date_heure_pause_fin).getTime() - new Date(request.date_heure_pause_debut).getTime()) / 60000)} min)
                      </span>
                    </div>
                  )}
                  {request.lieux && (
                    <div>
                      <span style={{ color: '#666', fontSize: 13 }}>Lieu: </span>
                      <strong>{request.lieux}</strong>
                    </div>
                  )}
                </div>

                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, border: '1px solid #ffcc80' }}>
                  <div style={{ fontWeight: 600, color: '#ff9800', marginBottom: 12, fontSize: 14 }}>Informations</div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: '#666', fontSize: 13 }}>Raison: </span>
                    <strong>{request.raison}</strong>
                  </div>
                  {request.perte_badge && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#f44336', fontSize: 13, fontWeight: 600 }}>⚠ Badge perdu/cassé</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Commentaire */}
              {request.commentaire && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 14, color: '#333' }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13, color: '#666' }}>Commentaire de l'utilisateur:</div>
                    {request.commentaire}
                  </div>
                </div>
              )}

              {/* Validator comment input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, color: '#666', fontSize: 13, marginBottom: 8 }}>
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={validatorComment[request.id] || ''}
                  onChange={(e) => setValidatorComment(prev => ({ ...prev, [request.id]: e.target.value }))}
                  placeholder="Ajouter un commentaire pour cette validation..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #ddd',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleValidateOubli(request.id, false)}
                  disabled={validatingId === request.id}
                  style={{
                    background: '#f44336',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: validatingId === request.id ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: validatingId === request.id ? 0.6 : 1
                  }}
                >
                  {validatingId === request.id ? 'Traitement...' : '✗ Refuser'}
                </button>
                <button
                  onClick={() => handleValidateOubli(request.id, true)}
                  disabled={validatingId === request.id}
                  style={{
                    background: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: validatingId === request.id ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                    opacity: validatingId === request.id ? 0.6 : 1
                  }}
                >
                  {validatingId === request.id ? 'Traitement...' : '✓ Approuver'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Liste des utilisateurs actifs
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [nfcTag, setNfcTag] = useState('');
  const [lieu, setLieu] = useState('');
  const [ip, setIp] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [message, setMessage] = useState('');

  // Admin auth
  const [adminUser, setAdminUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isAssociating, setIsAssociating] = useState(false);
  const nfcAbortRef = useRef<AbortController | null>(null);
  
  // Admin Google OAuth auth
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Section de l'administration actuelle
  const [adminSection, setAdminSection] = useState<string | null>(null);

  // Popup de succès
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Recherche utilisateur pour le menu déroulant
  const [userSearch, setUserSearch] = useState('');
  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase();
    return (
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q)
    );
  });

  // Filtrer les administrateurs pour l'authentification
  const adminUsers = users.filter(u => u.role === 'Admin');
  const filteredAdminUsers = adminUsers.filter(u => {
    const q = userSearch.trim().toLowerCase();
    return (
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q)
    );
  });

  // Fonction pour afficher le popup de succès et revenir à la page d'administration
  const showSuccessAndReturn = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    // Abort le scan NFC en cours pour permettre de nouveaux scans
    if (nfcAbortRef.current) {
      nfcAbortRef.current.abort();
      nfcAbortRef.current = null;
    }
    setTimeout(() => {
      setShowSuccess(false);
      setAdminSection(null); // Revenir à la page d'administration
      setMessage(''); // Réinitialiser les messages
      setNfcTag(''); // Réinitialiser le tag NFC
      setSelectedUser(''); // Réinitialiser la sélection d'utilisateur
      setLieu(''); // Réinitialiser le lieu
      setIsAssociating(false); // Réinitialiser l'état de scan
    }, 2000);
  };

     // Récupérer la liste des utilisateurs actifs au montage
   useEffect(() => {
           const fetchUsers = async () => {
        const { data, error } = await supabase
          .from('appbadge_utilisateurs')
          .select('id, nom, prenom, role, actif, avatar, email, service, lieux')
          .eq('actif', true)
          .order('nom', { ascending: true });
        if (!error && data) setUsers(data);
      };
     fetchUsers();
   }, []);

   // Handle admin OAuth return
   useEffect(() => {
     const handleAdminOAuthReturn = async () => {
       try {
         const urlParams = new URLSearchParams(window.location.search);
         const isAdminOAuthReturn = urlParams.get('admin_oauth') === '1';
         
         if (isAdminOAuthReturn) {
           // Check if we have a session and admin user in localStorage
           const { data: sessionData } = await supabase.auth.getSession();
           const raw = localStorage.getItem('adminUser');
           
           if (sessionData?.session && raw) {
             const adminUser = JSON.parse(raw);
             const authedEmail = sessionData.session.user?.email || '';
             
             if (authedEmail && adminUser.email && authedEmail.toLowerCase() === adminUser.email.toLowerCase()) {
               setAdminUser(adminUser);
               setSelectedAdmin('');
               setAuthError('');
             } else {
               setAuthError('Email Google ne correspond pas à l\'administrateur sélectionné.');
             }
             localStorage.removeItem('adminUser');
           }
         }
       } catch (error) {
         console.error('Error handling admin OAuth return:', error);
       }
     };
     
     handleAdminOAuthReturn();
   }, []);

  // Google OAuth pour administrateur
  const handleAdminGoogleAuth = async () => {
    if (!selectedAdmin) {
      setAuthError('Veuillez sélectionner un administrateur.');
      return;
    }
    
    setIsConnecting(true);
    setAuthError('');
    
    try {
      const selectedUser = users.find(u => u.id === selectedAdmin);
      if (!selectedUser) {
        setAuthError('Administrateur non trouvé.');
        setIsConnecting(false);
        return;
      }

      // If already authenticated in Supabase, verify email and proceed
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        const authedEmail = sessionData.session.user?.email || '';
        if (authedEmail && selectedUser.email && authedEmail.toLowerCase() === selectedUser.email.toLowerCase()) {
          setAdminUser(selectedUser);
          setIsConnecting(false);
          return;
        } else {
          setAuthError('Email Google ne correspond pas à l\'administrateur sélectionné.');
          setIsConnecting(false);
          return;
        }
      }

      // Persist selected admin so we can verify after OAuth redirect
      try {
        localStorage.setItem('adminUser', JSON.stringify(selectedUser));
      } catch {}

      // Request OAuth URL and perform a full-page redirect
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}?admin_oauth=1`,
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        setAuthError('Erreur lors de la connexion Google. Veuillez réessayer.');
        setIsConnecting(false);
        return;
      }
      
      return;
    } catch (err) {
      setAuthError("Erreur lors de la connexion.");
      setIsConnecting(false);
      return;
    }
  };

  // Association NFC à un utilisateur
  const handleAssociateNfc = async () => {
    setIsAssociating(true);
    setMessage('');
    setNfcTag('');
    if (!('NDEFReader' in window)) {
      setMessage('NFC non supporté sur ce navigateur/appareil.');
      setIsAssociating(false);
      return;
    }
    try {
      const NDEFReader = (window as any).NDEFReader;
      const controller = new AbortController();
      nfcAbortRef.current = controller;
      const ndef = new NDEFReader();
      await ndef.scan({ signal: controller.signal });
      ndef.onreading = async (event: any) => {
        let uid = event.serialNumber || (event.target && event.target.serialNumber);
        if (!uid) {
          setMessage('Tag scanné, mais aucun numéro de série (UID) trouvé.');
          setIsAssociating(false);
          return;
        }
        setNfcTag(uid);
        // Insertion dans appbadge_badges
        const { error } = await supabase.from('appbadge_badges').insert({
          utilisateur_id: selectedUser,
          uid_tag: uid
        });
        if (!error) {
          showSuccessAndReturn('Badge associé avec succès !');
        } else {
          setMessage("Erreur lors de l'association du badge.");
        }
        setIsAssociating(false);
        // Ne pas abort ici pour permettre de nouveaux scans
        // if (nfcAbortRef.current) nfcAbortRef.current.abort();
      };
    } catch (e) {
      setMessage('Erreur lors du scan NFC.');
      setIsAssociating(false);
    }
  };

  // Nettoyage NFC à la fermeture
  useEffect(() => {
    return () => {
      if (nfcAbortRef.current) nfcAbortRef.current.abort();
    };
  }, []);

  // IP et GPS mock
  const handleGetIpGps = async () => {
    setIp('192.168.1.100');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toString());
          setLongitude(pos.coords.longitude.toString());
        },
        () => {
          setLatitude('');
          setLongitude('');
        }
      );
    }
  };

  // Réinitialiser le tag NFC à chaque ouverture du formulaire d'association
  useEffect(() => {
    if (adminSection === 'associer-tag') {
      setNfcTag('');
      setMessage('');
      setIsAssociating(false);
      // Abort tout scan NFC en cours
      if (nfcAbortRef.current) {
        nfcAbortRef.current.abort();
        nfcAbortRef.current = null;
      }
    }
  }, [adminSection]);

  // Récupération auto IP + GPS à l'ouverture du formulaire d'ajout de lieu
  useEffect(() => {
    if (adminSection === 'ajouter-lieu') {
      // IP via ipify
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => setIp(data.ip))
        .catch(() => setIp(''));
      // GPS
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLatitude(pos.coords.latitude.toString());
            setLongitude(pos.coords.longitude.toString());
          },
          () => {
            setLatitude('');
            setLongitude('');
          }
        );
      }
    }
  }, [adminSection]);

  // Ajoute l'état pour le dropdown custom
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  // Ferme le dropdown si on clique en dehors
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const el = document.getElementById('admin-user-dropdown');
      if (el && !el.contains(e.target as Node)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserDropdown]);

  // État pour le formulaire d'horaires standards
  const [horaireLieu, setHoraireLieu] = useState('');
  const [horaireHeureDebut, setHoraireHeureDebut] = useState('');
  const [horaireHeureFin, setHoraireHeureFin] = useState('');
  const [horaireIp, setHoraireIp] = useState('');
  const [horaireLatitude, setHoraireLatitude] = useState('');
  const [horaireLongitude, setHoraireLongitude] = useState('');

  // Formulaire d'ajout d'horaires standards
  if (adminSection === 'ajouter-horaire') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Ajouter un horaire standard</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Lieu</label>
          <input value={horaireLieu} onChange={e => setHoraireLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de début *</label>
          <input type="time" value={horaireHeureDebut} onChange={e => setHoraireHeureDebut(e.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de fin</label>
          <input type="time" value={horaireHeureFin} onChange={e => setHoraireHeureFin(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Adresse IP (optionnel)</label>
          <input value={horaireIp} onChange={e => setHoraireIp(e.target.value)} placeholder="IP" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Latitude (optionnel)</label>
          <input value={horaireLatitude} onChange={e => setHoraireLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Longitude (optionnel)</label>
          <input value={horaireLongitude} onChange={e => setHoraireLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <button 
            onClick={async () => {
              if (!horaireLieu || !horaireHeureDebut) return;
              const { error } = await supabase.from('appbadge_horaires_standards').insert({
                lieux: horaireLieu,
                heure_debut: horaireHeureDebut,
                heure_fin: horaireHeureFin || null,
                ip_address: horaireIp || null,
                latitude: horaireLatitude || null,
                longitude: horaireLongitude || null
              });
              if (!error) {
                showSuccessAndReturn('Horaire ajouté avec succès !');
                setHoraireLieu(''); setHoraireHeureDebut(''); setHoraireHeureFin(''); setHoraireIp(''); setHoraireLatitude(''); setHoraireLongitude('');
              } else {
                setMessage("Erreur lors de l'ajout de l'horaire.");
              }
            }}
            disabled={!horaireLieu || !horaireHeureDebut} 
            style={{ marginTop: 18, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !horaireLieu || !horaireHeureDebut ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}
          >
            Ajouter l'horaire
          </button>
        </div>
        {message && <div style={{ color: '#1976d2', marginTop: 18, fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  if (!adminUser) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 500, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        <h2 style={{ marginTop: 0 }}>Authentification Admin</h2>
        
        <p style={{ marginBottom: 20 }}>Sélectionnez un administrateur et connectez-vous avec Google :</p>
            
            {/* Sélection de l'administrateur */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15, marginBottom: 8, display: 'block' }}>Administrateur :</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Rechercher un administrateur..."
                  value={selectedAdmin ? (adminUsers.find(u => u.id === selectedAdmin)?.prenom + ' ' + adminUsers.find(u => u.id === selectedAdmin)?.nom) : userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setSelectedAdmin('');
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  style={{
                    fontSize: 16,
                    padding: '12px 12px 12px 44px',
                    borderRadius: 8,
                    border: '1.5px solid #bbb',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#f8f8f8',
                  }}
                />
                {/* Avatar dans le champ */}
                <div style={{ position: 'absolute', left: 8, top: 8 }}>
                  {selectedAdmin && adminUsers.find(u => u.id === selectedAdmin)?.avatar ? (
                    <img src={adminUsers.find(u => u.id === selectedAdmin)?.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2' }}>👤</div>
                  )}
                </div>
                {showUserDropdown && filteredAdminUsers.length > 0 && (
                  <div id="admin-user-dropdown" style={{ 
                    position: 'absolute', 
                    top: 48, 
                    left: 0, 
                    right: 0,
                    background: '#fff', 
                    border: '1.5px solid #1976d2', 
                    borderRadius: 8, 
                    boxShadow: '0 4px 16px rgba(25,118,210,0.08)', 
                    zIndex: 1000, 
                    maxHeight: 220, 
                    overflowY: 'auto',
                  }}>
                    {filteredAdminUsers.map(u => (
                      <div key={u.id} onClick={() => { setSelectedAdmin(u.id); setUserSearch(''); setShowUserDropdown(false); }} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: 10, 
                        cursor: 'pointer', 
                        borderBottom: '1px solid #f0f0f0', 
                        background: selectedAdmin === u.id ? '#e3f2fd' : '#fff',
                      }}>
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2', flexShrink: 0 }}>👤</div>
                        )}
                        <span style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{u.prenom} {u.nom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <button onClick={handleAdminGoogleAuth} disabled={!selectedAdmin || isConnecting} style={{
              fontSize: 18,
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '14px 0',
              fontWeight: 700,
              cursor: !selectedAdmin || isConnecting ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(25,118,210,0.08)',
              transition: 'background 0.2s',
              width: '100%',
            }}>
              {isConnecting ? 'Connexion...' : '🔐 Connexion Google'}
            </button>
        
        {authError && <div style={{ color: 'red', marginTop: 12, fontSize: 14 }}>{authError}</div>}
      </div>
    );
  }

  // Page d'accueil admin : choix des fonctions
  if (!adminSection) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 600, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0 }}>Administration</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 32 }}>
          <button onClick={() => setAdminSection('dashboard')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #3ba27c', background: '#f0f8f4', color: '#3ba27c', fontWeight: 600, cursor: 'pointer' }}>📊 Tableau de bord</button>
          <button onClick={() => setAdminSection('valider-modifications')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #ff9800', background: '#fff3e0', color: '#ff9800', fontWeight: 600, cursor: 'pointer' }}>✅ Valider les modifications de temps</button>
          <button onClick={() => setAdminSection('associer-tag')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #1976d2', background: '#f4f6fa', color: '#1976d2', fontWeight: 600, cursor: 'pointer' }}>Associer un nouveau tag</button>
          <button onClick={() => setAdminSection('ajouter-lieu')} style={{ fontSize: 18, padding: 16, borderRadius: 8, border: '1px solid #1976d2', background: '#f4f6fa', color: '#1976d2', fontWeight: 600, cursor: 'pointer' }}>Ajouter un nouveau lieu</button>
        </div>
      </div>
    );
  }

  // Formulaire d'association de tag
  if (adminSection === 'associer-tag') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Associer un tag NFC à un utilisateur</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Utilisateur</label>
          {/* Champ autocomplete utilisateur */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
              value={selectedUser ? (users.find(u => u.id === selectedUser)?.prenom + ' ' + users.find(u => u.id === selectedUser)?.nom) : userSearch}
              onChange={e => {
                setUserSearch(e.target.value);
                setSelectedUser('');
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              style={{
                fontSize: 16,
                padding: '12px 12px 12px 44px',
                borderRadius: 8,
                border: '1.5px solid #bbb',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#f8f8f8',
                marginBottom: 2,
                display: 'block',
              }}
            />
            {/* Avatar dans le champ */}
            <div style={{ position: 'absolute', left: 8, top: 8 }}>
              {selectedUser && users.find(u => u.id === selectedUser)?.avatar ? (
                <img src={users.find(u => u.id === selectedUser)?.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa' }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2' }}>👤</div>
              )}
            </div>
            {showUserDropdown && filteredUsers.length > 0 && (
              <div id="admin-user-dropdown" style={{ 
                position: 'absolute', 
                top: 48, 
                left: 0, 
                right: 0,
                width: '100%', 
                maxWidth: '100%',
                boxSizing: 'border-box',
                background: '#fff', 
                border: '1.5px solid #1976d2', 
                borderRadius: 8, 
                boxShadow: '0 4px 16px rgba(25,118,210,0.08)', 
                zIndex: 1000, 
                maxHeight: 220, 
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                isolation: 'isolate'
              }}>
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => { setSelectedUser(u.id); setUserSearch(''); setShowUserDropdown(false); }} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: 10, 
                    cursor: 'pointer', 
                    borderBottom: '1px solid #f0f0f0', 
                    background: selectedUser === u.id ? '#e3f2fd' : '#fff',
                    minWidth: 0,
                    overflow: 'hidden',
                    WebkitTapHighlightColor: 'transparent',
                    position: 'relative',
                    zIndex: 1001
                  }}>
                    {u.avatar ? (
                      <img src={u.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.2px solid #1976d2', background: '#f4f6fa', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f4f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#bbb', border: '1.2px solid #1976d2', flexShrink: 0 }}>👤</div>
                    )}
                    <span style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{u.prenom} {u.nom}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Fin autocomplete */}
          <button onClick={handleAssociateNfc} disabled={!selectedUser || isAssociating} style={{ marginTop: 8, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !selectedUser || isAssociating ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}>
            {isAssociating ? 'En attente du scan...' : 'Associer'}
          </button>
          {nfcTag && <div style={{ margin: '10px 0 0 0', color: '#1976d2', fontWeight: 600, fontSize: 15 }}>Tag scanné : <b>{nfcTag}</b></div>}
          {message && <div style={{ color: '#1976d2', marginTop: 12, fontWeight: 600 }}>{message}</div>}
        </div>
      </div>
    );
  }

  // Afficher le tableau de bord
  if (adminSection === 'dashboard') {
    return <Dashboard onBack={() => setAdminSection(null)} />;
  }

  // Section de validation des modifications de temps
  if (adminSection === 'valider-modifications') {
    return <UnifiedValidationSection 
      adminUser={adminUser} 
      onBack={() => setAdminSection(null)} 
      onSuccess={(msg) => showSuccessAndReturn(msg)}
    />;
  }

  // Supprimer le formulaire d'ajout d'horaires standards séparé
  // Fusionner les champs horaires dans le formulaire d'ajout de lieu
  if (adminSection === 'ajouter-lieu') {
    return (
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 600, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
        {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={() => setAdminSection(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
        </div>
        <h2 style={{ marginTop: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Ajouter un nouveau lieu</h2>
        <div style={{ background: '#fffbe6', border: '1.5px solid #ffe58f', color: '#ad8b00', borderRadius: 10, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15 }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <span>Assurez-vous d'être connecté au réseau de l'OTI avant d'ajouter un nouveau lieu.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Nom du lieu</label>
          <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de début *</label>
          <input type="time" value={horaireHeureDebut} onChange={e => setHoraireHeureDebut(e.target.value)} required style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Heure de fin</label>
          <input type="time" value={horaireHeureFin} onChange={e => setHoraireHeureFin(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #bbb', fontSize: 16, background: '#f8f8f8' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Adresse IP</label>
          <input value={ip} onChange={e => setIp(e.target.value)} placeholder="IP" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Latitude</label>
          <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <label style={{ fontWeight: 600, color: '#1976d2', fontSize: 15 }}>Longitude</label>
          <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #eee', fontSize: 16, background: '#f4f6fa', color: '#888' }} />
          <button 
            onClick={async () => {
              if (!lieu || !horaireHeureDebut) return;
              // Ajout du lieu
              const { error: lieuError } = await supabase.from('appbadge_lieux').insert({
                nom: lieu,
                ip: ip,
                latitude: latitude,
                longitude: longitude
              });
              // Ajout de l'horaire standard
              const { error: horaireError } = await supabase.from('appbadge_horaires_standards').insert({
                lieux: lieu,
                heure_debut: horaireHeureDebut,
                heure_fin: horaireHeureFin || null,
                ip_address: ip || null,
                latitude: latitude || null,
                longitude: longitude || null
              });
              if (!lieuError && !horaireError) {
                showSuccessAndReturn('Lieu et horaire ajoutés avec succès !');
                setLieu(''); setHoraireHeureDebut(''); setHoraireHeureFin(''); setIp(''); setLatitude(''); setLongitude('');
              } else {
                setMessage("Erreur lors de l'ajout du lieu ou de l'horaire.");
              }
            }}
            disabled={!lieu || !horaireHeureDebut} 
            style={{ marginTop: 18, fontSize: 18, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 0', fontWeight: 700, cursor: !lieu || !horaireHeureDebut ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(25,118,210,0.08)', transition: 'background 0.2s' }}
          >
            Ajouter le lieu et l'horaire
          </button>
        </div>
        {message && <div style={{ color: '#1976d2', marginTop: 18, fontWeight: 600 }}>{message}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, maxWidth: 600, margin: '40px auto', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      {showSuccess && <SuccessPopup message={successMessage} onClose={() => setShowSuccess(false)} />}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, color: '#1976d2', cursor: 'pointer' }}>×</button>
      </div>
      <h2 style={{ marginTop: 0 }}>Administration</h2>
      <div style={{ marginBottom: 32 }}>
        <h3>Associer un tag NFC à un utilisateur</h3>
        <button onClick={handleAssociateNfc} disabled={!selectedUser || isAssociating} style={{ marginBottom: 8 }}>
          {isAssociating ? 'En attente du scan...' : 'Associer'}
        </button>
        {nfcTag && <div style={{ marginBottom: 8 }}>Tag scanné : <b>{nfcTag}</b></div>}
        <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
          <option value="">Sélectionner un utilisateur</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3>Ajouter un nouveau lieu</h3>
        <input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Nom du lieu" style={{ width: '100%', marginBottom: 8 }} />
        <button onClick={handleGetIpGps} style={{ marginBottom: 8 }}>Récupérer IP et GPS</button>
        <input value={ip} onChange={e => setIp(e.target.value)} placeholder="IP" style={{ width: '100%', marginBottom: 8 }} />
        <input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude" style={{ width: '100%', marginBottom: 8 }} />
        <input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude" style={{ width: '100%', marginBottom: 8 }} />
        <button disabled={!lieu || !ip} style={{ marginBottom: 8 }}>Ajouter le lieu</button>
      </div>
      {message && <div style={{ color: '#1976d2', marginTop: 12 }}>{message}</div>}
    </div>
  );
};

export default AdminPage; 