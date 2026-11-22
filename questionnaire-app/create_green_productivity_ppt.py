from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

GREEN = RGBColor(30, 120, 75)
DARK = RGBColor(24, 55, 42)
LIGHT = RGBColor(235, 247, 238)
ACCENT = RGBColor(112, 190, 112)
GRAY = RGBColor(85, 95, 88)
WHITE = RGBColor(255, 255, 255)

slides = [
    ("Green Productivity", ["Improving business performance while reducing environmental impact", "A practical roadmap for efficient, resilient and sustainable operations"]),
    ("What is Green Productivity?", ["Green Productivity combines productivity improvement with environmental protection.", "It focuses on doing more with fewer resources, less waste and lower emissions.", "The goal: economic value + environmental value + social value."]),
    ("Why It Matters", ["Rising energy, material and compliance costs", "Customer and supply-chain expectations for sustainability", "Resource scarcity, climate risk and operational disruption", "Efficiency improvements often create measurable financial returns"]),
    ("The Green Productivity Framework", ["1. Prepare: establish leadership, scope and baseline", "2. Diagnose: map processes, material flows and environmental impacts", "3. Generate options: identify prevention, efficiency and circular solutions", "4. Evaluate: compare benefits, cost, risk and feasibility", "5. Implement and sustain: execute, measure and improve"]),
    ("Key Opportunity Areas", ["Energy: efficient equipment, controls, renewable energy", "Materials: yield improvement, substitution, reuse and recycling", "Water: reduce consumption, leakage and contamination", "Waste: prevention first, followed by recovery and responsible disposal", "People and processes: standard work, skills and continuous improvement"]),
    ("Practical Tools", ["Process mapping and value-stream mapping", "Material and energy flow analysis", "Pareto analysis and root-cause analysis", "5S, Kaizen, Lean and Total Productive Maintenance", "Life-cycle thinking and circular design", "Environmental performance dashboards"]),
    ("Implementation Roadmap", ["First 30 days: form a cross-functional team and establish baseline data", "Days 31–60: identify hotspots and prioritize quick wins", "Days 61–90: pilot improvements and verify results", "After 90 days: standardize, scale and embed targets into management routines"]),
    ("Example Initiatives", ["Optimize compressed-air systems and eliminate leaks", "Reduce changeover time and startup scrap", "Install sub-metering for major energy users", "Redesign packaging to reduce material and improve recyclability", "Use preventive maintenance to protect energy and process efficiency"]),
    ("KPIs to Track", ["Productivity: output per labor hour, OEE, cycle time", "Resource intensity: energy, water and material per unit", "Environmental: waste, emissions and recycled content", "Business: cost savings, payback, revenue and customer value", "People: improvement ideas, training and participation"]),
    ("Closing: Start Small, Scale Fast", ["Select one process with clear losses and measurable potential.", "Engage operators and owners from the beginning.", "Measure both productivity and environmental results.", "Make successful improvements the new standard.", "Green Productivity is a continuous journey—not a one-time project."]),
]

def add_bg(slide, color=WHITE):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    shape.fill.solid(); shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    slide.shapes._spTree.remove(shape._element)
    slide.shapes._spTree.insert(2, shape._element)

def add_text(slide, text, x, y, w, h, size, color=DARK, bold=False, align=None):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True
    p = tf.paragraphs[0]; p.text = text
    p.font.name = 'Aptos'; p.font.size = Pt(size); p.font.bold = bold; p.font.color.rgb = color
    if align: p.alignment = align
    return box

for i, (title, bullets) in enumerate(slides):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    add_bg(slide, LIGHT if i == 0 else WHITE)
    # accent bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.22), prs.slide_height)
    bar.fill.solid(); bar.fill.fore_color.rgb = GREEN; bar.line.fill.background()
    if i == 0:
        add_text(slide, "GREEN BUSINESS  |  PRACTICAL GUIDE", 1.0, 1.0, 8, .4, 16, GREEN, True)
        add_text(slide, title, 1.0, 2.0, 11, 1.0, 42, DARK, True)
        add_text(slide, bullets[0], 1.05, 3.3, 10.8, .6, 22, GRAY)
        add_text(slide, bullets[1], 1.05, 4.15, 10.8, .6, 18, GREEN, True)
        circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(10.8), Inches(5.4), Inches(1.2), Inches(1.2))
        circle.fill.solid(); circle.fill.fore_color.rgb = ACCENT; circle.line.fill.background()
        add_text(slide, "G+P", 10.8, 5.78, 1.2, .3, 18, WHITE, True, PP_ALIGN.CENTER)
    else:
        add_text(slide, f"{i:02d}", 1.0, .65, 1, .35, 14, GREEN, True)
        add_text(slide, title, 1.0, 1.05, 11.2, .7, 30, DARK, True)
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.9), Inches(1.2), Inches(.08))
        line.fill.solid(); line.fill.fore_color.rgb = ACCENT; line.line.fill.background()
        y = 2.35
        for bullet in bullets:
            add_text(slide, "●", 1.05, y, .25, .35, 17, GREEN, True)
            add_text(slide, bullet, 1.45, y-.02, 10.7, .55, 20, GRAY)
            y += .72
        add_text(slide, "Green Productivity", 1.0, 7.05, 4, .2, 10, GREEN, True)
        add_text(slide, f"{i+1} / {len(slides)}", 11.5, 7.05, 1, .2, 10, GRAY, False, PP_ALIGN.RIGHT)

prs.save('Green_Productivity.pptx')
print('Created Green_Productivity.pptx')
