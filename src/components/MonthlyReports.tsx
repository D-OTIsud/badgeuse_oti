import React, { useState, useEffect } from 'react';
import { fetchMonthlyTeamStats, fetchMonthlyTeamStatsRange, exportToCSV, getAvailableServices, type MonthlyTeamStats } from '../services/monthlyReportsService';
import { checkIsManager, getUserService, checkCanAccessAllServices } from '../services/authService';

interface MonthlyReportsProps {
  onBack: () => void;
}

const MonthlyReports: React.FC<MonthlyReportsProps> = ({ onBack }) => {
  const [stats, setStats] = useState<MonthlyTeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0); // Last day of current month
    return date.toISOString().split('T')[0];
  });
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [userService, setUserService] = useState<string | null>(null);
  const [canAccessAllServices, setCanAccessAllServices] = useState(false);

  // Initialize user permissions and service
  useEffect(() => {
    const initPermissions = async () => {
      const [manager, service, canAccessAll] = await Promise.all([
        checkIsManager(),
        getUserService(),
        checkCanAccessAllServices(),
      ]);
      setIsManager(manager);
      setUserService(service);
      setCanAccessAllServices(canAccessAll);

      // If manager, restrict to their service
      if (manager && service) {
        setSelectedService(service);
      }

      // Load available services for admins
      if (canAccessAll) {
        const services = await getAvailableServices();
        setAvailableServices(services);
      }
    };
    initPermissions();
  }, []);

  // Fetch monthly stats
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: MonthlyTeamStats[];
        if (useDateRange) {
          // Use date range
          data = await fetchMonthlyTeamStatsRange(
            new Date(startDate),
            new Date(endDate),
            selectedService
          );
        } else {
          // Use single month
          data = await fetchMonthlyTeamStats(selectedYear, selectedMonth, selectedService);
        }
        setStats(data);
      } catch (err: any) {
        console.error('Error loading monthly stats:', err);
        setError(err.message || 'Erreur lors du chargement des statistiques mensuelles.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [selectedYear, selectedMonth, selectedService, useDateRange, startDate, endDate]);

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const handleExport = () => {
    const start = useDateRange ? new Date(startDate) : new Date(selectedYear, selectedMonth - 1, 1);
    const end = useDateRange ? new Date(endDate) : new Date(selectedYear, selectedMonth, 0);
    exportToCSV(stats, start, end, selectedService || undefined);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, maxWidth: 1400, margin: '40px auto', padding: 36, boxShadow: '0 6px 32px rgba(25,118,210,0.10)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ margin: 0, color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>Rapports Mensuels</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!loading && !error && stats.length > 0 && (
            <button
              onClick={handleExport}
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
                gap: 8,
              }}
            >
              📥 Exporter en CSV
            </button>
          )}
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 18, color: '#888', cursor: 'pointer' }}>Retour</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {/* Toggle between single month and date range */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={!useDateRange}
              onChange={() => setUseDateRange(false)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Un mois</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              checked={useDateRange}
              onChange={() => setUseDateRange(true)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Plage de dates (plusieurs mois)</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {!useDateRange ? (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Mois:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Année:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {generateYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Date de début:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Date de fin:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              />
            </div>
          </>
        )}

        {canAccessAllServices && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>Service:</label>
            <select
              value={selectedService || ''}
              onChange={(e) => setSelectedService(e.target.value || null)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 14,
                cursor: 'pointer',
                minWidth: 200,
              }}
            >
              <option value="">Tous les services</option>
              {availableServices.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
          </div>
        )}

        {isManager && userService && (
          <div style={{ padding: '8px 12px', background: '#f3e5f5', borderRadius: 8, fontSize: 14, color: '#9c27b0', fontWeight: 600 }}>
            Service: {userService}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          Chargement des statistiques...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: 20, background: '#ffebee', borderRadius: 8, color: '#c62828', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Stats display */}
      {!loading && !error && stats.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          Aucune donnée disponible pour cette période.
        </div>
      )}

      {!loading && !error && stats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {stats.map((serviceStats) => (
            <div
              key={serviceStats.service}
              style={{
                border: '2px solid #e0e0e0',
                borderRadius: 12,
                padding: 24,
                background: '#fafafa',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {/* Service header */}
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #1976d2' }}>
                <h3 style={{ margin: 0, color: '#1976d2', fontSize: 24, fontWeight: 700 }}>
                  {serviceStats.service}
                </h3>
              </div>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8, border: '1px solid #1976d2' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total heures</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1976d2' }}>
                    {formatDuration(serviceStats.total_hours)}
                  </div>
                </div>
                <div style={{ background: '#f3e5f5', padding: 16, borderRadius: 8, border: '1px solid #9c27b0' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Moyenne par utilisateur</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#9c27b0' }}>
                    {formatDuration(serviceStats.avg_hours_per_user)}
                  </div>
                </div>
                <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, border: '1px solid #ff9800' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Total retards</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>
                    {formatMinutes(serviceStats.total_delays_minutes)}
                  </div>
                </div>
                <div style={{ background: '#ffebee', padding: 16, borderRadius: 8, border: '1px solid #f44336' }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Absences</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>
                    {serviceStats.absences_count}
                  </div>
                </div>
              </div>

              {/* User table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 14 }}>Utilisateur</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#666', fontSize: 14 }}>Total heures</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#666', fontSize: 14 }}>Moyenne/jour</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#666', fontSize: 14 }}>Retards</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#666', fontSize: 14 }}>Jours travaillés</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#666', fontSize: 14 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceStats.users.map((user) => (
                      <tr
                        key={user.utilisateur_id}
                        style={{
                          borderBottom: '1px solid #eee',
                          background: user.is_absent ? '#ffebee' : '#fff',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                          <strong>{user.prenom} {user.nom}</strong>
                          <div style={{ fontSize: 12, color: '#999' }}>{user.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>
                          {formatDuration(user.total_hours)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14 }}>
                          {formatDuration(user.avg_hours_per_day)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14, color: user.total_delays_minutes > 0 ? '#ff9800' : '#666' }}>
                          {formatMinutes(user.total_delays_minutes)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 14 }}>
                          {user.jours_travailles}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {user.is_absent ? (
                            <span style={{ background: '#f44336', color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                              Absent
                            </span>
                          ) : (
                            <span style={{ background: '#4caf50', color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                              Présent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyReports;

