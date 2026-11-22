// Script to update en.json and th.json with options translations
const fs = require('fs');

// Read current translation files
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const th = JSON.parse(fs.readFileSync('src/i18n/th.json', 'utf8'));

// Read extracted options
const enOptions = JSON.parse(fs.readFileSync('extracted-options-en.json', 'utf8'));

// Thai translations for common option patterns
const thaiTranslations = {
  // Company profile specific
  "1-10": "1-10 คน",
  "11-50": "11-50 คน",
  "51-200": "51-200 คน",
  "201-500": "201-500 คน",
  "501-1000": "501-1000 คน",
  "1001-5000": "1001-5000 คน",
  "5000+": "5000+ คน",
  "<$1M": "น้อยกว่า $1 ล้าน",
  "$1M-$10M": "$1-10 ล้าน",
  "$10M-$50M": "$10-50 ล้าน",
  "$50M-$100M": "$50-100 ล้าน",
  "$100M-$500M": "$100-500 ล้าน",
  "$500M-$1B": "$500 ล้าน - 1 พันล้าน",
  ">$1B": "มากกว่า $1 พันล้าน",
  "Private": "เอกชน",
  "Public": "สาธารณะ/หุ้นนิยม",
  "Family-owned": "ครอบครัวถือหุ้น",
  "Subsidiary": "บริษัทย่อย",
  "Joint Venture": "กิจการร่วม",
  "State-owned": "รัฐวิสาหกิจ",
  "Non-profit": "ไม่แสวงหาผลกำไร",
  // Common rating scales
  "Excellent": "ยอดเยี่ยม",
  "Good": "ดี",
  "Adequate": "เพียงพอ",
  "Limited": "จำกัด",
  "Critical": "วิกฤติ",
  "Average": "เฉลี่ย",
  "Below Average": "ต่ำกว่าเฉลี่ย",
  "Poor": "แย่",
  "Industry Leader": "ผู้นำอุตสาหกรรม",
  "Above Average": "สูงกว่าเฉลี่ย",
  "Lagging": "ตามหลัง",
  "Very High (>90%)": "สูงมาก (>90%)",
  "High (70-90%)": "สูง (70-90%)",
  "Moderate (50-70%)": "ปานกลาง (50-70%)",
  "Low (30-50%)": "ต่ำ (30-50%)",
  "Very Low (<30%)": "ต่ำมาก (<30%)",
  "Very Strong": "แข็งแกร่งมาก",
  "Strong": "แข็งแกร่ง",
  "Weak": "อ่อนแอ",
  "Very Weak": "อ่อนแอมาก",
  "Minimal": "น้อยที่สุด",
  "Significant": "มีนัยสำคัญ",
  "Severe": "รุนแรง",
  "None": "ไม่มี",
  "Minor": "เล็กน้อย",
  "Strong Pipeline": "ไลน์ผลิตภัณฑ์ที่แข็งแกร่ง",
  "Non-existent": "ไม่มีอยู่จริง",
  "Agile": "คล่องตัว",
  "Functional": "ตามหน้าที่",
  "Some Silos": "มีซิลโอบ้าง",
  "Heavy Silos": "ซิลโอมาก",
  "Dysfunctional": "การทำงานล้มเหลว",
  "Advanced": "ขั้นสูง",
  "Developing": "กำลังพัฒนา",
  "Basic": "พื้นฐาน",
  "Very Low": "ต่ำมาก",
  "Low": "ต่ำ",
  "High": "สูง",
  "Very High": "สูงมาก",
  "Not an issue": "ไม่ใช่ปัญหา",
  "Well Protected": "ได้รับการคุ้มครองดี",
  "Some Gaps": "มีช่องว่างบ้าง",
  "Significant Risk": "ความเสี่ยงสูง",
  "Critical Risk": "ความเสี่ยงวิกฤติ",
  
  // Time periods
  "1 year": "1 ปี",
  "2-3 years": "2-3 ปี",
  "3-5 years": "3-5 ปี",
  "5+ years": "5 ปีขึ้นไป",
  "Monthly": "รายเดือน",
  "Quarterly": "รายไตรมาส",
  "Semi-annually": "รายครึ่งปี",
  "Annually": "รายปี",
  "Ad-hoc only": "เฉพาะกรณีพิเศษ",
  "Yes, regularly": "ใช่ เป็นประจำ",
  "Occasionally": "บางครั้ง",
  "Rarely": "นادر",
  "Never": "ไม่เคย",
  
  // Yes/No variations
  "Yes, comprehensive": "ใช่ ครบถ้วน",
  "Yes, basic": "ใช่ พื้นฐาน",
  "In development": "กำลังพัฒนา",
  "No": "ไม่",
  "Fully implemented": "นำไปใช้เต็มที่",
  "Pilot phase": "ระหว่างทดลอง",
  "Planning to adopt": "วางแผนจะนำมาใช้",
  "Not using": "ไม่ได้ใช้",
  
  // Process maturity
  "Fully defined & cascaded": "กำหนดและส่งต่อแล้วครบถ้วน",
  "Partially defined": "กำหนดบางส่วน",
  "Defined but not cascaded": "กำหนดแล้วแต่งไม่ได้ส่งต่อ",
  "Not defined": "ไม่ได้กำหนด",
  "Optimized (Data-driven)": "เพิ่มประสิทธิภาพ (ข้อมูลนำ)",
  "Defined & Measured": "กำหนดและวัดได้",
  "Defined but not Measured": "กำหนดแต่อย่างไม่ได้วัด",
  "Ad-hoc": " אד-ฮอก (ไม่เป็นระบบ)",
  "Chaotic": "ยุ่งเหยิง",
  "Formal portfolio process": "กระบวนการพอร์ตโฟลิโอทางการ",
  "Annual budgeting": "การจัดสรรงบประมาณรายปี",
  "Not systematic": "ไม่เป็นระบบ",
  
  // Competitive positioning
  "Cost Leadership": "ผู้นำด้านต้นทุน",
  "Differentiation": "ความแตกต่าง",
  "Focus/Niche": "โฟกัส/นิช่าตลาด",
  "Stuck in Middle": "ติดอยู่กลาง",
  "Transitioning": "กำลังเปลี่ยนผ่าน",
  
  // Communication
  "Excellent - everyone knows it": "ยอดเยี่ยม - ทุกคนรู้",
  "Good - managers know it": "ดี - ผู้จัดการรู้",
  "Fair - leadership knows it": "พอใช้ - ผู้นำรู้",
  "Poor - unclear": "แย่ - ไม่ชัดเจน",
  
  // Change management
  "Strong": "แข็งแกร่ง",
  "Developing": "กำลังพัฒนา",
  "Basic": "พื้นฐาน",
  "Weak": "อ่อนแอ",
  "Non-existent": "ไม่มีอยู่จริง",
  
  // Production types
  "Make-to-Stock (MTS)": "ผลิตเพื่อสต็อก (MTS)",
  "Make-to-Order (MTO)": "ผลิตตามออเดอร์ (MTO)",
  "Engineer-to-Order (ETO)": "วิศวกรรมตามออเดอร์ (ETO)",
  "Assemble-to-Order (ATO)": "ประกอบตามออเดอร์ (ATO)",
  "Mixed Mode": "โหมดผสม",
  "Process Manufacturing": "การผลิตกระบวนการ",
  "Job Shop": "โรงงานงานเฉพาะ",
  
  // Production scheduling
  "Advanced Planning & Scheduling (APS)": "วางแผนและจัดตารางขั้นสูง (APS)",
  "ERP/MRP based": "ฐาน ERP/MRP",
  "Kanban/Pull": "カンバン/พูล",
  "Spreadsheet/Manual": "สเปรดชีต/แมนนวล",
  "Theory of Constraints": "ทฤษฎีข้อจำกัด",
  
  // Lean maturity
  "World Class": "ระดับโลก",
  "Intermediate": "ระดับกลาง",
  "Just Starting": "เพิ่งเริ่มต้น",
  "Not Implemented": "ยังไม่ได้ดำเนินการ",
  
  // Lean tools
  "5S": "5S",
  "Value Stream Mapping": "การสร้างแผนที่กระแสค่า",
  "Kaizen": "ไคเซ็น (ปรับปรุงอย่างต่อเนื่อง)",
  "Kanban": "カンバン",
  "SMED": "SMED (การเปลี่ยนโมเดลเร็ว)",
  "TPM": "TPM (การบำรุงรักษาเชิงรวม)",
  "Standard Work": "งานมาตรฐาน",
  "Heijunka": "เฮจุนกะ (การทำระดับ)",
  "Poka-Yoke": "โปเกะ-โยเกะ (ป้องกันข้อผิดพลาด)",
  "Andon": "อันดอน (สัญญาณ)",
  "Gemba Walks": "การเดินสู่เจนบะ",
  "Hoshin Kanri": "โชชินกันริ (การปกครองนโยบาย)",
  
  // Quality systems
  "ISO 9001": "ISO 9001",
  "IATF 16949": "IATF 16949",
  "ISO 13485": "ISO 13485",
  "AS9100": "AS9100",
  "Six Sigma": "ซิกซิกม่า",
  "Internal System Only": "ระบบภายในเท่านั้น",
  "None Formal": "ไม่มีทางการ",
  
  // WIP levels
  "Optimized": "เพิ่มประสิทธิภาพแล้ว",
  "Excessive": "มากเกินไป",
  "Unknown": "ไม่ทราบ",
  
  // Maintenance
  "Predictive (PdM)": "พยากรณ์ (PdM)",
  "Preventive (PM)": "ป้องกัน (PM)",
  "Condition-based (CBM)": "ตามสภาพ (CBM)",
  "Reactive/Breakdown": "ซ่อมหลังเสีย/การชำรุด",
  "RCM (Reliability Centered)": "RCM (ศูนย์กลางความน่าเชื่อถือ)",
  
  // Production KPIs
  "OEE": "OEE",
  "FPY": "FPY",
  "Cycle Time": "เวลาวงจร",
  "Throughput": "ผลผลิต",
  "Capacity Utilization": "การใช้กำลังการผลิต",
  "On-time Delivery": "ส่งตรงเวลา",
  "Scrap Rate": "อัตราของเสีย",
  "Rework Rate": "อัตราการปรับปรุง",
  "Labor Productivity": "ผลิตภาพแรงงาน",
  "Energy per Unit": "พลังงานต่อหน่วย",
  "Schedule Adherence": "การปฏิบัติตามตาราง",
  "Changeover Time": "เวลาเปลี่ยนโมเดล",
  
  // Digital manufacturing
  "Advanced (Digital Twin, AI)": "ขั้นสูง (Digital Twin, AI)",
  "Connected (IIoT, Real-time)": "เชื่อมต่อ (IIoT, Real-time)",
  "Automated (MES, SCADA)": "อัตโนมัติ (MES, SCADA)",
  "Basic (ERP, Barcode)": "พื้นฐาน (ERP, Barcode)",
  "Manual/Paper-based": "แมนนวล/กระดาษ",
  
  // Sales model
  "Direct Sales": "ขายตรง",
  "Channel/Partner": "ช่องทาง/พาร์ทเนอร์",
  "E-commerce/Direct": "อีคอมเมิร์ซ/ตรง",
  "Inside Sales": "ขายภายใน",
  "Field Sales": "ขายภาคสนาม",
  "Hybrid": "ผสม",
  "Subscription/SaaS": "สมาชิก/SaaS",
  "Project-based": "โครงการ",
  
  // Lead generation
  "Inbound/Content": "อินบาวด์/เนื้อหา",
  "Paid Search": "ค้นหาแบบจ่ายเงิน",
  "Paid Social": "โซเชียลแบบจ่ายเงิน",
  "Email Marketing": "การตลาดอีเมล",
  "Events/Trade Shows": "กิจกรรม/งานแสดง",
  "Referrals": "การแนะนำ",
  "Partner/Channel": "พาร์ทเนอร์/ช่องทาง",
  "Cold Outreach": "การติดต่อเย็น",
  "ABM": "ABM (Account-Based Marketing)",
  "SEO/Organic": "SEO/ออร์แกนิก",
  
  // CRM
  "Salesforce": "Salesforce",
  "HubSpot": "HubSpot",
  "Microsoft Dynamics": "Microsoft Dynamics",
  "Pipedrive": "Pipedrive",
  "Zoho": "Zoho",
  "Custom/ERP": "กำหนดเอง/ERP",
  "None/Spreadsheets": "ไม่มี/สเปรดชีต",
  
  // Marketing automation
  "Marketo": "Marketo",
  "Pardot": "Pardot",
  "ActiveCampaign": "ActiveCampaign",
  "Mailchimp": "Mailchimp",
  "Custom": "กำหนดเอง",
  
  // Sales process
  "Optimized (Data-driven)": "เพิ่มประสิทธิภาพ (ข้อมูลนำ)",
  
  // Pricing
  "Value-based": "ตามคุณค่า",
  "Cost-plus": "ต้นทุนบวก",
  "Competitive": "แข่งขัน",
  "Penetration": "เจาะตลาด",
  "Skimming": "สเกมมิ่ง",
  "Dynamic": "ไดนามิก",
  "Subscription/Tiered": "สมาชิก/ระดับ",
  
  // Competitive intelligence
  "Formal/Continuous": "ทางการ/ต่อเนื่อง",
  "Periodic": "เป็นระยะ",
  "Reactive": "ตอบสนอง",
  
  // Customer feedback
  "Systematic (NPS, CSAT, Action)": "เป็นระบบ (NPS, CSAT, การดำเนินการ)",
  "Regular Surveys": "สำรวจเป็นประจำ",
  "Occasional": "บางครั้ง",
  "Reactive Only": "ตอบสนองอย่างเดียว",
  
  // Alignment
  "Fully Aligned (SLA)": "สอดคล้องเต็มที่ (SLA)",
  "Good Collaboration": "ร่วมมือดี",
  "Some Alignment": "สอดคล้องบางส่วน",
  "Misaligned": "ไม่สอดคล้อง",
  "Siloed": "ซิลโอ",
  
  // R&D structure
  "Centralized": "รวมศูนย์",
  "Decentralized/Business Unit": "กระจายศูนย์/หน่วยธุรกิจ",
  "Matrix": "เมทริกซ์",
  "Virtual/Open Innovation": "เสมือน/นวัตกรรมเปิด",
  "Outsourced": "จ้างนอก",
  
  // Innovation strategy
  "Yes, comprehensive": "ใช่ ครบถ้วน",
  "Yes, basic": "ใช่ พื้นฐาน",
  "In development": "กำลังพัฒนา",
  
  // NPD process
  "Stage-Gate (Optimized)": "สเตจ-เกต (เพิ่มประสิทธิภาพ)",
  "Stage-Gate (Standard)": "สเตจ-เกต (มาตรฐาน)",
  "Agile/Lean Startup": "แอไจล์/ลีนสตาร์ทอัพ",
  "Hybrid": "ไฮบริด",
  "Ad-hoc": "อัด-ฮอก",
  "None Formal": "ไม่มีทางการ",
  
  // R&D collaboration
  "Universities": "มหาวิทยาลัย",
  "Research Institutes": "สถาบันวิจัย",
  "Startups": "สตาร์ทอัพ",
  "Competitors": "คู่แข่ง",
  "Suppliers": "ผู้จัดหา",
  "Customers": "ลูกค้า",
  "Government Labs": "ห้องปฏิบัติการรัฐบาล",
  
  // Open innovation
  "Extensive": "กว้างขวาง",
  "Limited": "จำกัด",
  "Exploring": "สำรวจ",
  
  // Technology scanning
  "Systematic/Continuous": "เป็นระบบ/ต่อเนื่อง",
  
  // Idea management
  "Digital Platform (Active)": "แพลตฟอร์มดิจิทัล (ใช้งานจริง)",
  "Digital Platform (Low Usage)": "แพลตฟอร์มดิจิทัล (ใช้งานน้อย)",
  "Suggestion Box": "กล่องข้อเสนอแนะ",
  "Hackathons/Events": "แฮกกาธอน/กิจกรรม",
  "Informal": "ไม่เป็นทางการ",
  
  // Digital tools
  "PLM": "PLM",
  "Simulation/CAE": "จำลอง/CAE",
  "Electronic Lab Notebook": "สมุดบันทึกลै็บอิเล็กทรอนิกส์",
  "Requirements Management": "จัดการความต้องการ",
  "Project Portfolio Management": "จัดการพอร์ตโฟลิโอโครงการ",
  "Data Analytics/AI": "วิเคราะห์ข้อมูล/AI",
  "Collaboration Platform": "แพลตฟอร์มร่วมมือ",
  
  // R&D metrics
  "R&D Spend/Revenue": "ค่าใช้จ่าย R&D/รายได้",
  "Patents per $M R&D": "สิทธิบัตรต่อ $ล้าน R&D",
  "New Product Revenue %": "% รายได้ผลิตภัณฑ์ใหม่",
  "Time to Market": "เวลาสู่ตลาด",
  "Project Success Rate": "อัตราความสำเร็จโครงการ",
  "Resource Utilization": "การใช้ทรัพยากร",
  
  // Technical debt
  "Minimal": "น้อยที่สุด",
  "Manageable": "จัดการได้",
  "Significant": "มีนัยสำคัญ",
  "Critical": "วิกฤติ",
  "Unknown": "ไม่ทราบ",
  
  // Sustainability innovation
  "Core Strategy": "กลยุทธ์หลัก",
  "Important Initiative": "โครงการสำคัญ",
  "Exploring": "สำรวจ",
  "Not a Priority": "ไม่ใช่ความสำคัญ",
  
  // Productivity
  "Improving >5%/yr": "ปรับปรุง >5%/ปี",
  "Improving 1-5%/yr": "ปรับปรุง 1-5%/ปี",
  "Flat": "คงที่",
  "Declining 1-5%/yr": "ลดลง 1-5%/ปี",
  "Declining >5%/yr": "ลดลง >5%/ปี",
  
  // Automation
  "Lights-out/Fully Automated": "ไลท์-เอาต์/อัตโนมัติเต็มที่",
  "Highly Automated": "อัตโนมัติสูง",
  "Partially Automated": "อัตโนมัติบางส่วน",
  "Manual with Tools": "แมนนวลพร้อมเครื่องมือ",
  "Fully Manual": "แมนนวลเต็มที่",
  
  // Process standardization
  "Fully Standardized": "มาตรฐานเต็มที่",
  "Mostly Standardized": "มาตรฐานส่วนใหญ่",
  "Partially Standardized": "มาตรฐานบางส่วน",
  "No Standards": "ไม่มีมาตรฐาน",
  
  // Continuous improvement
  "Embedded Culture": "วัฒนธรรมฝังราก",
  "Active Program": "โปรแกรมที่ดำเนินการ",
  "Pilot Projects": "โครงการทดลอง",
  
  // Productivity measurement
  "Labor Standards/Engineered": "มาตรฐานแรงงาน/วิศวกรรม",
  "Time Studies": "ศึกษาเวลา",
  "MOST/MTM": "MOST/MTM",
  "Real-time Tracking": "ติดตามเรียลไทม์",
  "ERP/MES Reports": "รายงาน ERP/MES",
  "Manual Tracking": "ติดตามแมนนวล",
  "Not Measured": "ไม่ได้วัด",
  
  // Bottleneck analysis
  "Weekly": "รายสัปดาห์",
  "Rarely/Never": "นادر/ไม่เคย",
  
  // Workforce skills
  "Current & Comprehensive": "ปัจจุบันและครบถ้วน",
  "Current but Partial": "ปัจจุบันแต่ไม่ครบ",
  "Outdated": "ล้าสมัย",
  "In Development": "กำลังพัฒนา",
  
  // Cross training
  "Extensive": "กว้างขวาง",
  "Good": "ดี",
  "Moderate": "ปานกลาง",
  "Limited": "จำกัด",
  
  // Ergonomics
  "World Class": "ระดับโลก",
  "Strong": "แข็งแกร่ง",
  "Compliant": "ปฏิบัติตาม",
  "Basic": "พื้นฐาน",
  "Minimal": "น้อยที่สุด",
  
  // Waste management
  "ISO 14001": "ISO 14001",
  "EMAS": "EMAS",
  "ISO 50001": "ISO 50001",
  "LEED": "LEED",
  "B Corp": "B Corp",
  "Carbon Neutral": "คาร์บอนนิวทรัล",
  "Science Based Targets": "เป้าหมายอิงวิทยาศาสตร์",
  "Real-time Digital": "ดิจิทัลเรียลไทม์",
  "ERP Integrated": "รวม ERP",
  "Periodic Manual": "แมนนวลเป็นระยะ",
  "Basic Spreadsheet": "สเปรดชีตพื้นฐาน",
  "Product Design for Recycling": "ออกแบบผลิตภัณฑ์เพื่อรีไซเคิล",
  "Remanufacturing/Refurbishment": "รีแมนูแฟกเจอริง/รีเฟอร์บิช",
  "Take-back Programs": "โปรแกรมรับคืน",
  "Industrial Symbiosis": "ซิมไบโอซิสอุตสาหกรรม",
  "Material Substitution": "การแทนที่วัสดุ",
  "Packaging Reduction": "ลดบรรจุภัณฑ์",
  "Full Measurement": "วัดครบถ้วน",
  "Partial": "บางส่วน",
  "Planning": "วางแผน",
  "Not Measured": "ไม่ได้วัด",
  "Fully Integrated": "รวมเต็มที่",
  "Aligned Initiatives": "โครงการที่สอดคล้อง",
  "Separate Programs": "โปรแกรมแยก",
  "Lean Only": "ลีนอย่างเดียว",
  "Green Only": "กรีนอย่างเดียว",
  "Neither": "ไม่มีทั้งสอง",
  "Mandatory Certifications": "ใบรับรองบังคับ",
  "Scoring/Assessment": "การให้คะแนน/ประเมิน",
  "Code of Conduct": "ข้อกำหนดการปฏิบัติ",
  "Basic Compliance": "ปฏิบัติตามพื้นฐาน",
  "GRI/SASB/TCFD Compliant": "ปฏิบัติตาม GRI/SASB/TCFD",
  "Voluntary Report": "รายงานอาสา",
  "Internal Only": "ภายในเท่านั้น",
  "Regulatory Only": "กำหนดโดยกฎระเบียบอย่างเดียว",
  
  // BCG
  "USDA BioPreferred": "USDA BioPreferred",
  "OK biobased": "OK biobased",
  "ISCC PLUS": "ISCC PLUS",
  "REDcert²": "REDcert²",
  "RSB": "RSB",
  "Bonsucro": "Bonsucro",
  "Other": "อื่นๆ",
  "Advanced (Fermentation, Enzymatic, Synthetic Bio)": "ขั้นสูง (หมัก, เอนไซม์, ชีวเทคสังเคราะห์)",
  "Moderate (Some Bioprocesses)": "ปานกลาง (บางกระบวนชีวภาพ)",
  "Basic (Bio-based Inputs Only)": "พื้นฐาน (เฉพาะอินพุตชีวภาพ)",
  "Fully Integrated & Traceable": "รวมและตรวจสอบได้เต็มที่",
  "Partially Traceable": "ตรวจสอบได้บางส่วน",
  "Basic Sourcing": "การจัดหาพื้นฐาน",
  "Not Developed": "ยังไม่พัฒนา",
  "Regenerative (Cradle-to-Cradle)": "ฟื้นฟู (Cradle-to-Cradle)",
  "Circular (Closed Loops)": "หมุนเวียน (ลูปปิด)",
  "Recycling Focused": "โฟกัสรีไซเคิล",
  "Waste Reduction Only": "ลดขยะอย่างเดียว",
  "Linear (Take-Make-Waste)": "เชิงเส้น (หยิบ-ทำ-ทิ้ง)",
  "Repair Services": "บริการซ่อมแซม",
  "Refurbishment/Remanufacturing": "รีเฟอร์บิช/รีแมนูแฟกเจอริง",
  "Product-as-a-Service": "ผลิตภัณฑ์เป็นบริการ",
  "Take-back/Buy-back": "รับคืน/ซื้อคืน",
  "Upcycling": "อัพไซเคิล",
  "Modular Design": "ออกแบบโมดูลาร์",
  "Industrial Symbiosis": "ซิมไบโอซิสอุตสาหกรรม",
  "By-product Valorization": "สร้างค่าผลพลอยได้",
  "Waste Heat Recovery": "ฟื้นฟูความร้อนขยะ",
  "Anaerobic Digestion": "การย่อยสลาย 혐기อุณห์",
  "Composting": "การทำปุ๋ย",
  "Chemical Recycling": "รีไซเคิลเคมี",
  "Design for Durability": "ออกแบบเพื่อความทนทาน",
  "Design for Repair": "ออกแบบเพื่อซ่อมแซม",
  "Design for Disassembly": "ออกแบบเพื่อถอดแยก",
  "Design for Recycling": "ออกแบบเพื่อรีไซเคิล",
  "Design for Reuse": "ออกแบบเพื่อนำกลับมาใช้ใหม่",
  "Material Standardization": "มาตรฐานวัสดุ",
  "100% Reusable/Recyclable/Compostable": "นำกลับมาใช้/รีไซเคิล/ทำปุ๋ยได้ 100%",
  "Mostly Recyclable": "ส่วนใหญ่รีไซเคิลได้",
  "Partially Recyclable": "บางส่วนรีไซเคิลได้",
  "Single-use Dominant": "ใช้ครั้งเดียวเป็นหลัก",
  "Not Assessed": "ไม่ได้ประเมิน",
  "Material Circularity Indicator (MCI)": "ตัวชี้วัดความหมุนเวียนของวัสดุ (MCI)",
  "Circular Transition Indicators (CTI)": "ตัวชี้วัดการเปลี่ยนผ่านเชิงหมุนเวียน (CTI)",
  "Recycling Rate": "อัตรารีไซเคิล",
  "Recycled Content %": "% เนื้อหารีไซเคิล",
  "Product Lifetime Extension": "ขยายอายุผลิตภัณฑ์",
  "Resource Productivity": "ผลิตภาพทรัพยากร",
  "Waste Generation per Unit": "ขยะต่อหน่วย",
  "Yes, Net Zero committed (SBTi)": "ใช่ มุ่งสู่ Net Zero (SBTi)",
  "Yes, Carbon Neutral committed": "ใช่ มุ่งสู่ Carbon Neutral",
  "Yes, Basic Sustainability": "ใช่ ความยั่งยืนพื้นฐาน",
  "Yes, Comprehensive": "ใช่ ครบถ้วน",
  "Yes, Partial (Key Categories)": "ใช่ บางส่วน (หมวดหลัก)",
  "In Progress": "กำลังดำเนินการ",
  "Advanced (AWS Certified)": "ขั้นสูง (AWS Certified)",
  "Comprehensive": "ครบถ้วน",
  "Basic Monitoring": "ติดตามพื้นฐาน",
  "Compliance Only": "ปฏิบัติตามอย่างเดียว",
  "TNFD Reporting": "รายงาน TNFD",
  "No Net Loss/Net Gain Targets": "เป้าหมาย No Net Loss/Net Gain",
  "Habitat Restoration": "ฟื้นฟูที่อยู่อาศัย",
  "Sustainable Land Use": "การใช้ที่ดินยั่งยืน",
  "Supply Chain Deforestation-free": "โซ่อุปทานไร้การทำลายป่า",
  "Green Bonds": "บอนด์เขียว",
  "Sustainability-linked Loans": "สินเชื่อเชื่อมโยงความยั่งยืน",
  "Green Loans": "สินเชื่อเขียว",
  "Carbon Credits": "เครดิตคาร์บอน",
  "ESG-linked Derivatives": "อนุพันธ์เชื่อมโยง ESG",
  "Yes, Shadow Price": "ใช่ ราคาบังคับ",
  "Yes, Internal Fee": "ใช่ ค่าธรรมเนียมภายใน",
  "Planned": "วางแผนไว้",
  "Yes, Basic": "ใช่ พื้นฐาน",
  "Board-level Sustainability Committee": "คณะกรรมการความยั่งยืนระดับบอร์ด",
  "Chief Sustainability Officer": "ผู้บริหารความยั่งยืนสูงสุด",
  "BCG Steering Committee": "คณะกรรมการควบคุม BCG",
  "Cross-functional Working Groups": "กลุ่มทำงานข้ามหน้าที่",
  "External Advisory Board": "คณะที่ปรึกษาภายนอก",
  "None Formal": "ไม่มีทางการ",
  "Yes, Significant Weight": "ใช่ น้ำหนักสำคัญ",
  "Yes, Moderate Weight": "ใช่ น้ำหนักปานกลาง",
  "Yes, Minor Weight": "ใช่ น้ำหนักน้อย",
  "LCA Software (SimaPro, GaBi, openLCA)": "ซอฟต์แวร์ LCA (SimaPro, GaBi, openLCA)",
  "Material Flow Analysis": "การวิเคราะห์กระแสวัสดุ",
  "Digital Product Passport": "พาสพอร์ตผลิตภัณฑ์ดิจิทัล",
  "Blockchain Traceability": "การติดตามบล็อกเชน",
  "AI for Resource Optimization": "AI เพื่อเพิ่มประสิทธิภาพทรัพยากร",
  "IoT for Energy/Resource Monitoring": "IoT ติดตามพลังงาน/ทรัพยากร",
  "Customers": "ลูกค้า",
  "Suppliers": "ผู้จัดหา",
  "Investors": "นักลงทุน",
  "Employees": "พนักงาน",
  "Local Communities": "ชุมชนท้องถิ่น",
  "Regulators": "ผู้กำกับดูแล",
  "NGOs": "องค์กรไม่แสวงหาผลกำไร",
  "Academia": "ภาควิชาการ",
  "Comprehensive Program": "โปรแกรมครบถ้วน",
  "Role-specific Training": "ฝึกอบรมเฉพาะบทบาท",
  "Awareness Only": "เพียงการรับรู้",
  "Fully Prepared": "พร้อมเต็มที่",
  "Well Progressed": "ก้าวหน้าดี",
  "Early Stages": "ขั้นต้น",
  "Not Started": "ยังไม่เริ่ม",
  "Unaware": "ไม่ทราบ",
  
  // OEE
  "Yes - Real-time/Automated": "ใช่ - เรียลไทม์/อัตโนมัติ",
  "Yes - Manual/Daily": "ใช่ - แมนนวล/รายวัน",
  "Yes - Periodic Studies": "ใช่ - ศึกษาเป็นระยะ",
  "No - Not Tracked": "ไม่ - ไม่ได้ติดตาม",
  "Automated (IIoT/MES)": "อัตโนมัติ (IIoT/MES)",
  "Semi-automated (PLC + Manual)": "ครึ่งอัตโนมัติ (PLC + แมนนวล)",
  "Manual (Paper/Excel)": "แมนนวล (กระดาษ/Excel)",
  "Operator Log Sheets": "บันทึกผู้ปฏิบัติงาน",
  "Not Collected": "ไม่ได้เก็บรวบรวม",
  "Real-time": "เรียลไทม์",
  "Per Shift": "ต่อกะ",
  "Daily": "รายวัน",
  "Weekly": "รายสัปดาห์",
  "Monthly": "รายเดือน",
  "Ad-hoc": " אד-ฮอก",
  "All 6 Tracked": "ติดตามทั้ง 6",
  "4-5 Tracked": "ติดตาม 4-5",
  "2-3 Tracked": "ติดตาม 2-3",
  "Only Overall": "เฉพาะโดยรวม",
  "Not Categorized": "ไม่จัดหมวดหมู่",
  "Unplanned Downtime/Breakdowns": "หยุดงานไม่ได้วางแผน/ชำรุด",
  "Planned Downtime (Changeovers)": "หยุดงานวางแผน (เปลี่ยนโมเดล)",
  "Planned Downtime (Maintenance)": "หยุดงานวางแผน (บำรุงรักษา)",
  "Setup/Adjustment": "ตั้งค่า/ปรับ",
  "No Operator/Material": "ไม่มีผู้ปฏิบัติ/วัสดุ",
  "Micro Stops/Idling": "หยุดสั้น/ไอดิ้ล",
  "Reduced Speed": "ความเร็วลดลง",
  "Minor Stops": "หยุดเล็กน้อย",
  "Start-up Losses": "สูญเสียตอนเริ่มต้น",
  "Changeover Overruns": "เปลี่ยนโมเดลเกินเวลา",
  "Start-up Scrap": "ของเสียตอนเริ่มต้น",
  "Production Scrap": "ของเสียขณะผลิต",
  "Rework": "ปรับปรุง",
  "In-process Defects": "ข้อบกพร่องระหว่างกระบวนการ",
  "Customer Returns": "ลูกค้าคืนสินค้า",
  "Full TPM (All 8 Pillars)": "TPM เต็มรูปแบบ (8 เสา)",
  "Partial TPM (3-5 Pillars)": "TPM ส่วน (3-5 เสา)",
  "Focused Improvement Only": "ปรับปรุงจุดเน้นอย่างเดียว",
  "Autonomous Maintenance Only": "บำรุงรักษาอัตโนมัติอย่างเดียว",
  "Planned Maintenance Only": "บำรุงรักษาวางแผนอย่างเดียว",
  "No TPM": "ไม่มี TPM",
  "Real-time Displays": "แสดงผลเรียลไทม์",
  "Daily Boards": "บอร์ดรายวัน",
  "Weekly Reports": "รายงานรายสัปดาห์",
  "Monthly Reports": "รายงานรายเดือน",
  "High (Own OEE)": "สูง (เป็นเจ้าของ OEE)",
  "Moderate (Participate)": "ปานกลาง (มีส่วนร่วม)",
  "Low (Aware Only)": "ต่ำ (รับรู้อย่างเดียว)",
  "Availability - Breakdowns": "ความพร้อม - ชำรุด",
  "Availability - Changeovers": "ความพร้อม - เปลี่ยนโมเดล",
  "Performance - Speed Loss": "ประสิทธิภาพ - สูญเสียความเร็ว",
  "Performance - Micro Stops": "ประสิทธิภาพ - หยุดสั้น",
  "Quality - Scrap": "คุณภาพ - ของเสีย",
  "Quality - Rework": "คุณภาพ - ปรับปรุง",
  "Not Sure": "ไม่แน่ใจ",
  
  // Company profile
  "Manufacturing": "การผลิต",
  "Technology": "เทคโนโลยี",
  "Healthcare": "ดูแลสุขภาพ",
  "Financial Services": "บริการการเงิน",
  "Retail": "ขายปลีก",
  "Food & Beverage": "อาหารและเครื่องดื่ม",
  "Automotive": "ยานยนต์",
  "Chemicals": "เคมีภัณฑ์",
  "Textiles": "ผ้าและอุตสาหกรรมผ้า",
  "Other": "อื่นๆ",
  "Private": "เอกชน",
  "Public": "สาธารณะ/หุ้นนิยม",
  "Family-owned": "ครอบครัวถือหุ้น",
  "Subsidiary": "บริษัทย่อย",
  "Joint Venture": "กิจการร่วม",
  "State-owned": "รัฐวิสาหกิจ",
  "Non-profit": "ไม่แสวงหาผลกำไร",
};

