import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

const AdminPanel = () => {
  const { t } = useI18n();
  const { authHeaders } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE = 'http://localhost:3001/api';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers: authHeaders() }),
        fetch(`${API_BASE}/admin/stats`, { headers: authHeaders() })
      ]);
      
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to load users');
      if (!statsRes.ok) throw new Error(statsData.error || 'Failed to load stats');
      
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewUser = async (user) => {
    try {
      const res = await fetch(`${API_BASE}/admin/users/${user.id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load user details');
      setSelectedUser(data);
      setShowUserDetail(true);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setEditForm({
      full_name: user.user.full_name || '',
      email: user.user.email || '',
      role: user.user.role,
      is_active: user.user.is_active
    });
    setEditErrors({});
  };

  const handleEditSave = async () => {
    setEditErrors({});
    
    // Validate
    const errors = {};
    if (!editForm.email.trim()) {
      errors.email = t('auth.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = t('auth.emailInvalid', 'Invalid email format');
    }
    
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${editUser.user.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(editForm)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      
      setEditUser(null);
      setEditForm({});
      fetchData();
      if (showUserDetail) setShowUserDetail(false);
    } catch (err) {
      setEditErrors({ submit: err.message });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('auth.confirmDeleteUser', 'Are you sure you want to delete this user? This will also delete all their companies and reports.'))) {
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      
      fetchData();
      setDeleteConfirm(null);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getRoleLabel = (role) => {
    return t(`auth.role.${role}`, role);
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="admin-loading">
          <div className="loading-spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>{t('auth.adminPanel', 'Admin Panel')}</h1>
        <p className="admin-subtitle">{t('auth.adminSubtitle', 'Manage users and monitor system')}</p>
      </div>

      {errorMessage && (
        <div className="admin-error">{errorMessage}</div>
      )}

      {/* Stats Overview */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.total_users || 0}</div>
          <div className="stat-label">{t('auth.totalUsers', 'Total Users')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.active_users || 0}</div>
          <div className="stat-label">{t('auth.activeUsers', 'Active Users')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.superusers || 0}</div>
          <div className="stat-label">{t('auth.superusers', 'Superusers')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_companies || 0}</div>
          <div className="stat-label">{t('auth.totalCompanies', 'Total Companies')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_responses || 0}</div>
          <div className="stat-label">{t('auth.totalResponses', 'Total Responses')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_reports || 0}</div>
          <div className="stat-label">{t('auth.totalReports', 'Total Reports')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.recent_logins || 0}</div>
          <div className="stat-label">{t('auth.recentLogins', 'Logins (7 days)')}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-section">
        <h2>{t('auth.userManagement', 'User Management')}</h2>
        
        {users.length === 0 ? (
          <div className="empty-state">
            <p>{t('auth.noUsers', 'No users found')}</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('auth.username', 'Username')}</th>
                  <th>{t('auth.email', 'Email')}</th>
                  <th>{t('auth.fullName', 'Full Name')}</th>
                  <th>{t('auth.role', 'Role')}</th>
                  <th>{t('auth.status', 'Status')}</th>
                  <th>{t('auth.companies', 'Companies')}</th>
                  <th>{t('auth.reports', 'Reports')}</th>
                  <th>{t('auth.lastLogin', 'Last Login')}</th>
                  <th>{t('auth.created', 'Created')}</th>
                  <th>{t('auth.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.full_name || '-'}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? t('auth.active', 'Active') : t('auth.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td>{user.company_count || 0}</td>
                    <td>{user.report_count || 0}</td>
                    <td>{formatDate(user.last_login)}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-icon view"
                        onClick={() => handleViewUser(user)}
                        title={t('auth.view', 'View')}
                      >
                        👁
                      </button>
                      <button 
                        className="btn-icon edit"
                        onClick={() => handleEditUser({ user })}
                        title={t('auth.edit', 'Edit')}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon delete"
                        onClick={() => handleDeleteUser(user.id)}
                        title={t('auth.delete', 'Delete')}
                        disabled={user.id === users.find(u => u.role === 'superuser')?.id}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('auth.userDetails', 'User Details')}: {selectedUser.user.username}</h2>
              <button className="modal-close" onClick={() => setShowUserDetail(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h3>{t('auth.accountInfo', 'Account Information')}</h3>
                <div className="detail-grid">
                  <div><label>{t('auth.username', 'Username')}</label><span>{selectedUser.user.username}</span></div>
                  <div><label>{t('auth.email', 'Email')}</label><span>{selectedUser.user.email}</span></div>
                  <div><label>{t('auth.fullName', 'Full Name')}</label><span>{selectedUser.user.full_name || '-'}</span></div>
                  <div><label>{t('auth.role', 'Role')}</label><span><span className={`role-badge role-${selectedUser.user.role}`}>{getRoleLabel(selectedUser.user.role)}</span></span></div>
                  <div><label>{t('auth.status', 'Status')}</label><span><span className={`status-badge ${selectedUser.user.is_active ? 'active' : 'inactive'}`}>{selectedUser.user.is_active ? t('auth.active', 'Active') : t('auth.inactive', 'Inactive')}</span></span></div>
                  <div><label>{t('auth.created', 'Created')}</label><span>{formatDate(selectedUser.user.created_at)}</span></div>
                  <div><label>{t('auth.lastLogin', 'Last Login')}</label><span>{formatDate(selectedUser.user.last_login)}</span></div>
                </div>
              </div>

              {selectedUser.companies && selectedUser.companies.length > 0 && (
                <div className="detail-section">
                  <h3>{t('auth.companies', 'Companies')} ({selectedUser.companies.length})</h3>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t('auth.name', 'Name')}</th>
                          <th>{t('auth.industry', 'Industry')}</th>
                          <th>{t('auth.size', 'Size')}</th>
                          <th>{t('auth.location', 'Location')}</th>
                          <th>{t('auth.created', 'Created')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.companies.map(company => (
                          <tr key={company.id}>
                            <td><strong>{company.name}</strong></td>
                            <td>{company.industry || '-'}</td>
                            <td>{company.size || '-'}</td>
                            <td>{company.location || '-'}</td>
                            <td>{formatDate(company.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedUser.reports && selectedUser.reports.length > 0 && (
                <div className="detail-section">
                  <h3>{t('auth.reports', 'Reports')} ({selectedUser.reports.length})</h3>
                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t('auth.company', 'Company')}</th>
                          <th>{t('auth.format', 'Format')}</th>
                          <th>{t('auth.filename', 'Filename')}</th>
                          <th>{t('auth.size', 'Size')}</th>
                          <th>{t('auth.created', 'Created')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.reports.map(report => (
                          <tr key={report.id}>
                            <td>{report.company_name}</td>
                            <td><span className="format-badge">{report.format.toUpperCase()}</span></td>
                            <td>{report.filename}</td>
                            <td>{report.file_size ? `${(report.file_size / 1024).toFixed(1)} KB` : '-'}</td>
                            <td>{formatDate(report.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowUserDetail(false)}>
                {t('auth.close', 'Close')}
              </button>
              <button className="btn-primary" onClick={() => { handleEditUser(selectedUser); setShowUserDetail(false); }}>
                {t('auth.edit', 'Edit User')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => { setEditUser(null); setEditForm({}); setEditErrors({}); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('auth.editUser', 'Edit User')}: {editUser.user.username}</h2>
              <button className="modal-close" onClick={() => { setEditUser(null); setEditForm({}); setEditErrors({}); }}>×</button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}>
                {editErrors.submit && <div className="error-message">{editErrors.submit}</div>}
                
                <div className="form-group">
                  <label htmlFor="edit_full_name">{t('auth.fullName', 'Full Name')}</label>
                  <input
                    type="text"
                    id="edit_full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit_email">{t('auth.email', 'Email')}</label>
                  <input
                    type="email"
                    id="edit_email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    className={editErrors.email ? 'error' : ''}
                  />
                  {editErrors.email && <span className="error-message">{editErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="edit_role">{t('auth.role', 'Role')}</label>
                  <select
                    id="edit_role"
                    value={editForm.role}
                    onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  >
                    <option value="user">{t('auth.role.user', 'User')}</option>
                    <option value="superuser">{t('auth.role.superuser', 'Superuser')}</option>
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    />
                    <span>{t('auth.active', 'Active')}</span>
                  </label>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => { setEditUser(null); setEditForm({}); setEditErrors({}); }}>
                    {t('auth.cancel', 'Cancel')}
                  </button>
                  <button type="submit" className="btn-primary" disabled={editLoading}>
                    {editLoading ? t('auth.saving', 'Saving...') : t('auth.save', 'Save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;