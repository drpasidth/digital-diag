import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { questionnaireSections } from '../data/questions';
import { useAuth } from '../auth/AuthContext';

const ExportView = ({ companyId, companyName }) => {
  const { t } = useI18n();
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState('json');
  const [generating, setGenerating] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportStatus, setReportStatus] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [pdfFilename, setPdfFilename] = useState('assessment-report.pdf');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/export/${companyId}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(t('common.accessDenied', 'Access denied. Please log in again.'));
          }
          throw new Error(`Failed to load report data (${res.status})`);
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to load export data:', err);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, authHeaders]);

  const generateReport = async (format) => {
    setGenerating(true);
    try {
      if (format === 'json') {
        downloadJSON();
      } else if (format === 'csv') {
        downloadCSV();
      } else if (format === 'html') {
        downloadHTML();
      }
    } finally {
      setGenerating(false);
    }
  };

  const generateAdvancedReport = async (format) => {
    setReportGenerating(true);
    setReportStatus(null);
    try {
      const response = await fetch(`http://localhost:3001/api/report/generate/${companyId}`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        const msg = error.error || error.message || 'Report generation failed';
        throw new Error(error.details ? `${msg} — ${error.details}` : msg);
      }
      
      const result = await response.json();
      if (result.downloadUrl) {
        // Fetch the protected file once. PDFs are previewed first instead of
        // being downloaded immediately, so the user can review the report.
        const downloadRes = await fetch(`http://localhost:3001${result.downloadUrl}`, {
          headers: { ...authHeaders() },
        });
        if (!downloadRes.ok) {
          throw new Error(`Failed to load report (${downloadRes.status})`);
        }
        const blob = await downloadRes.blob();
        const url = URL.createObjectURL(blob);

        if (format === 'pdf') {
          setPdfPreview(previousUrl => {
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            return url;
          });
          setPdfFilename(result.filename);
          setReportStatus({ type: 'success', message: t('export.reportReady', 'Report ready for preview') });
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setReportStatus({ type: 'success', message: t('export.reportGenerated', 'Report generated successfully') });
        }
      } else if (result.error) {
        throw new Error(result.error + (result.details ? ` — ${result.details}` : ''));
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setReportStatus({ type: 'error', message: `${t('export.generationFailed', 'Report generation failed')}: ${err.message}` });
    } finally {
      setReportGenerating(false);
    }
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_assessment_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!data) return;
    
    const rows = [[t('export.sections'), t('export.question'), t('export.answers'), t('export.answerType', 'Answer Type')]];
    
    Object.entries(data.responses).forEach(([sectionKey, responses]) => {
      const section = questionnaireSections.find(s => s.id === sectionKey);
      const sectionTitle = section ? section.title : sectionKey;
      
      responses.forEach(r => {
        let answerStr = '';
        if (Array.isArray(r.answer)) {
          answerStr = r.answer.join('; ');
        } else if (typeof r.answer === 'object' && r.answer !== null) {
          answerStr = JSON.stringify(r.answer);
        } else {
          answerStr = String(r.answer);
        }
        rows.push([sectionTitle, r.question_text, answerStr, r.answer_type]);
      });
    });

    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_assessment_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHTML = () => {
    if (!data) return;

    const html = generateHTMLReport(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, '_')}_assessment_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (data) => {
    const { company, responses } = data;
    const date = new Date().toLocaleDateString();

    let sectionsHtml = '';
    Object.entries(responses).forEach(([sectionKey, sectionResponses]) => {
      const section = questionnaireSections.find(s => s.id === sectionKey);
      const sectionTitle = section ? section.title : sectionKey;
      const icon = section ? section.icon : '📋';

      let questionsHtml = '';
      sectionResponses.forEach(r => {
        let answerHtml = '';
        if (Array.isArray(r.answer)) {
          answerHtml = r.answer.length > 0 
            ? `<ul>${r.answer.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
            : '<em>No response</em>';
        } else if (typeof r.answer === 'object' && r.answer !== null) {
          answerHtml = `<pre>${escapeHtml(JSON.stringify(r.answer, null, 2))}</pre>`;
        } else {
          answerHtml = r.answer ? escapeHtml(String(r.answer)) : '<em>No response</em>';
        }

        questionsHtml += `
          <div class="question">
            <h4>${escapeHtml(r.question_text)}</h4>
            <div class="answer">${answerHtml}</div>
          </div>
        `;
      });

      sectionsHtml += `
        <section class="report-section">
          <h2>${icon} ${escapeHtml(sectionTitle)}</h2>
          ${questionsHtml}
        </section>
      `;
    });

    return `<!DOCTYPE html>
<html lang="${t('common.lang', 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('export.title')} - ${escapeHtml(company.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #333; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 40px; }
    .company-name { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .company-meta { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 15px; color: #64748b; }
    .meta-item { background: #f1f5f9; padding: 8px 16px; border-radius: 6px; }
    .report-section { margin-bottom: 50px; page-break-inside: avoid; }
    .report-section h2 { color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
    .question { margin-bottom: 25px; page-break-inside: avoid; }
    .question h4 { color: #334155; margin: 0 0 8px; font-weight: 600; }
    .answer { background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; border-radius: 0 8px 8px 0; white-space: pre-wrap; }
    .answer ul { margin: 0; padding-left: 20px; }
    .answer li { margin-bottom: 5px; }
    .answer pre { margin: 0; font-family: inherit; font-size: 0.9rem; white-space: pre-wrap; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="company-name">${escapeHtml(company.name)}</h1>
    <div class="company-meta">
      <div class="meta-item"><strong>${t('dashboard.industry')}:</strong> ${escapeHtml(company.industry || 'N/A')}</div>
      <div class="meta-item"><strong>${t('dashboard.size')}:</strong> ${escapeHtml(company.size || company.company_size || 'N/A')}</div>
      <div class="meta-item"><strong>${t('dashboard.location')}:</strong> ${escapeHtml(company.location || 'N/A')}</div>
      <div class="meta-item"><strong>${t('dashboard.revenue')}:</strong> ${escapeHtml(company.annual_revenue || 'N/A')}</div>
      <div class="meta-item"><strong>${t('export.assessmentDate')}:</strong> ${date}</div>
    </div>
  </div>
  ${sectionsHtml}
  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.9rem; text-align: center;">
    ${t('app.footer')}
  </footer>
</body>
</html>`;
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  if (loading) {
    return <div className="loading-full">{t('common.loading')}</div>;
  }

  if (!data) {
    return <div className="error-state">{t('common.error', 'Failed to load report data')}</div>;
  }

  const { company, responses } = data;
  const totalQuestions = Object.values(responses).reduce((sum, arr) => sum + arr.length, 0);
  const answeredQuestions = Object.values(responses).reduce((sum, arr) => 
    sum + arr.filter(r => r.answer !== null && r.answer !== undefined && r.answer !== '' && 
      (Array.isArray(r.answer) ? r.answer.length > 0 : true)).length, 0);

  return (
    <div className="export-view">
      <div className="export-header">
        <h2>{t('export.title')}</h2>
        <p>{t('export.companyInfo')}: <strong>{company.name}</strong> | {totalQuestions} {t('export.questions', 'questions')} | {answeredQuestions} {t('export.answered', 'answered')}</p>
      </div>

      <div className="export-options">
        <h3>{t('export.selectFormat', 'Select Export Format')}</h3>
        
        {/* Basic Exports */}
        <div className="format-section">
          <h4 className="format-section-title">{t('export.basicExports', 'Basic Exports')}</h4>
          <div className="format-cards">
            <button 
              className={`format-card ${exportFormat === 'html' ? 'selected' : ''}`}
              onClick={() => setExportFormat('html')}
            >
              <span className="format-icon">🌐</span>
              <h4>{t('export.htmlReport')}</h4>
              <p>{t('export.htmlDesc', 'Formatted report for viewing/printing')}</p>
            </button>
            <button 
              className={`format-card ${exportFormat === 'json' ? 'selected' : ''}`}
              onClick={() => setExportFormat('json')}
            >
              <span className="format-icon">📋</span>
              <h4>{t('export.jsonData')}</h4>
              <p>{t('export.jsonDesc', 'Complete data for integration')}</p>
            </button>
            <button 
              className={`format-card ${exportFormat === 'csv' ? 'selected' : ''}`}
              onClick={() => setExportFormat('csv')}
            >
              <span className="format-icon">📊</span>
              <h4>{t('export.csvData')}</h4>
              <p>{t('export.csvDesc', 'For Excel/BI tool analysis')}</p>
            </button>
          </div>

          <button 
            className="btn-primary btn-large"
            onClick={() => generateReport(exportFormat)}
            disabled={generating}
          >
            {generating ? t('export.generating') : `${t('export.download')} ${exportFormat.toUpperCase()}`}
          </button>
        </div>

        {/* Advanced Reports */}
        <div className="format-section">
          <h4 className="format-section-title">{t('export.advancedReports', 'Advanced Analysis Reports')}</h4>
          <div className="format-cards">
            <button 
              className="format-card advanced"
              onClick={() => generateAdvancedReport('docx')}
              disabled={reportGenerating}
            >
              <span className="format-icon">📄</span>
              <h4>{t('export.wordReport', 'MS Word Report')}</h4>
              <p>{t('export.wordDesc', 'Professional report with radar charts, analysis & recommendations')}</p>
              <span className="format-badge">{t('export.new', 'NEW')}</span>
            </button>
            <button 
              className="format-card advanced"
              onClick={() => generateAdvancedReport('pdf')}
              disabled={reportGenerating}
            >
              <span className="format-icon">📕</span>
              <h4>{t('export.pdfReport', 'PDF Report')}</h4>
              <p>{t('export.pdfDesc', 'Portable document with charts, scores & improvement roadmap')}</p>
              <span className="format-badge">{t('export.new', 'NEW')}</span>
            </button>
          </div>

          {reportStatus && (
            <div className={`report-status ${reportStatus.type}`}>
              {reportStatus.message}
            </div>
          )}

          {reportGenerating && (
            <div className="report-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p>{t('export.generatingReport', 'Generating comprehensive report with radar charts...')}</p>
            </div>
          )}

          {pdfPreview && (
            <div className="pdf-preview-panel">
              <div className="pdf-preview-toolbar">
                <h3>{t('export.pdfPreview', 'PDF Report Preview')}</h3>
                <div>
                  <a className="btn-primary" href={pdfPreview} download={pdfFilename}>
                    {t('export.downloadPdf', 'Download PDF')}
                  </a>
                  <button className="btn-secondary" onClick={() => {
                    URL.revokeObjectURL(pdfPreview);
                    setPdfPreview(null);
                  }}>
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </div>
              <iframe
                title={t('export.pdfPreview', 'PDF Report Preview')}
                src={pdfPreview}
                className="pdf-preview-frame"
              />
            </div>
          )}
        </div>
      </div>

      <div className="export-preview">
        <h3>{t('export.reportPreview')}</h3>
        <div className="preview-content">
          <div className="preview-header">
            <h4>{company.name}</h4>
            <p>{company.industry} • {company.size || company.company_size} • {company.location}</p>
          </div>
          <div className="preview-sections">
            {Object.entries(responses).map(([sectionKey, sectionResponses]) => {
              const section = questionnaireSections.find(s => s.id === sectionKey);
              const answered = sectionResponses.filter(r => 
                r.answer !== null && r.answer !== undefined && r.answer !== '' && 
                (Array.isArray(r.answer) ? r.answer.length > 0 : true)
              ).length;
              return (
                <div key={sectionKey} className="preview-section">
                  <span className="preview-section-title">{section?.icon} {section?.title}</span>
                  <span className="preview-section-progress">{answered}/{sectionResponses.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportView;