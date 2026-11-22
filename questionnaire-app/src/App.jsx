import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { questionnaireSections } from './data/questions';
import QuestionnaireForm from './components/QuestionnaireForm';
import CompanySelector from './components/CompanySelector';
import Dashboard from './components/Dashboard';
import ExportView from './components/ExportView';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import ProfilePage from './components/ProfilePage';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import LanguageSelector from './components/LanguageSelector';
import { AuthProvider, useAuth } from './auth/AuthContext';
import './App.css';

// Protected route component
function ProtectedRoute({ children, requireSuperuser = false }) {
  const { isAuthenticated, isSuperuser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperuser && !isSuperuser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Public route (redirects to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Inner App component that has access to i18n and auth
function AppInner() {
  const { t, isLoading: i18nLoading } = useI18n();
  const { user, logout, isSuperuser, authHeaders } = useAuth();
  const [view, setView] = useState('dashboard');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) loadCompanies();
    else setCompanies([]);
  }, [user]);

  const loadCompanies = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/companies', {
        headers: authHeaders()
      });
      if (!res.ok) throw new Error('Failed to load companies');
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setCurrentSection(0);
    setView('questionnaire');
  };

  const handleNewCompany = () => {
    setSelectedCompany(null);
    setView('company');
  };

  const handleCompanySaved = (company) => {
    setCompanies(prev => [company, ...prev]);
    setSelectedCompany(company);
    setCurrentSection(0);
    setView('questionnaire');
  };

  const handleBackToDashboard = () => {
    setSelectedCompany(null);
    setView('dashboard');
  };

  const handleSectionChange = (index) => {
    setCurrentSection(index);
  };

  const handleExport = () => {
    setView('export');
  };

  const handleLogout = () => {
    logout();
    setCompanies([]);
    setSelectedCompany(null);
    setView('dashboard');
  };

  // Get translated section titles
  const getSectionTitle = (sectionId) => {
    return t(`sections.${sectionId}`, sectionId);
  };

  if (i18nLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppLayout 
                user={user}
                isSuperuser={isSuperuser}
                onLogout={handleLogout}
                view={view}
                setView={setView}
                companies={companies}
                setCompanies={setCompanies}
                selectedCompany={selectedCompany}
                setSelectedCompany={setSelectedCompany}
                currentSection={currentSection}
                setCurrentSection={setCurrentSection}
                loading={loading}
                setLoading={setLoading}
                handleCompanySelect={handleCompanySelect}
                handleNewCompany={handleNewCompany}
                handleCompanySaved={handleCompanySaved}
                handleBackToDashboard={handleBackToDashboard}
                handleSectionChange={handleSectionChange}
                handleExport={handleExport}
                getSectionTitle={getSectionTitle}
                t={t}
                questionnaireSections={questionnaireSections}
              />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireSuperuser>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Layout component for authenticated views
function AppLayout({
  user,
  isSuperuser,
  onLogout,
  view,
  setView,
  companies,
  setCompanies,
  selectedCompany,
  setSelectedCompany,
  currentSection,
  setCurrentSection,
  loading,
  setLoading,
  handleCompanySelect,
  handleNewCompany,
  handleCompanySaved,
  handleBackToDashboard,
  handleSectionChange,
  handleExport,
  getSectionTitle,
  t,
  questionnaireSections
}) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>{t('app.title')}</h1>
          <p className="subtitle">{t('app.subtitle')}</p>
        </div>
        <div className="header-right">
          <LanguageSelector variant="dropdown" />
          {selectedCompany && (
            <div className="company-badge">
              <span>📋 {selectedCompany.name}</span>
              <span className="industry">{selectedCompany.industry}</span>
            </div>
          )}
          <div className="user-menu">
            <span className="user-name">{user?.full_name || user?.username}</span>
            {isSuperuser && (
              <a href="/admin" className="admin-link">{t('auth.adminPanel')}</a>
            )}
            <a href="/profile" className="profile-link">{t('auth.profile')}</a>
            <button onClick={onLogout} className="btn-logout">{t('auth.logout')}</button>
          </div>
        </div>
      </header>

      <nav className="app-nav" role="navigation" aria-label={t('nav.sectionTabs')}>
        {view === 'questionnaire' && (
          <>
            <button 
              onClick={handleBackToDashboard} 
              className="nav-btn back-btn"
              aria-label={t('nav.backToDashboard')}
            >
              {t('nav.backToDashboard')}
            </button>
            <div className="section-tabs" role="tablist">
              {questionnaireSections.map((section, index) => (
                <button
                  key={section.id}
                  role="tab"
                  aria-selected={index === currentSection}
                  aria-controls={`panel-${section.id}`}
                  id={`tab-${section.id}`}
                  className={`section-tab ${index === currentSection ? 'active' : ''}`}
                  onClick={() => handleSectionChange(index)}
                >
                  <span className="tab-icon">{section.icon}</span>
                  <span className="tab-title">{getSectionTitle(section.id)}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={handleExport} 
              className="nav-btn export-btn"
              aria-label={t('nav.exportReport')}
            >
              {t('nav.exportReport')}
            </button>
          </>
        )}
        {view === 'company' && (
          <button onClick={handleBackToDashboard} className="nav-btn back-btn">
            {t('nav.backToCompany')}
          </button>
        )}
        {view === 'export' && (
          <button onClick={() => setView('questionnaire')} className="nav-btn back-btn">
            {t('nav.backToQuestionnaire')}
          </button>
        )}
      </nav>

      <main className="app-main" role="main">
        {loading && <div className="loading">{t('common.loading')}</div>}

        {view === 'dashboard' && (
          <Dashboard 
            companies={companies} 
            onSelectCompany={handleCompanySelect}
            onNewCompany={handleNewCompany}
          />
        )}

        {view === 'company' && (
          <CompanySelector 
            onSave={handleCompanySaved}
            onCancel={handleBackToDashboard}
          />
        )}

        {view === 'questionnaire' && selectedCompany && (
          <QuestionnaireForm
            companyId={selectedCompany.id}
            company={selectedCompany}
            sections={questionnaireSections}
            currentSection={currentSection}
            onSectionChange={handleSectionChange}
          />
        )}

        {view === 'export' && selectedCompany && (
          <ExportView companyId={selectedCompany.id} companyName={selectedCompany.name} />
        )}

        {view === 'questionnaire' && !selectedCompany && (
          <div className="empty-state">
            <h2>{t('questionnaire.validationError')}</h2>
            <p>{t('dashboard.noCompanies')}</p>
            <button onClick={handleBackToDashboard} className="btn-primary">{t('common.goBack')}</button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>{t('app.footer')}</p>
      </footer>
    </div>
  );
}

// Main App component wrapped with providers
export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </I18nProvider>
  );
}