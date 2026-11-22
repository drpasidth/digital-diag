import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

// Text Input Component
export const Input = ({ value, onChange, error, label, required, type = 'text', placeholder, min, max, step, explanation, ...props }) => {
  const { t } = useI18n();
  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label>{label} {required && <span className="required">*</span>}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'error' : ''}
        placeholder={placeholder || t('common.enterText')}
        min={min}
        max={max}
        step={step}
        {...props}
      />
      {explanation && <span className="explanation">{explanation}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

// Textarea Component
export const Textarea = ({ value, onChange, error, label, required, placeholder, rows = 4, explanation, ...props }) => {
  const { t } = useI18n();
  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label>{label} {required && <span className="required">*</span>}</label>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'error' : ''}
        placeholder={placeholder || t('common.enterText')}
        rows={rows}
        {...props}
      />
      {explanation && <span className="explanation">{explanation}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

// Select Component
export const Select = ({ value, onChange, error, label, required, options, placeholder, explanation, ...props }) => {
  const { t } = useI18n();
  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label>{label} {required && <span className="required">*</span>}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'error' : ''}
        {...props}
      >
        <option value="">{placeholder || t('common.select')}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {explanation && <span className="explanation">{explanation}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

// MultiSelect Component
export const MultiSelect = ({ value, onChange, error, label, required, options, placeholder, explanation, ...props }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);

  const toggleOption = (option) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter(v => v !== option)
      : [...selectedValues, option];
    onChange(newValues);
  };

  return (
    <div className={`form-group multi-select-wrapper ${error ? 'has-error' : ''}`} ref={dropdownRef}>
      <label>{label} {required && <span className="required">*</span>}</label>
      
      <div 
        className={`multi-select-trigger ${isOpen ? 'open' : ''} ${error ? 'error' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(!isOpen); }}}
      >
        <span className="selected-values">
          {selectedValues.length === 0 
            ? (placeholder || t('common.selectOptions')) 
            : selectedValues.map((v, i) => (
                <span key={i} className="selected-tag">
                  {v}
                  <button type="button" onClick={(e) => { e.stopPropagation(); toggleOption(v); }}>&times;</button>
                </span>
              ))
          }
        </span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown">
          <input
            type="text"
            className="multi-select-search"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => { e.stopPropagation(); setSearchTerm(e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="options-list">
            {filteredOptions.map((opt) => (
              <label key={opt} className={`option-item ${selectedValues.includes(opt) ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span>{opt}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <div className="no-options">{t('common.noResults', 'No options match')}: "{searchTerm}"</div>
            )}
          </div>
        </div>
      )}
      {explanation && <span className="explanation">{explanation}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

// Rating Component (1-10 or 1-5 stars)
export const Rating = ({ value, onChange, error, label, required, min = 1, max = 10, showNumbers = true, explanation, ...props }) => {
  const { t } = useI18n();
  const handleClick = (rating) => {
    onChange(rating === value ? null : rating);
  };

  return (
    <div className={`form-group rating-wrapper ${error ? 'has-error' : ''}`}>
      <label>{label} {required && <span className="required">*</span>}</label>
      <div className="rating-stars" role="radiogroup" aria-label={label}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((num) => (
          <button
            key={num}
            type="button"
            className={`rating-star ${num <= (value || 0) ? 'filled' : ''}`}
            onClick={() => handleClick(num)}
            aria-label={`${num} out of ${max}`}
            aria-checked={num === value}
            role="radio"
          >
            {showNumbers ? num : '★'}
          </button>
        ))}
      </div>
      {value !== null && value !== undefined && (
        <span className="rating-value">{t('common.selected', 'Selected')}: {value}/{max}</span>
      )}
      {explanation && <span className="explanation">{explanation}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

// Section Header Component
export const SectionHeader = ({ section, index, isActive, onClick }) => {
  return (
    <button
      className={`section-header ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-expanded={isActive}
    >
      <span className="section-number">{index + 1}</span>
      <span className="section-icon">{section.icon}</span>
      <span className="section-title">{section.title}</span>
      <span className="section-chevron">{isActive ? '▲' : '▼'}</span>
    </button>
  );
};

// Progress Bar Component
export const ProgressBar = ({ completed, total, currentSection }) => {
  const { t } = useI18n();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="progress-bar-container">
      <div className="progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
      </div>
      <span className="progress-text">{t('questionnaire.progress')}: {completed} {t('questionnaire.of')} {total} {t('questionnaire.section', 'sections')} {t('questionnaire.completed', 'completed')}</span>
    </div>
  );
};