import React, { useState, useEffect } from 'react';
import { fetchAllUsers, type User } from '../services/userManagementService';

interface UserManagementListProps {
  onSelectUser: (user: User) => void;
  onAddNew: () => void;
  refreshTrigger?: number; // Optional trigger to force refresh
}

const UserManagementList: React.FC<UserManagementListProps> = ({ onSelectUser, onAddNew, refreshTrigger }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllUsers(includeInactive);
        setUsers(data);
      } catch (err: any) {
        console.error('Error loading users:', err);
        setError('Erreur lors du chargement des utilisateurs.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [includeInactive, refreshTrigger]); // Add refreshTrigger as dependency

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.nom?.toLowerCase().includes(query) ||
      user.prenom?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.service?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  const formatRole = (role: string | null | undefined): string => {
    if (!role) return 'Non défini';
    return role;
  };

  const formatContractualHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '35h';
    return `${hours}h`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
        Chargement des utilisateurs...
      </div>
    );
  }

  return (
    <div>
      {/* Header with search and filters */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Gestion des utilisateurs</h2>
          <button
            onClick={onAddNew}
            style={{
              background: '#4caf50',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            + Ajouter un utilisateur
          </button>
        </div>

        {/* Search and filter controls */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Rechercher par nom, email, service, rôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#666' }}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Afficher les utilisateurs inactifs
          </label>
        </div>
      </div>

      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 8, marginBottom: 20, border: '1px solid #f5c6cb' }}>
          ⚠ {error}
        </div>
      )}

      {/* Users table */}
      {filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666', background: '#f8f9fa', borderRadius: 12 }}>
          {searchQuery ? 'Aucun utilisateur ne correspond à votre recherche.' : 'Aucun utilisateur trouvé.'}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Avatar</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Nom</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Rôle</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Service</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Heures contractuelles</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Telegram ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#666' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#666' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      opacity: user.actif ? 1 : 0.6,
                      background: user.actif ? '#fff' : '#fafafa'
                    }}
                    onClick={() => onSelectUser(user)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = user.actif ? '#f5f5f5' : '#f0f0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = user.actif ? '#fff' : '#fafafa';
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={`${user.prenom} ${user.nom}`}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e0e0e0'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.setAttribute('style', 'display: flex');
                          }}
                        />
                      ) : null}
                      {!user.avatar && (
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#f4f6fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          color: '#bbb',
                          border: '2px solid #e0e0e0'
                        }}>
                          👤
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>
                      {user.prenom} {user.nom}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#666' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        background: user.role === 'Admin' ? '#e3f2fd' : user.role === 'Manager' ? '#f3e5f5' : user.role === 'A-E' ? '#fff3e0' : '#f5f5f5',
                        color: user.role === 'Admin' ? '#1976d2' : user.role === 'Manager' ? '#9c27b0' : user.role === 'A-E' ? '#ff9800' : '#666'
                      }}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#666' }}>
                      {user.service || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#666' }}>
                      {formatContractualHours(user.heures_contractuelles_semaine)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#666', fontFamily: 'monospace' }}>
                      {user.telegramID || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>
                      {user.actif ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#e8f5e9',
                          color: '#2e7d32'
                        }}>
                          ✓ Actif
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: '#ffebee',
                          color: '#d32f2f'
                        }}>
                          ✗ Inactif
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(user);
                        }}
                        style={{
                          background: '#1976d2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e0e0e0', background: '#f5f5f5', fontSize: 12, color: '#666', textAlign: 'center' }}>
            {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}
            {searchQuery && ` (filtré${filteredUsers.length > 1 ? 's' : ''})`}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementList;

