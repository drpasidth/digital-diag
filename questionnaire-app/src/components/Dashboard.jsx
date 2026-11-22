import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import CompanySelector from './CompanySelector';
import { useAuth } from '../auth/AuthContext';

const Dashboard = ({ companies, onSelectCompany, onNewCompany }) => {
  const { t } = useI18n();
  const { authHeaders } = useAuth();
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deletingCompany, setDeletingCompany] = useState(null);

  const handleEdit = (company) => {
    setEditingCompany(company);
  };

  const handleDelete = async (company) => {
    if (!window.confirm(t('dashboard.confirmDelete', `Delete ${company.name}? This will also delete all questionnaire responses.`))) return;
    
    try {
      const res = await fetch(`http://localhost:3001/api/companies/${company.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Delete request failed');
      // The parent component will reload companies
      window.location.reload();
    } catch (err) {
      console.error('Delete failed:', err);
      alert(t('common.error', 'Failed to delete company'));
    }
  };

  const handleCompanySaved = (company) => {
    setShowNewCompany(false);
    setEditingCompany(null);
    onSelectCompany(company);
  };

  const handleCancel = () => {
    setShowNewCompany(false);
    setEditingCompany(null);
  };

  if (showNewCompany) {
    return <CompanySelector onSave={handleCompanySaved} onCancel={handleCancel} />;
  }

  if (editingCompany) {
    return <CompanySelector onSave={handleCompanySaved} onCancel={handleCancel} initialData={editingCompany} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>{t('dashboard.title')}</h2>
        <button onClick={() => setShowNewCompany(true)} className="btn-primary">
          + {t('dashboard.newAssessment')}
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-icon">📋</div>
          <h3>{t('dashboard.noCompanies')}</h3>
          <p>{t('dashboard.noCompanies')}</p>
          <button onClick={() => setShowNewCompany(true)} className="btn-primary btn-large">
            {t('dashboard.newAssessment')}
          </button>
        </div>
      ) : (
        <div className="companies-grid">
          {companies.map(company => (
            <div key={company.id} className="company-card">
              <div className="company-card-header">
                <h3>{company.name}</h3>
                <span className="industry-badge">{company.industry}</span>
              </div>
              
              <div className="company-card-meta">
                <div className="meta-item">
                  <span className="meta-label">{t('dashboard.size')}</span>
                  <span className="meta-value">{company.size || company.company_size}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('dashboard.location')}</span>
                  <span className="meta-value">{company.location || t('common.notSpecified', 'Not specified')}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('dashboard.revenue')}</span>
                  <span className="meta-value">{company.annual_revenue || t('common.notSpecified', 'Not specified')}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">{t('dashboard.contact')}</span>
                  <span className="meta-value">{company.contact_person || t('common.notSpecified', 'Not specified')}</span>
                </div>
              </div>

              <div className="company-card-actions">
                <button 
                  onClick={() => onSelectCompany(company)} 
                  className="btn-primary btn-block"
                >
                  {t('dashboard.continue')}
                </button>
                <div className="secondary-actions">
                  <button onClick={() => handleEdit(company)} className="btn-secondary btn-sm" title={t('common.edit')}>
                    ✏️ {t('common.edit')}
                  </button>
                  <button onClick={() => handleDelete(company)} className="btn-danger btn-sm" title={t('common.delete')}>
                    🗑️ {t('common.delete')}
                  </button>
                </div>
              </div>

              <div className="company-card-footer">
                <span className="created-date">{t('common.created', 'Created')}: {new Date(company.created_at).toLocaleDateString()}</span>
                {company.updated_at !== company.created_at && (
                  <span className="updated-date">{t('common.updated', 'Updated')}: {new Date(company.updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="dashboard-info">
        <h3>{t('dashboard.sections', 'Questionnaire Sections')}</h3>
        <p>{t('dashboard.sectionsDesc', 'Each assessment covers 9 key business areas:')}</p>
        <ul className="sections-list">
          <li>🏢 <strong>{t('sections.company_profile')}</strong> - {t('dashboard.sectionsDesc.company_profile', 'Basic organizational information')}</li>
          <li>🔍 <strong>{t('sections.swot')}</strong> - {t('dashboard.sectionsDesc.swot', 'Strengths, Weaknesses, Opportunities, Threats')}</li>
          <li>🎯 <strong>{t('sections.strategic_planning')}</strong> - {t('dashboard.sectionsDesc.strategic_planning', 'Vision, goals, execution, OKRs')}</li>
          <li>🏭 <strong>{t('sections.production_management')}</strong> - {t('dashboard.sectionsDesc.production_management', 'Operations, lean, quality, OEE')}</li>
          <li>📈 <strong>{t('sections.sales_marketing')}</strong> - {t('dashboard.sectionsDesc.sales_marketing', 'Revenue generation, customer acquisition')}</li>
          <li>💡 <strong>{t('sections.rd_innovation')}</strong> - {t('dashboard.sectionsDesc.rd_innovation', 'Product development, IP, innovation culture')}</li>
          <li>⚡ <strong>{t('sections.productivity')}</strong> - {t('dashboard.sectionsDesc.productivity', 'Labor efficiency, automation, continuous improvement')}</li>
          <li>♻️ <strong>{t('sections.waste_management')}</strong> - {t('dashboard.sectionsDesc.waste_management', 'Sustainability, circular economy, ESG')}</li>
          <li>🌱 <strong>{t('sections.bcg')}</strong> - {t('dashboard.sectionsDesc.bcg', 'Bioeconomy, circular economy, green economy')}</li>
          <li>📐 <strong>{t('sections.oee')}</strong> - {t('dashboard.sectionsDesc.oee', 'Overall Equipment Effectiveness, TPM')}</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;