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
  title: string;
}

const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ users, title }) => {
  // Filtrer et grouper les utilisateurs par statut
  const presentUsers = users.filter(user => user.statut === 'present');
  const pauseUsers = users.filter(user => user.statut === 'pause');
  const absentUsers = users.filter(user => user.statut === 'absent');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return '🟢';
      case 'pause':
        return '🟡';
      case 'absent':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Présents';
      case 'pause':
        return 'En pause';
      case 'absent':
        return 'Absents';
      default:
        return 'Inconnu';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'present':
        return 'present';
      case 'pause':
        return 'pause';
      case 'absent':
        return 'absent';
      default:
        return '';
    }
  };

  return (
    <div className="realtime-status">
      <h3 className="chart-title">{title}</h3>
      
      {/* Résumé des statuts */}
      <div className="status-summary">
        <div className={`status-item ${getStatusClass('present')}`}>
          <div className="status-icon">🟢</div>
          <div className="status-label">Présents</div>
          <div className="status-count">{presentUsers.length}</div>
        </div>
        
        <div className={`status-item ${getStatusClass('pause')}`}>
          <div className="status-icon">🟡</div>
          <div className="status-label">En pause</div>
          <div className="status-count">{pauseUsers.length}</div>
        </div>
        
        <div className={`status-item ${getStatusClass('absent')}`}>
          <div className="status-icon">🔴</div>
          <div className="status-label">Absents</div>
          <div className="status-count">{absentUsers.length}</div>
        </div>
      </div>

      {/* Détail des utilisateurs par statut */}
      <div className="status-section">
        <h4>Utilisateurs présents ({presentUsers.length})</h4>
        {presentUsers.length > 0 ? (
          <div className="users-list">
            {presentUsers.map(user => (
              <div key={user.id} className={`user-item ${getStatusClass(user.statut)}`}>
                <span className="user-name">{user.prenom} {user.nom}</span>
                {user.lieu && <span className="user-location">{user.lieu}</span>}
                {user.service && <span className="user-service">{user.service}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-users-message">Aucun utilisateur présent</div>
        )}
      </div>

      <div className="status-section">
        <h4>Utilisateurs en pause ({pauseUsers.length})</h4>
        {pauseUsers.length > 0 ? (
          <div className="users-list">
            {pauseUsers.map(user => (
              <div key={user.id} className={`user-item ${getStatusClass(user.statut)}`}>
                <span className="user-name">{user.prenom} {user.nom}</span>
                {user.lieu && <span className="user-location">{user.lieu}</span>}
                {user.service && <span className="user-service">{user.service}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-users-message">Aucun utilisateur en pause</div>
        )}
      </div>

      <div className="status-section">
        <h4>Utilisateurs absents ({absentUsers.length})</h4>
        {absentUsers.length > 0 ? (
          <div className="users-list">
            {absentUsers.map(user => (
              <div key={user.id} className={`user-item ${getStatusClass(user.statut)}`}>
                <span className="user-name">{user.prenom} {user.nom}</span>
                {user.lieu && <span className="user-location">{user.lieu}</span>}
                {user.service && <span className="user-service">{user.service}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-users-message">Aucun utilisateur absent</div>
        )}
      </div>
    </div>
  );
};

export default RealTimeStatus;
