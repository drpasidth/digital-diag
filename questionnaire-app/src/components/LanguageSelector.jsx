import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

/**
 * Language Selector Component
 * Allows user to switch between supported languages
 */
function LanguageSelector({ className = '', variant = 'dropdown' }) {
  const { language, setLanguage, supportedLanguages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = supportedLanguages[language];
  const otherLangs = Object.values(supportedLanguages).filter(l => l.code !== language);

  const handleSelect = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  if (variant === 'simple') {
    return (
      <div className={`language-selector language-selector--simple ${className}`}>
        <select
          value={language}
          onChange={(e) => handleSelect(e.target.value)}
          aria-label={t('nav.selectLanguage', 'Select Language')}
          className="language-select"
        >
          {Object.values(supportedLanguages).map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.nativeName}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className={`language-selector language-selector--dropdown ${className}`}>
      <button
        type="button"
        className="language-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('nav.selectLanguage', 'Select Language')}
      >
        <span className="language-flag">{currentLang.flag}</span>
        <span className="language-name">{currentLang.nativeName}</span>
        <span className="language-arrow" aria-hidden="true">▼</span>
      </button>

      {isOpen && (
        <div className="language-dropdown" role="listbox">
          {Object.values(supportedLanguages).map(lang => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === language}
              className={`language-option ${lang.code === language ? 'selected' : ''}`}
              onClick={() => handleSelect(lang.code)}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-name">{lang.nativeName}</span>
              {lang.code === language && <span className="language-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .language-selector {
          position: relative;
          display: inline-block;
        }
        
        .language-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--surface-color, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
          transition: all 0.2s ease;
        }
        
        .language-trigger:hover {
          border-color: var(--primary-color, #2563eb);
          background: var(--hover-color, #f8fafc);
        }
        
        .language-trigger:focus {
          outline: none;
          box-shadow: 0 0 0 3px var(--focus-ring, rgba(37, 99, 235, 0.2));
        }
        
        .language-flag {
          font-size: 16px;
        }
        
        .language-arrow {
          font-size: 10px;
          color: var(--text-secondary, #666);
          margin-left: 4px;
        }
        
        .language-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 180px;
          background: var(--surface-color, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          overflow: hidden;
          animation: slideDown 0.15s ease;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .language-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary, #333);
          transition: background 0.15s ease;
        }
        
        .language-option:hover {
          background: var(--hover-color, #f8fafc);
        }
        
        .language-option.selected {
          background: var(--primary-light, #eff6ff);
          color: var(--primary-color, #2563eb);
        }
        
        .language-check {
          margin-left: auto;
          color: var(--primary-color, #2563eb);
          font-weight: bold;
        }
        
        /* Simple variant */
        .language-selector--simple .language-select {
          padding: 8px 12px;
          background: var(--surface-color, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary, #333);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 32px;
        }
        
        .language-selector--simple .language-select:focus {
          outline: none;
          border-color: var(--primary-color, #2563eb);
          box-shadow: 0 0 0 3px var(--focus-ring, rgba(37, 99, 235, 0.2));
        }
      `}</style>
    </div>
  );
}

export default LanguageSelector;