import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../auth/AuthContext';

const CompanySelector = ({ onSave, onCancel, initialData = null }) => {
  const { t } = useI18n();
  const { authHeaders } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    company_size: '',
    founded_year: '',
    location: '',
    website: '',
    annual_revenue: '',
    ownership_type: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isEdit, setIsEdit] = useState(false);

  const industries = [
    { value: 'Manufacturing', label: t('companyForm.industries.manufacturing') },
    { value: 'Technology', label: t('companyForm.industries.technology') },
    { value: 'Healthcare', label: t('companyForm.industries.healthcare') },
    { value: 'Financial Services', label: t('companyForm.industries.financialServices') },
    { value: 'Retail', label: t('companyForm.industries.retail') },
    { value: 'Food & Beverage', label: t('companyForm.industries.foodBeverage') },
    { value: 'Automotive', label: t('companyForm.industries.automotive') },
    { value: 'Chemicals', label: t('companyForm.industries.chemicals') },
    { value: 'Textiles', label: t('companyForm.industries.textiles') },
    { value: 'Other', label: t('companyForm.industries.other') },
  ];
  const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
  const revenueRanges = ['<$1M', '$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M-$500M', '$500M-$1B', '>$1B'];
  const ownershipTypes = [
    { value: 'Private', label: t('companyForm.ownershipTypes.private') },
    { value: 'Public', label: t('companyForm.ownershipTypes.public') },
    { value: 'Family-owned', label: t('companyForm.ownershipTypes.familyOwned') },
    { value: 'Subsidiary', label: t('companyForm.ownershipTypes.subsidiary') },
    { value: 'Joint Venture', label: t('companyForm.ownershipTypes.jointVenture') },
    { value: 'State-owned', label: t('companyForm.ownershipTypes.stateOwned') },
    { value: 'Non-profit', label: t('companyForm.ownershipTypes.nonProfit') },
  ];

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        company_size: initialData.size || initialData.company_size,
        founded_year: initialData.founded_year || '',
        annual_revenue: initialData.annual_revenue || '',
        ownership_type: initialData.ownership_type || '',
      }));
      setIsEdit(true);
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('validation.required');
    if (!formData.industry) newErrors.industry = t('validation.required');
    if (!formData.company_size) newErrors.company_size = t('validation.required');
    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = t('validation.email');
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = t('validation.url');
    }
    if (formData.founded_year && (formData.founded_year < 1800 || formData.founded_year > new Date().getFullYear())) {
      newErrors.founded_year = t('validation.custom', { min: 1800, max: new Date().getFullYear() });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const url = isEdit 
        ? `http://localhost:3001/api/companies/${initialData.id}` 
        : 'http://localhost:3001/api/companies';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save company');

      const company = await res.json();
      onSave(company);
    } catch (err) {
      console.error('Save error:', err);
      alert(t('common.error', 'Failed to save company. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="company-selector">
      <h2>{isEdit ? t('common.edit') + ' ' + t('companyForm.title') : t('companyForm.title')}</h2>
      <p className="section-description">{t('companyForm.subtitle')}</p>

      <form onSubmit={handleSubmit} className="company-form" noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">{t('companyForm.fields.companyName')} <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder={t('common.enterText')}
              required
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="industry">{t('companyForm.fields.industry')} <span className="required">*</span></label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className={errors.industry ? 'error' : ''}
              required
            >
              <option value="">{t('common.select')}</option>
              {industries.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {errors.industry && <span className="error-message">{errors.industry}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="company_size">{t('companyForm.fields.companySize')} <span className="required">*</span></label>
            <select
              id="company_size"
              name="company_size"
              value={formData.company_size}
              onChange={handleChange}
              className={errors.company_size ? 'error' : ''}
              required
            >
              <option value="">{t('common.select')}</option>
              {sizes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            {errors.company_size && <span className="error-message">{errors.company_size}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="founded_year">{t('companyForm.fields.foundedYear')}</label>
            <input
              type="number"
              id="founded_year"
              name="founded_year"
              value={formData.founded_year}
              onChange={handleChange}
              className={errors.founded_year ? 'error' : ''}
              min="1800"
              max={new Date().getFullYear()}
              placeholder="e.g., 1995"
            />
            {errors.founded_year && <span className="error-message">{errors.founded_year}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="location">{t('companyForm.fields.location')}</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t('companyForm.fields.location')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">{t('companyForm.fields.website')}</label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className={errors.website ? 'error' : ''}
              placeholder="https://example.com"
            />
            {errors.website && <span className="error-message">{errors.website}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="annual_revenue">{t('companyForm.fields.annualRevenue')}</label>
            <select
              id="annual_revenue"
              name="annual_revenue"
              value={formData.annual_revenue}
              onChange={handleChange}
            >
              <option value="">{t('common.select')}</option>
              {revenueRanges.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ownership_type">{t('companyForm.fields.ownershipType')}</label>
            <select
              id="ownership_type"
              name="ownership_type"
              value={formData.ownership_type}
              onChange={handleChange}
            >
              <option value="">{t('common.select')}</option>
              {ownershipTypes.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="form-section">
          <legend>{t('companyForm.fields.contactPerson')}</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contact_person">{t('companyForm.fields.contactPerson')}</label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                placeholder={t('common.enterText')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact_email">{t('companyForm.fields.contactEmail')}</label>
              <input
                type="email"
                id="contact_email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className={errors.contact_email ? 'error' : ''}
                placeholder="email@company.com"
              />
              {errors.contact_email && <span className="error-message">{errors.contact_email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="contact_phone">{t('companyForm.fields.contactPhone')}</label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? t('companyForm.saving') : (isEdit ? t('common.save') : t('companyForm.save'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanySelector;