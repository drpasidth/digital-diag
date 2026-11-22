import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../auth/AuthContext';
import { Input, Textarea, Select, MultiSelect, Rating, ProgressBar, SectionHeader } from './FormInputs';

// Helper to get translated question text and explanation
function getTranslatedQuestion(t, question) {
  // Try to get translation using the question key
  // Expected format: questions.{sectionId}.{questionKey}.text and questions.{sectionId}.{questionKey}.explanation
  if (question.key && question.sectionId) {
    const textKey = `questions.${question.sectionId}.${question.key}.text`;
    const explanationKey = `questions.${question.sectionId}.${question.key}.explanation`;
    
    const translatedText = t(textKey);
    const translatedExplanation = t(explanationKey);
    
    // If translation exists (not equal to key), use it
    if (translatedText !== textKey) {
      return {
        text: translatedText,
        explanation: translatedExplanation !== explanationKey ? translatedExplanation : question.explanation
      };
    }
  }
  
  // Fallback to original question text/explanation
  return {
    text: question.text,
    explanation: question.explanation
  };
}

// Helper to get translated options for select/multiselect questions
function getTranslatedOptions(t, question) {
  if (!question.options || !question.key || !question.sectionId) {
    return question.options || [];
  }
  
  const optionsKey = `questions.${question.sectionId}.${question.key}.options`;
  const translatedOptions = t(optionsKey);
  
  // If translation exists (not equal to key), use it
  if (translatedOptions !== optionsKey && Array.isArray(translatedOptions)) {
    return translatedOptions;
  }
  
  // Fallback to original options
  return question.options;
}

