import React from 'react';

interface RealTimeStatusProps {
  users: Array<{
    id: string;
    nom: string;
    prenom: string;
    statut: string;
    lieu?: string;
    service?: string;
  }>;
  title?: string;
}

const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ users, title = "Statut Temps Réel" }) => {
  // Grouper les utilisateurs par statut
  const presentUsers = users.filter(user => user.statut === 'present');
  const pauseUsers = users.filter(user => user.statut === 'pause');
  const absentUsers = users.filter(user => user.statut === 'absent');

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'present': return '#4CAF50';
      case 'pause': return '#FF9800';
      case 'absent': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // Fonction pour obtenir l'icône du statut
  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'present': return '🟢';
      case 'pause': return '🟡';
      case 'absent': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      
      <div className="realtime-status">
        {/* Résumé des statuts */}
        <div className="status-summary">
          <div className="status-item present">
            <span className="status-icon">🟢</span>
            <span className="status-label">Présents</span>
            <span className="status-count">{presentUsers.length}</span>
          </div>
          <div className="status-item pause">
            <span className="status-icon">🟡</span>
            <span className="status-label">En pause</span>
            <span className="status-count">{pauseUsers.length}</span>
          </div>
          <div className="status-item absent">
            <span className="status-icon">🔴</span>
            <span className="status-label">Absents</span>
            <span className="status-count">{absentUsers.length}</span>
          </div>
        </div>

        {/* Liste des utilisateurs présents */}
        {presentUsers.length > 0 && (
          <div className="status-section">
            <h4>👥 Présents maintenant ({presentUsers.length})</h4>
            <div className="users-list">
              {presentUsers.map(user => (
                <div key={user.id} className="user-item present">
                  <span className="user-name">{user.prenom} {user.nom}</span>
                  {user.lieu && <span className="user-location">📍 {user.lieu}</span>}
                  {user.service && <span className="user-service">🏢 {user.service}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des utilisateurs en pause */}
        {pauseUsers.length > 0 && (
          <div className="status-section">
            <h4>⏸️ En pause ({pauseUsers.length})</h4>
            <div className="users-list">
              {pauseUsers.map(user => (
                <div key={user.id} className="user-item pause">
                  <span className="user-name">{user.prenom} {user.nom}</span>
                  {user.lieu && <span className="user-location">📍 {user.lieu}</span>}
                  {user.service && <span className="user-service">🏢 {user.service}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message si aucun utilisateur présent */}
        {presentUsers.length === 0 && pauseUsers.length === 0 && (
          <div className="no-users-message">
            <p>Aucun utilisateur présent ou en pause actuellement.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeStatus;
