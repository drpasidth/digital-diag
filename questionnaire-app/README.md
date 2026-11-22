# Digital Diagnostic Questionnaire

A comprehensive pre-consulting company assessment platform built with React (frontend) and Node.js/Express with SQLite3 (backend). Designed to collect detailed company information across 10 key business areas before consulting engagements.

## 🎯 Features

### Questionnaire Sections (10 Areas)

1. **Company Profile** - Basic organizational information
2. **SWOT Analysis** - Strengths, Weaknesses, Opportunities, Threats with synthesis
3. **Strategic Planning** - Vision, mission, OKRs, execution, competitive positioning
4. **Production Management** - Operations, lean, quality, capacity, Industry 4.0
5. **Sales & Marketing** - Revenue generation, funnels, CRM, customer metrics
6. **R&D & Innovation** - Product development, IP portfolio, innovation culture
7. **Productivity** - Labor efficiency, automation, continuous improvement
8. **Waste Management** - Sustainability, circular economy, ESG reporting
9. **BCG (Bio-Circular-Green Economy)** - Bioeconomy, circular economy, green economy transformation
10. **OEE** - Overall Equipment Effectiveness, TPM, Six Big Losses

### Technical Features

- **React 19** frontend with Vite for fast development
- **Express.js** backend with RESTful API
- **SQLite3** (better-sqlite3) for lightweight, file-based storage
- **Section-by-section navigation** with progress tracking
- **Auto-save** on section change
- **Multiple export formats**: HTML (formatted report), JSON (data), CSV (analysis)
- **Responsive design** works on desktop and tablet
- **Company management** - Create, edit, delete assessments

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
cd questionnaire-app
npm install
```

### Development

Run both frontend and backend concurrently:

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3001 (Express API)

### Production Build

```bash
npm run build
npm start
```

### Database Management

```bash
# Reset database (drops all tables and recreates)
npm run db:reset
```

## 📁 Project Structure

```
questionnaire-app/
├── server.js                 # Express backend with SQLite
├── package.json
├── index.html
├── scripts/
│   └── reset-db.js          # Database reset utility
├── src/
│   ├── main.jsx             # React entry point
│   ├── App.jsx              # Main app component
│   ├── App.css              # All styles
│   ├── data/
│   │   └── questions.js     # Questionnaire data (10 sections, 200+ questions)
│   └── components/
│       ├── CompanySelector.jsx  # Company CRUD form
│       ├── Dashboard.jsx        # Company list & overview
│       ├── QuestionnaireForm.jsx # Main questionnaire UI
│       ├── ExportView.jsx       # Report export (HTML/JSON/CSV)
│       └── FormInputs.jsx       # Reusable form components
```

## 🗄️ Database Schema

### Companies Table
```sql
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  founded_year INTEGER,
  location TEXT,
  website TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Responses Table
```sql
CREATE TABLE responses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  section TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer TEXT,           -- JSON string
  answer_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

## 🔌 API Endpoints

### Companies
- `POST   /api/companies` - Create company
- `GET    /api/companies` - List all companies
- `GET    /api/companies/:id` - Get company
- `PUT    /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company

### Responses
- `POST   /api/responses` - Create single response
- `GET    /api/responses/:companyId` - Get all responses for company
- `GET    /api/responses/:companyId/:section` - Get responses by section
- `PUT    /api/responses/:id` - Update response
- `POST   /api/responses/bulk` - Bulk upsert (section save)

### Export
- `GET    /api/export/:companyId` - Full export (company + grouped responses)

## 🎨 Question Types Supported

| Type | Component | Use Case |
|------|-----------|----------|
| `text` | Input | Single line text |
| `textarea` | Textarea | Multi-line text |
| `number` | Input | Numeric values |
| `email` | Input | Email addresses |
| `url` | Input | Website URLs |
| `tel` | Input | Phone numbers |
| `select` | Select | Single choice dropdown |
| `multiselect` | MultiSelect | Multiple choices with search |
| `rating` | Rating | 1-10 or 1-5 star rating |

## 📊 Export Formats

### HTML Report
- Professional formatted report with company header
- All sections and questions with answers
- Print-ready with page break optimization

### JSON Export
- Complete data structure for integration
- Includes company info and all responses
- Preserves data types and structure

### CSV Export
- Flat structure: Section, Question, Answer, Type
- Ready for Excel, Power BI, Tableau
- Array answers joined with semicolons

## 🔧 Customization

### Adding Questions

Edit `src/data/questions.js`:

```javascript
{
  key: 'unique_key',
  text: 'Question text?',
  type: 'textarea',  // or select, multiselect, rating, etc.
  required: true,
  options: ['Option 1', 'Option 2'],  // for select/multiselect
  min: 1, max: 10,  // for number/rating
  placeholder: 'Hint text',
  category: 'Category Name'  // for grouping (e.g., SWOT)
}
```

### Adding Sections

Add to `questionnaireSections` array in `questions.js`:

```javascript
{
  id: 'section_id',
  title: 'Section Title',
  description: 'Section description',
  icon: '🎯',
  questions: [ /* question objects */ ]
}
```

## 🌐 Deployment

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables

Create `.env` file:
```
PORT=3001
NODE_ENV=production
```

## 📝 License

MIT License - Feel free to use for consulting engagements.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add questions/sections as needed
4. Submit pull request

## 📞 Support

For questions about the questionnaire structure or consulting methodology, refer to the question definitions in `src/data/questions.js` which include detailed coverage of each business area.