const QuestionnaireForm = ({ companyId, company, sections, currentSection, onSectionChange }) => {
  const { t } = useI18n();
  const { authHeaders } = useAuth();
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved', 'error', null
  const [sectionCompletion, setSectionCompletion] = useState({});
  const [error, setError] = useState(null);
  const sidebarRef = useRef(null);
  const [prefilledCompanyProfile, setPrefilledCompanyProfile] = useState(false);

  // Map company data to company_profile question keys
  const getCompanyProfileDefaults = (companyData) => {
    if (!companyData) return {};
    return {
      company_name: companyData.name || '',
      industry: companyData.industry || '',
      company_size: companyData.size || companyData.company_size || '',
      founded_year: companyData.founded_year || '',
      location: companyData.location || '',
      website: companyData.website || '',
      annual_revenue: companyData.annual_revenue || '',
      ownership_type: companyData.ownership_type || '',
      contact_person: companyData.contact_person || '',
      contact_email: companyData.contact_email || '',
      contact_phone: companyData.contact_phone || '',
    };
  };

  // Load existing responses
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/responses/${companyId}`, {
          headers: authHeaders()
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        const responseMap = {};
        data.forEach(r => {
          responseMap[r.question_key] = r.answer;
        });
        
        // If company_profile section has no responses, pre-fill from company data
        const companyProfileSection = sections.find(s => s.id === 'company_profile');
        if (companyProfileSection && company) {
          const hasCompanyProfileResponses = companyProfileSection.questions.some(q => 
            responseMap[q.key] !== null && responseMap[q.key] !== undefined && responseMap[q.key] !== '' &&
            (Array.isArray(responseMap[q.key]) ? responseMap[q.key].length > 0 : true)
          );
          
          if (!hasCompanyProfileResponses) {
            const defaults = getCompanyProfileDefaults(company);
            Object.entries(defaults).forEach(([key, value]) => {
              if (value && value !== '') {
                responseMap[key] = value;
              }
            });
            setPrefilledCompanyProfile(true);
          }
        }
        
        setResponses(responseMap);
        calculateCompletion(responseMap);
        setError(null);
      } catch (err) {
        console.error('Failed to load responses:', err);
        setError(`${t('questionnaire.loadError', 'Failed to load questionnaire')}: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchResponses();
  }, [companyId, company, sections, t, authHeaders]);

  const calculateCompletion = (responseMap) => {
    const completion = {};
    sections.forEach(section => {
      const sectionQuestions = section.questions;
      const answered = sectionQuestions.filter(q => {
        const val = responseMap[q.key];
        return val !== null && val !== undefined && val !== '' && 
               (Array.isArray(val) ? val.length > 0 : true);
      }).length;
      completion[section.id] = { answered, total: sectionQuestions.length };
    });
    setSectionCompletion(completion);
  };

  // Handle answer change
  const handleAnswerChange = useCallback((questionKey, value) => {
    setResponses(prev => {
      const newResponses = { ...prev, [questionKey]: value };
      calculateCompletion(newResponses);
      return newResponses;
    });
    setSaveStatus(null);
  }, []);

  // Save current section
  const saveSection = async (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setSaving(true);
    setSaveStatus(null);

    const sectionResponses = section.questions.map(q => ({
      section: section.id,
      question_key: q.key,
      question_text: q.text,
      answer: responses[q.key],
      answer_type: q.type,
    })).filter(r => r.answer !== null && r.answer !== undefined && r.answer !== '' && 
      (Array.isArray(r.answer) ? r.answer.length > 0 : true));

    if (sectionResponses.length === 0) {
      setSaveStatus('saved');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/responses/bulk', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ company_id: companyId, responses: sectionResponses }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(result.error || `Save failed (HTTP ${res.status})`);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error(`Save error for section ${sectionId}:`, err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Auto-save on section change
  useEffect(() => {
    if (currentSection >= 0) {
      const section = sections[currentSection];
      if (section) {
        saveSection(section.id);
      }
    }
  }, [currentSection]);

  // Auto-scroll sidebar to keep current section visible
  useEffect(() => {
    if (sidebarRef.current) {
      const currentItem = sidebarRef.current.querySelector('.nav-item.current');
      if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSection]);

  // Render question based on type
  const renderQuestion = (question, section) => {
    const value = responses[question.key];
    const error = null; // Could add validation here
    
    // Get translated question text
    const questionWithSection = { ...question, sectionId: section.id };
    const { text: translatedText, explanation: translatedExplanation } = getTranslatedQuestion(t, questionWithSection);
    
    // Get translated options for select/multiselect
    const translatedOptions = getTranslatedOptions(t, questionWithSection);
    
    const commonProps = {
      value,
      onChange: (val) => handleAnswerChange(question.key, val),
      error,
      label: translatedText,
      required: question.required,
      placeholder: question.placeholder,
      explanation: translatedExplanation,
    };

    switch (question.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return <Input {...commonProps} type={question.type} min={question.min} max={question.max} step={question.step} />;
      case 'number':
        return <Input {...commonProps} type="number" min={question.min} max={question.max} step={question.step} />;
      case 'textarea':
        return <Textarea {...commonProps} rows={question.rows || 4} />;
      case 'select':
        return <Select {...commonProps} options={translatedOptions} />;
      case 'multiselect':
        return <MultiSelect {...commonProps} options={translatedOptions} />;
      case 'rating':
        return <Rating {...commonProps} min={question.min || 1} max={question.max || 10} showNumbers={question.showNumbers !== false} />;
      default:
        return <Input {...commonProps} />;
    }
  };

  if (loading) {
    return <div className="loading-full">{t('common.loading')}</div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <h2>⚠️ {t('questionnaire.error', 'Error')}</h2>
        <p>{error}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          {t('common.reload', 'Reload Page')}
        </button>
      </div>
    );
  }

  const currentSectionData = sections[currentSection];
  
  // Defensive: handle missing section data
  if (!currentSectionData) {
    console.error('QuestionnaireForm: No section data for index', currentSection, 'sections:', sections);
    return (
      <div className="error-state">
        <h2>⚠️ {t('questionnaire.error', 'Error')}</h2>
        <p>{t('questionnaire.loadError', 'Invalid section index')}: {currentSection}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          {t('common.reload', 'Reload Page')}
        </button>
      </div>
    );
  }
  
  const completedSections = Object.values(sectionCompletion).filter(c => c.answered === c.total && c.total > 0).length;
  const totalSectionsWithQuestions = sections.filter(s => s.questions && s.questions.length > 0).length;

  return (
    <div className="questionnaire-form">
      <div className="questionnaire-header">
        <ProgressBar 
          completed={completedSections} 
          total={totalSectionsWithQuestions} 
          currentSection={currentSection}
        />
        {saveStatus && (
          <div className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved'
              ? t('questionnaire.saved')
              : saveStatus === 'error'
                ? t('questionnaire.saveError', 'Could not save. Please try again.')
                : t('questionnaire.saving')}
          </div>
        )}
      </div>

      {/* Left column: Section Navigation */}
      <aside ref={sidebarRef} className="section-nav-sidebar" aria-label={t('nav.sectionTabs')}>
        <div className="sidebar-header">
          <h3>{t('questionnaire.progress')}</h3>
          <div className="sidebar-overall-progress">
            <div className="mini-progress-bar">
              <div className="mini-progress-fill" style={{ width: `${totalSectionsWithQuestions > 0 ? Math.round((completedSections / totalSectionsWithQuestions) * 100) : 0}%` }}></div>
            </div>
            <span className="mini-progress-text">{completedSections}/{totalSectionsWithQuestions} {t('questionnaire.section', 'sections')} {t('questionnaire.completed', 'completed')}</span>
          </div>
        </div>
        <ul>
          {sections.map((section, index) => {
            const comp = sectionCompletion[section.id] || { answered: 0, total: section.questions.length };
            const isComplete = comp.answered === comp.total && comp.total > 0;
            const hasProgress = comp.answered > 0;
            return (
              <li key={section.id}>
                <button
                  className={`nav-item ${index === currentSection ? 'current' : ''} ${isComplete ? 'complete' : ''} ${hasProgress && !isComplete ? 'in-progress' : ''}`}
                  onClick={() => onSectionChange(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSectionChange(index);
                    }
                  }}
                  tabIndex={0}
                  title={`${section.title}: ${comp.answered}/${comp.total} ${t('questionnaire.answered', 'answered')}`}
                  aria-current={index === currentSection ? 'step' : undefined}
                  aria-label={`${index + 1}. ${section.title} - ${comp.answered}/${comp.total} ${t('questionnaire.answered', 'answered')}`}
                >
                  <span className="nav-icon">{section.icon}</span>
                  <span className="nav-title">{section.title}</span>
                  <span className="nav-progress">{comp.answered}/{comp.total}</span>
                  {isComplete && <span className="complete-badge" aria-label={t('common.completed', 'Completed')}>✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Right column: Current Section Questions (wider) */}
      <div className="section-content-area">
        <div className="section-panel active" role="tabpanel" id={`panel-${currentSectionData.id}`} aria-labelledby={`tab-${currentSectionData.id}`}>
          <div className="section-header active">
            <span className="section-number">{currentSection + 1}</span>
            <span className="section-icon">{currentSectionData.icon}</span>
            <span className="section-title">{currentSectionData.title}</span>
          </div>
          <div className="section-content">
            {currentSectionData.description && <p className="section-description">{currentSectionData.description}</p>}

            {/* Pre-filled indicator for company_profile section */}
            {currentSectionData.id === 'company_profile' && prefilledCompanyProfile && (
              <div className="prefilled-notice">
                <span className="prefilled-icon">✨</span>
                <span>{t('questionnaire.prefilledFromCompany', 'Company profile pre-filled from company data. Review and update as needed.')}</span>
              </div>
            )}

            {currentSectionData.questions.map((question, qIndex) => {
              // Group by category for SWOT
              const showCategoryHeader = question.category && 
                (qIndex === 0 || currentSectionData.questions[qIndex - 1].category !== question.category);
              
              return (
                <div key={question.key} className="question-wrapper">
                  {showCategoryHeader && question.category && (
                    <h4 className="category-header">{question.category}</h4>
                  )}
                  {renderQuestion(question, currentSectionData)}
                </div>
              );
            })}

            <div className="section-actions">
              <button 
                className="btn-secondary"
                onClick={() => saveSection(currentSectionData.id)}
                disabled={saving}
              >
                {saving ? t('questionnaire.saving') : t('questionnaire.save')}
              </button>
              {currentSection < sections.length - 1 && (
                <button 
                  className="btn-primary"
                  onClick={() => onSectionChange(currentSection + 1)}
                >
                  {t('questionnaire.next')}
                </button>
              )}
              {currentSection === sections.length - 1 && (
                <button className="btn-success" onClick={() => alert(t('questionnaire.complete'))}>
                  {t('questionnaire.complete')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireForm;