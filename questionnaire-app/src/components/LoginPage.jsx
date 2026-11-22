import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../auth/AuthContext';

const LoginPage = () => {
  const { t } = useI18n();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check for redirect after login
  const from = location.state?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors = {};
    
    if (isLogin) {
      if (!formData.username.trim()) {
        newErrors.username = t('auth.usernameRequired', 'Username or email is required');
      }
      if (!formData.password) {
        newErrors.password = t('auth.passwordRequired', 'Password is required');
      }
    } else {
      if (!formData.username.trim()) {
        newErrors.username = t('auth.usernameRequired', 'Username is required');
      }
      if (!formData.email.trim()) {
        newErrors.email = t('auth.emailRequired', 'Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = t('auth.emailInvalid', 'Invalid email format');
      }
      if (!formData.password) {
        newErrors.password = t('auth.passwordRequired', 'Password is required');
      } else if (formData.password.length < 6) {
        newErrors.password = t('auth.passwordMinLength', 'Password must be at least 6 characters');
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('auth.passwordsNotMatch', 'Passwords do not match');
      }
      if (!formData.full_name.trim()) {
        newErrors.full_name = t('auth.nameRequired', 'Full name is required');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(formData.username, formData.password);
      } else {
        await register(formData.username, formData.email, formData.password, formData.full_name);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setErrorMessage('');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">📊</div>
            <h1>{t('auth.digitalDiagnostic', 'Digital Diagnostic')}</h1>
            <p className="auth-subtitle">{t('auth.subtitle', 'Company Assessment Platform')}</p>
          </div>

          <div className="auth-tabs" role="tablist">
            <button 
              role="tab"
              aria-selected={isLogin}
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={toggleMode}
            >
              {t('auth.login', 'Login')}
            </button>
            <button 
              role="tab"
              aria-selected={!isLogin}
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={toggleMode}
            >
              {t('auth.register', 'Register')}
            </button>
          </div>

          {errorMessage && (
            <div className="auth-error" role="alert">{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username">{t('auth.username', 'Username')}</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={errors.username ? 'error' : ''}
                  placeholder={t('auth.usernamePlaceholder', 'Enter username')}
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
                {errors.username && <span id="username-error" className="error-message" role="alert">{errors.username}</span>}
              </div>
            )}

            {isLogin && (
              <div className="form-group">
                <label htmlFor="login-identifier">{t('auth.usernameOrEmail', 'Username or Email')}</label>
                <input
                  type="text"
                  id="login-identifier"
                  name="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={errors.username ? 'error' : ''}
                  placeholder={t('auth.usernameOrEmailPlaceholder', 'Enter username or email')}
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'login-identifier-error' : undefined}
                />
                {errors.username && <span id="login-identifier-error" className="error-message" role="alert">{errors.username}</span>}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="email">{t('auth.email', 'Email')}</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={errors.email ? 'error' : ''}
                  placeholder={t('auth.emailPlaceholder', 'Enter email')}
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && <span id="email-error" className="error-message" role="alert">{errors.email}</span>}
              </div>
            )}

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="full_name">{t('auth.fullName', 'Full Name')}</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className={errors.full_name ? 'error' : ''}
                  placeholder={t('auth.fullNamePlaceholder', 'Enter full name')}
                  autoComplete="name"
                  aria-invalid={!!errors.full_name}
                  aria-describedby={errors.full_name ? 'fullname-error' : undefined}
                />
                {errors.full_name && <span id="fullname-error" className="error-message" role="alert">{errors.full_name}</span>}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">{t('auth.password', 'Password')}</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={errors.password ? 'error' : ''}
                  placeholder={t('auth.passwordPlaceholder', 'Enter password')}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span id="password-error" className="error-message" role="alert">{errors.password}</span>}
            </div>

            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">{t('auth.confirmPassword', 'Confirm Password')}</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder={t('auth.confirmPasswordPlaceholder', 'Confirm password')}
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? 'confirmpassword-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.confirmPassword && <span id="confirmpassword-error" className="error-message" role="alert">{errors.confirmPassword}</span>}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-auth-primary"
              disabled={isLoading}
            >
              {isLoading ? t('auth.loading', 'Please wait...') : (isLogin ? t('auth.login', 'Login') : t('auth.register', 'Register'))}
            </button>
          </form>

          <div className="auth-footer">
            <p>{isLogin ? t('auth.noAccount', "Don't have an account?") : t('auth.hasAccount', 'Already have an account?')}</p>
            <button 
              type="button"
              className="btn-auth-link"
              onClick={toggleMode}
            >
              {isLogin ? t('auth.signUp', 'Sign up') : t('auth.signIn', 'Sign in')}
            </button>
          </div>

          <div className="auth-demo">
            <hr />
            <p className="demo-text">{t('auth.demoCredentials', 'Demo Credentials:')}</p>
            <div className="demo-credentials">
              <div className="demo-user">
                <strong>{t('auth.admin', 'Admin')}:</strong> admin / admin123
              </div>
              <div className="demo-user">
                <strong>{t('auth.user', 'User')}:</strong> Register a new account
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;