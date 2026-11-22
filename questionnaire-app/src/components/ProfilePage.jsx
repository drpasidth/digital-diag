import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';

const ProfilePage = () => {
  const { t } = useI18n();
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const validateProfile = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) {
      newErrors.full_name = t('auth.nameRequired', 'Full name is required');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired', 'Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid', 'Invalid email format');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!passwordData.current_password) {
      newErrors.current_password = t('auth.currentPasswordRequired', 'Current password is required');
    }
    if (!passwordData.new_password) {
      newErrors.new_password = t('auth.newPasswordRequired', 'New password is required');
    } else if (passwordData.new_password.length < 6) {
      newErrors.new_password = t('auth.passwordMinLength', 'Password must be at least 6 characters');
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = t('auth.passwordsNotMatch', 'Passwords do not match');
    }
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrors({});
    
    if (!validateProfile()) return;
    
    setIsLoading(true);
    try {
      await updateProfile({
        full_name: formData.full_name,
        email: formData.email
      });
      setSuccessMessage(t('auth.profileUpdated', 'Profile updated successfully'));
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordErrors({});
    
    if (!validatePassword()) return;
    
    setPasswordLoading(true);
    try {
      await updateProfile({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      setPasswordSuccess(t('auth.passwordChanged', 'Password changed successfully'));
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setPasswordErrors({ submit: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSuccessMessage('');
    setErrors({});
    setPasswordSuccess('');
    setPasswordErrors({});
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const roleColors = {
    superuser: { bg: '#fef3c7', text: '#92400e', icon: '⚡' },
    user: { bg: '#dbeafe', text: '#1e40af', icon: '👤' }
  };

  const roleStyle = roleColors[user?.role] || roleColors.user;

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header with Avatar */}
        <div className="profile-header-card">
          <div className="profile-header-top">
            <button type="button" className="btn-back" onClick={handleBack} aria-label={t('common.goBack', 'Go back')}>
              <span className="back-icon">←</span>
              <span className="back-text">{t('common.goBack', 'Back')}</span>
            </button>
            <div className="profile-page-label">
              <span className="profile-page-eyebrow">{t('auth.manageAccount', 'Account')}</span>
              <span className="profile-page-title">{t('auth.profile', 'Profile')}</span>
            </div>
          </div>
          <div className="profile-avatar-section">
            <div className="avatar-wrapper">
              <div className="avatar-circle" style={{ backgroundColor: roleStyle.bg }}>
                <span className="avatar-initials">{getInitials(user?.full_name || user?.username)}</span>
                <span className="avatar-status-mark" aria-hidden="true">✓</span>
              </div>
              <div className="avatar-badge" style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}>
                <span className="role-badge-dot" aria-hidden="true"></span>
                {t(`auth.role.${user?.role}`, user?.role)}
              </div>
            </div>
            <div className="profile-header-info">
              <h1 className="profile-name">{user?.full_name || user?.username || t('auth.guest', 'Guest')}</h1>
              <p className="profile-email">{user?.email}</p>
              <div className="profile-meta">
                <span className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span>{t('auth.memberSince', 'Member since')}: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                </span>
                <span className="meta-item">
                  <span className="meta-icon">🔑</span>
                  <span>{t('auth.lastLogin', 'Last login')}: {user?.last_login ? new Date(user.last_login).toLocaleString() : t('auth.never', 'Never')}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs" role="tablist">
          <button 
            role="tab"
            id="profile-tab"
            aria-controls="profile-panel"
            aria-selected={activeTab === 'profile'}
            className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            <span className="tab-icon" aria-hidden="true">●</span>
            <span className="tab-label">{t('auth.profile', 'Profile')}</span>
          </button>
          <button 
            role="tab"
            id="password-tab"
            aria-controls="password-panel"
            aria-selected={activeTab === 'password'}
            className={`profile-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => handleTabChange('password')}
          >
            <span className="tab-icon" aria-hidden="true">▣</span>
            <span className="tab-label">{t('auth.changePassword', 'Change Password')}</span>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="profile-form-card" id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
            <div className="form-card-header">
              <span className="form-card-eyebrow">{t('auth.manageAccount', 'Account management')}</span>
              <h2>{t('auth.profileSettings', 'Profile Settings')}</h2>
              <p>{t('auth.profileSettingsDesc', 'Update your personal information')}</p>
            </div>

            {successMessage && <div className="alert alert-success">{successMessage}</div>}
            {errors.submit && <div className="alert alert-error">{errors.submit}</div>}

            <div className="form-section">
              <h3 className="section-title">{t('auth.basicInfo', 'Basic Information')}</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">{t('auth.username', 'Username')}</label>
                  <div className="input-with-icon">
                    <span className="input-icon">👤</span>
                    <input
                      type="text"
                      id="username"
                      value={user?.username || ''}
                      disabled
                      className="disabled-input"
                    />
                  </div>
                  <span className="help-text">{t('auth.usernameCannotChange', 'Username cannot be changed')}</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="full_name">{t('auth.fullName', 'Full Name')}</label>
                  <div className="input-with-icon">
                    <span className="input-icon">📝</span>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className={errors.full_name ? 'error' : ''}
                      placeholder={t('auth.fullNamePlaceholder', 'Enter full name')}
                    />
                  </div>
                  {errors.full_name && <span className="error-message">{errors.full_name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">{t('auth.email', 'Email Address')}</label>
                  <div className="input-with-icon">
                    <span className="input-icon">✉️</span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={errors.email ? 'error' : ''}
                      placeholder={t('auth.emailPlaceholder', 'Enter email')}
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">{t('auth.accountInfo', 'Account Information')}</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('auth.role', 'Role')}</span>
                  <span className="info-value role-badge" style={{ backgroundColor: roleStyle.bg, color: roleStyle.text }}>
                    {roleStyle.icon} {t(`auth.role.${user?.role}`, user?.role)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('auth.status', 'Status')}</span>
                  <span className="info-value status-badge">
                    <span className={`status-indicator ${user?.is_active ? 'active' : 'inactive'}`}></span>
                    {user?.is_active ? t('auth.active', 'Active') : t('auth.inactive', 'Inactive')}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('auth.memberSince', 'Member Since')}</span>
                  <span className="info-value">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('auth.lastLogin', 'Last Login')}</span>
                  <span className="info-value">{user?.last_login ? new Date(user.last_login).toLocaleString() : t('auth.never', 'Never')}</span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary btn-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    {t('auth.saving', 'Saving...')}
                  </>
                ) : (
                  t('auth.updateProfile', 'Update Profile')
                )}
              </button>
            </div>
          </form>
        )}

        {/* Change Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="profile-form-card" id="password-panel" role="tabpanel" aria-labelledby="password-tab">
            <div className="form-card-header">
              <span className="form-card-eyebrow">{t('auth.settings', 'Security settings')}</span>
              <h2>{t('auth.changePassword', 'Change Password')}</h2>
              <p>{t('auth.changePasswordDesc', 'Update your password to keep your account secure')}</p>
            </div>

            {passwordSuccess && <div className="alert alert-success">{passwordSuccess}</div>}
            {passwordErrors.submit && <div className="alert alert-error">{passwordErrors.submit}</div>}

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="current_password">{t('auth.currentPassword', 'Current Password')}</label>
                <div className="input-with-icon password-input">
                  <span className="input-icon">🔒</span>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="current_password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    className={passwordErrors.current_password ? 'error' : ''}
                    placeholder={t('auth.currentPasswordPlaceholder', 'Enter current password')}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.current_password && <span className="error-message">{passwordErrors.current_password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="new_password">{t('auth.newPassword', 'New Password')}</label>
                <div className="input-with-icon password-input">
                  <span className="input-icon">🔐</span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="new_password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    className={passwordErrors.new_password ? 'error' : ''}
                    placeholder={t('auth.newPasswordPlaceholder', 'Enter new password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.new_password && <span className="error-message">{passwordErrors.new_password}</span>}
                <span className="help-text">{t('auth.passwordMinLengthHint', 'At least 6 characters')}</span>
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">{t('auth.confirmPassword', 'Confirm New Password')}</label>
                <div className="input-with-icon password-input">
                  <span className="input-icon">✅</span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirm_password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    className={passwordErrors.confirm_password ? 'error' : ''}
                    placeholder={t('auth.confirmPasswordPlaceholder', 'Confirm new password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {passwordErrors.confirm_password && <span className="error-message">{passwordErrors.confirm_password}</span>}
              </div>
            </div>

            <div className="password-strength-hint">
              <h4>{t('auth.passwordTips', 'Password Tips:')}</h4>
              <ul>
                <li>{t('auth.tipLength', 'Use at least 8 characters')}</li>
                <li>{t('auth.tipMixed', 'Mix uppercase, lowercase, numbers & symbols')}</li>
                <li>{t('auth.tipUnique', 'Don\'t reuse passwords from other sites')}</li>
                <li>{t('auth.tipPersonal', 'Avoid personal information')}</li>
              </ul>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-primary btn-lg"
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <>
                    <span className="spinner"></span>
                    {t('auth.changing', 'Changing...')}
                  </>
                ) : (
                  t('auth.changePassword', 'Change Password')
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;