// Function to translate options array
function translateOptions(options) {
  return options.map(opt => thaiTranslations[opt] || `[TH] ${opt}`);
}

// Update en.json - add options to each question
function updateEnJson(en, enOptions) {
  for (const [path, options] of Object.entries(enOptions)) {
    // Parse path: questions.sectionId.questionKey.options
    const parts = path.split('.');
    const sectionId = parts[1];
    const questionKey = parts[2];
    
    if (en.questions && en.questions[sectionId] && en.questions[sectionId][questionKey]) {
      en.questions[sectionId][questionKey].options = options;
    } else {
      console.log(`Warning: Path not found in en.json: ${path}`);
    }
  }
  return en;
}

// Update th.json - add translated options to each question
function updateThJson(th, enOptions) {
  for (const [path, options] of Object.entries(enOptions)) {
    const parts = path.split('.');
    const sectionId = parts[1];
    const questionKey = parts[2];
    
    if (th.questions && th.questions[sectionId] && th.questions[sectionId][questionKey]) {
      th.questions[sectionId][questionKey].options = translateOptions(options);
    } else {
      console.log(`Warning: Path not found in th.json: ${path}`);
    }
  }
  return th;
}

// Update both files
const updatedEn = updateEnJson(en, enOptions);
const updatedTh = updateThJson(th, enOptions);

// Write back
fs.writeFileSync('src/i18n/en.json', JSON.stringify(updatedEn, null, 2));
fs.writeFileSync('src/i18n/th.json', JSON.stringify(updatedTh, null, 2));

console.log('Updated en.json and th.json with options translations');
console.log('Total options translated:', Object.keys(enOptions).length);