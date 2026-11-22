#!/usr/bin/env python3
"""
Digital Diagnostic Questionnaire - Report Generator
Generates comprehensive assessment reports in MS Word (.docx) and PDF formats
with radar charts, analysis, and improvement recommendations.
"""

import os
import sys
import json
import requests
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

# Visualization
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Polygon
from matplotlib.collections import PatchCollection

# Document generation
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# PDF generation
try:
    from docx2pdf import convert
    HAS_DOCX2PDF = True
except ImportError:
    HAS_DOCX2PDF = False
    print("Warning: docx2pdf not available. Install with: pip install docx2pdf")

try:
    from fpdf import FPDF, XPos, YPos
    HAS_FPDF = True
except ImportError:
    HAS_FPDF = False
    print("Warning: fpdf2 not available. Install with: pip install fpdf2")


# ============================================================
# Data Models
# ============================================================

@dataclass
class QuestionResponse:
    question_key: str
    question_text: str
    answer: Any
    answer_type: str
    section: str

@dataclass
class SectionScore:
    section_id: str
    section_title: str
    icon: str
    score: float  # 0-100
    answered: int
    total: int
    responses: List[QuestionResponse]


# ============================================================
# Scoring Logic
# ============================================================

class ScoringEngine:
    """Calculate scores for each questionnaire section."""
    
    # Question weights and scoring rules per section
    SCORING_RULES = {
        'company_profile': {
            'type': 'completion',
            'weight': 1.0
        },
        'swot': {
            'type': 'rating_based',
            'rating_questions': [
                'strengths_brand_reputation',
                'strengths_financial_resources',
                'strengths_talent',
                'strengths_operational_efficiency',
                'strengths_customer_loyalty',
                'strengths_supply_chain',
                'weaknesses_legacy_systems',
                'weaknesses_financial_constraints',
                'weaknesses_innovation_pipeline',
                'weaknesses_org_structure',
                'weaknesses_data_analytics',
                'threats_supply_chain',
                'threats_technology_disruption',
                'threats_talent_shortage',
                'threats_cybersecurity',
                'swot_strategic_fit',
            ],
            'invert_weakness_threat': True,
            'weight': 1.5
        },
        'strategic_planning': {
            'type': 'rating_based',
            'rating_questions': [
                'vision_statement',
                'mission_statement',
                'core_values',
                'strategic_horizon',
                'strategic_priorities',
                'kpis_defined',
                'strategy_review_frequency',
                'okr_adoption',
                'resource_allocation',
                'strategy_communication',
                'scenario_planning',
                'competitive_intelligence',
            ],
            'weight': 1.3
        },
        'production_management': {
            'type': 'rating_based',
            'rating_questions': [
                'prod_capacity_utilization',
                'prod_lean_adoption',
                'prod_quality_systems',
                'prod_oee_tracking',
                'prod_maintenance_strategy',
                'prod_inventory_management',
                'prod_supply_chain_integration',
                'prod_digital_manufacturing',
                'prod_sustainability',
                'prod_workforce_skills',
            ],
            'weight': 1.2
        },
        'sales_marketing': {
            'type': 'rating_based',
            'rating_questions': [
                'sales_strategy_clarity',
                'sales_process_maturity',
                'sales_crm_adoption',
                'sales_pipeline_visibility',
                'sales_forecasting_accuracy',
                'sales_team_performance',
                'marketing_strategy_alignment',
                'marketing_brand_positioning',
                'marketing_digital_presence',
                'marketing_lead_generation',
                'marketing_customer_insights',
                'marketing_roi_measurement',
            ],
            'weight': 1.2
        },
        'rd_innovation': {
            'type': 'rating_based',
            'rating_questions': [
                'rd_strategy_alignment',
                'rd_investment_level',
                'rd_process_maturity',
                'rd_portfolio_management',
                'rd_collaboration',
                'rd_ip_management',
                'rd_talent_capabilities',
                'rd_technology_scanning',
                'rd_innovation_culture',
                'rd_commercialization',
            ],
            'weight': 1.1
        },
        'productivity': {
            'type': 'rating_based',
            'rating_questions': [
                'prod_labor_productivity',
                'prod_automation_level',
                'prod_process_standardization',
                'prod_continuous_improvement',
                'prod_performance_measurement',
                'prod_skill_development',
                'prod_employee_engagement',
                'prod_knowledge_management',
                'prod_cross_functional_collab',
                'prod_change_management',
            ],
            'weight': 1.1
        },
        'waste_management': {
            'type': 'rating_based',
            'rating_questions': [
                'waste_reduction_strategy',
                'waste_circular_initiatives',
                'waste_material_efficiency',
                'waste_energy_efficiency',
                'waste_water_management',
                'waste_emissions_tracking',
                'waste_supplier_engagement',
                'waste_regulatory_compliance',
                'waste_reporting_transparency',
                'waste_innovation',
            ],
            'weight': 1.0
        },
        'bcg': {
            'type': 'rating_based',
            'rating_questions': [
                'bcg_bioeconomy_adoption',
                'bcg_circular_economy',
                'bcg_green_economy',
                'bcg_integration_governance',
                'bcg_stakeholder_engagement',
                'bcg_investment_allocation',
                'bcg_impact_measurement',
                'bcg_policy_alignment',
                'bcg_innovation_ecosystem',
                'bcg_scaling_potential',
            ],
            'weight': 1.0
        },
        'oee': {
            'type': 'rating_based',
            'rating_questions': [
                'oee_availability',
                'oee_performance',
                'oee_quality',
                'oee_overall_score',
                'oee_tpm_maturity',
                'oee_loss_analysis',
                'oee_data_collection',
                'oee_continuous_improvement',
                'oee_operator_involvement',
                'oee_management_support',
            ],
            'weight': 1.0
        },
    }
    
    # Rating scale mappings for select questions
    RATING_SCALES = {
        # 5-point scales
        'Excellent': 100, 'Good': 75, 'Adequate': 50, 'Limited': 25, 'Critical': 0,
        'Very Strong': 100, 'Strong': 75, 'Moderate': 50, 'Weak': 25, 'Very Weak': 0,
        'Industry Leader': 100, 'Above Average': 75, 'Average': 50, 'Below Average': 25, 'Lagging': 0,
        'Very High (>90%)': 100, 'High (70-90%)': 75, 'Moderate (50-70%)': 50, 'Low (30-50%)': 25, 'Very Low (<30%)': 0,
        'Strong Pipeline': 100, 'Adequate': 75, 'Limited': 50, 'Weak': 25, 'Non-existent': 0,
        'Agile': 100, 'Functional': 75, 'Some Silos': 50, 'Heavy Silos': 25, 'Dysfunctional': 0,
        'Advanced': 100, 'Developing': 75, 'Basic': 50, 'Minimal': 25, 'None': 0,
        'Minimal': 100, 'Moderate': 75, 'Significant': 50, 'Severe': 25, 'Critical': 0,
        'None': 100, 'Minor': 75, 'Moderate': 50, 'Significant': 25, 'Severe': 0,
        'Well Protected': 100, 'Adequate': 75, 'Some Gaps': 50, 'Significant Risk': 25, 'Critical Risk': 0,
        'Very Low': 100, 'Low': 75, 'Moderate': 50, 'High': 25, 'Very High': 0,
        'Not an Issue': 100, 'Minor': 75, 'Moderate': 50, 'Significant': 25, 'Critical': 0,
        'Clearly Defined & Communicated': 100, 'Defined but Not Well Communicated': 75, 'In Development': 50, 'Outdated/Needs Revision': 25, 'None': 0,
        'Defined, Lived & Measured': 100, 'Defined & Communicated': 75, 'Defined but Not Embedded': 50, 'In Development': 25, 'None/Generic': 0,
        'Specific, Measurable, Owned & Timed': 100, 'Specific & Measurable': 75, 'Defined but Not Fully Measured': 50, 'High-level Only': 25, 'Not Defined': 0,
        'Fully Defined & Cascaded': 100, 'Partially Defined': 75, 'Defined but Not Cascaded': 50, 'Not Defined': 0,
        'Monthly': 100, 'Quarterly': 80, 'Semi-annually': 60, 'Annually': 40, 'Ad-hoc Only': 20,
        # 10-point rating (1-10) -> multiply by 10
    }
    
    def __init__(self):
        pass
    
    def score_answer(self, question_key: str, answer: Any, answer_type: str) -> Optional[float]:
        """Score a single answer (0-100). Returns None if not scorable."""
        if answer is None or answer == '' or (isinstance(answer, list) and len(answer) == 0):
            return None
        
        # Rating type questions (1-10 scale)
        if answer_type == 'rating':
            try:
                val = float(answer)
                return max(0, min(100, val * 10))  # 1-10 -> 0-100
            except (ValueError, TypeError):
                return None
        
        # Select/radio questions with predefined scales
        if answer_type in ['select', 'radio']:
            if isinstance(answer, str) and answer in self.RATING_SCALES:
                return self.RATING_SCALES[answer]
            # Try case-insensitive match
            for k, v in self.RATING_SCALES.items():
                if k.lower() == str(answer).lower():
                    return v
        
        # Multiselect - score based on count (normalized)
        if answer_type == 'multiselect' and isinstance(answer, list):
            # This is more qualitative, return completion-based score
            return min(100, len(answer) * 10)  # Rough heuristic
        
        # Text/number/email/url - completion based
        if answer_type in ['text', 'number', 'email', 'url', 'tel', 'textarea']:
            return 100 if answer and str(answer).strip() else 0
        
        return None
    
    def _keyword_score(self, answer: Any) -> Optional[float]:
        """Heuristic score for answer text not found in RATING_SCALES."""
        a = str(answer).strip().lower()
        tiers = [
            (100, ['world class', 'fully implemented', 'yes, regularly', 'formal', 'excellent', 'optimized', 'predictive', 'fully']),
            (75, ['advanced', 'good', 'strong', 'regular', 'integrated', 'preventive', 'condition-based', 'rcm', 'tpm']),
            (50, ['intermediate', 'pilot', 'occasionally', 'fair', 'moderate', 'annual', 'partial', 'developing', 'basic']),
            (25, ['planning to', 'rarely', 'ad-hoc', 'ad hoc', 'weak', 'poor', 'high', 'just starting', 'reactive', 'manual']),
            (0, ['not using', 'never', 'not implemented', 'none', 'not systematic', 'non-existent', 'unknown', 'excessive']),
        ]
        for value, words in tiers:
            if any(w in a for w in words):
                return value
        return None
    
    def calculate_section_score(self, section_id: str, responses: List[QuestionResponse]) -> Tuple[float, int, int]:
        """Calculate section score. Returns (score, answered_count, total_scorable)."""
        rules = self.SCORING_RULES.get(section_id, {'type': 'completion'})
        
        if rules['type'] == 'completion':
            # Simple completion rate
            total = len(responses)
            answered = sum(1 for r in responses if r.answer not in [None, '', []] and 
                          not (isinstance(r.answer, list) and len(r.answer) == 0))
            return (answered / total * 100) if total > 0 else 0, answered, total
        
        elif rules['type'] == 'rating_based':
            invert = rules.get('invert_weakness_threat', False)
            
            scores = []
            answered = 0
            total_scorable = len(responses)
            
            # Use every question in the section (the hard-coded key list did not
            # match the real question keys, which produced 0 score / 0 completion).
            for r in responses:
                if r.answer in (None, '') or (isinstance(r.answer, list) and len(r.answer) == 0):
                    continue
                answered += 1
                if r.answer_type not in ('rating', 'select', 'radio'):
                    continue
                score = self.score_answer(r.question_key, r.answer, r.answer_type)
                if score is None:
                    score = self._keyword_score(r.answer)
                if score is None:
                    continue
                # Invert weakness/threat scores (higher = better)
                if invert and ('weakness' in r.question_key or 'threat' in r.question_key):
                    score = 100 - score
                scores.append(score)
            
            if total_scorable == 0:
                return 0, 0, 0
            if not scores:
                # Nothing scorable: fall back to completion rate
                return answered / total_scorable * 100, answered, total_scorable
            
            avg_score = sum(scores) / len(scores)
            return avg_score, answered, total_scorable
        
        return 0, 0, 0
    
    def calculate_all_scores(self, sections_data: Dict[str, List[Dict]]) -> List[SectionScore]:
        """Calculate scores for all sections."""
        results = []
        
        section_meta = {
            'company_profile': ('Company Profile', '🏢'),
            'swot': ('SWOT Analysis', '🔍'),
            'strategic_planning': ('Strategic Planning', '🎯'),
            'production_management': ('Production Management', '🏭'),
            'sales_marketing': ('Sales & Marketing', '📈'),
            'rd_innovation': ('R&D and Innovation', '💡'),
            'productivity': ('Productivity', '⚡'),
            'waste_management': ('Waste Management', '♻️'),
            'bcg': ('BCG (Bio-Circular-Green Economy)', '🌱'),
            'oee': ('OEE (Overall Equipment Effectiveness)', '📐'),
        }
        
        for section_id, responses_data in sections_data.items():
            title, icon = section_meta.get(section_id, (section_id, '📋'))
            
            responses = [
                QuestionResponse(
                    question_key=r['question_key'],
                    question_text=r['question_text'],
                    answer=r['answer'],
                    answer_type=r['answer_type'],
                    section=r['section']
                )
                for r in responses_data
            ]
            
            score, answered, total = self.calculate_section_score(section_id, responses)
            
            results.append(SectionScore(
                section_id=section_id,
                section_title=title,
                icon=icon,
                score=round(score, 1),
                answered=answered,
                total=total,
                responses=responses
            ))
        
        return results


# ============================================================
# Radar Chart Generation
# ============================================================

class RadarChartGenerator:
    """Generate radar/spider charts for assessment dimensions."""
    
    def __init__(self, output_dir: str = 'charts'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_overview_radar(self, scores: List[SectionScore], company_name: str) -> str:
        """Generate overall radar chart for all sections."""
        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
        
        # Data
        labels = [s.section_title for s in scores]
        values = [s.score for s in scores]
        
        # Close the polygon
        angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
        values_closed = values + [values[0]]
        angles_closed = angles + [angles[0]]
        labels_closed = labels + [labels[0]]
        
        # Plot
        ax.plot(angles_closed, values_closed, 'o-', linewidth=2, color='#2563eb', label='Current Score')
        ax.fill(angles_closed, values_closed, alpha=0.25, color='#2563eb')
        
        # Target line (80% benchmark)
        target = [80] * (len(labels) + 1)
        ax.plot(angles_closed, target, '--', linewidth=1.5, color='#ef4444', label='Target (80%)')
        
        # Styling
        ax.set_xticks(angles)
        ax.set_xticklabels(labels, fontsize=10, fontweight='bold')
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=8)
        ax.grid(True, alpha=0.3)
        
        # Title
        plt.title(f'{company_name}\nDigital Diagnostic Assessment - Overall Scores', 
                  size=14, fontweight='bold', pad=30, color='#1e293b')
        plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=10)
        
        # Save
        filename = f"{self.output_dir}/radar_overview_{company_name.replace(' ', '_')}.png"
        plt.tight_layout()
        plt.savefig(filename, dpi=300, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return filename
    
    def generate_dimension_radar(self, section: SectionScore, company_name: str) -> str:
        """Generate detailed radar chart for a specific section."""
        # Get rating-based questions for this section
        rating_responses = [r for r in section.responses if r.answer_type == 'rating']
        
        if not rating_responses:
            return None
        
        fig, ax = plt.subplots(figsize=(9, 9), subplot_kw=dict(polar=True))
        
        labels = []
        values = []
        
        for r in rating_responses:
            # Shorten label for readability
            label = r.question_text[:40] + '...' if len(r.question_text) > 40 else r.question_text
            labels.append(label)
            
            score = ScoringEngine().score_answer(r.question_key, r.answer, r.answer_type)
            if score is not None:
                # Invert for weakness/threat
                if 'weakness' in r.question_key or 'threat' in r.question_key:
                    score = 100 - score
                values.append(score)
            else:
                values.append(0)
        
        if not values:
            plt.close()
            return None
        
        # Close polygon
        angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
        values_closed = values + [values[0]]
        angles_closed = angles + [angles[0]]
        
        # Color based on score
        avg_score = np.mean(values)
        if avg_score >= 80:
            color = '#16a34a'  # Green
        elif avg_score >= 60:
            color = '#2563eb'  # Blue
        elif avg_score >= 40:
            color = '#f59e0b'  # Amber
        else:
            color = '#ef4444'  # Red
        
        ax.plot(angles_closed, values_closed, 'o-', linewidth=2, color=color)
        ax.fill(angles_closed, values_closed, alpha=0.25, color=color)
        
        # Target
        target = [80] * (len(labels) + 1)
        ax.plot(angles_closed, target, '--', linewidth=1, color='#94a3b8', label='Target (80%)')
        
        # Styling
        ax.set_xticks(angles)
        ax.set_xticklabels(labels, fontsize=8)
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=7)
        ax.grid(True, alpha=0.3)
        
        plt.title(f'{section.icon} {section.section_title}\nScore: {section.score}%', 
                  size=12, fontweight='bold', pad=20, color='#1e293b')
        plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=8)
        
        filename = f"{self.output_dir}/radar_{section.section_id}_{company_name.replace(' ', '_')}.png"
        plt.tight_layout()
        plt.savefig(filename, dpi=300, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return filename
    
    def generate_comparison_radar(self, scores: List[SectionScore], company_name: str) -> str:
        """Generate radar comparing current vs industry benchmark."""
        fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(polar=True))
        
        labels = [s.section_title for s in scores]
        current = [s.score for s in scores]
        
        # Industry benchmarks (example values - could be configurable)
        benchmarks = {
            'Company Profile': 90,
            'SWOT Analysis': 65,
            'Strategic Planning': 70,
            'Production Management': 75,
            'Sales & Marketing': 68,
            'R&D and Innovation': 60,
            'Productivity': 72,
            'Waste Management': 55,
            'BCG (Bio-Circular-Green Economy)': 50,
            'OEE (Overall Equipment Effectiveness)': 65,
        }
        
        benchmark_values = [benchmarks.get(l, 70) for l in labels]
        
        angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
        
        # Current
        current_closed = current + [current[0]]
        angles_closed = angles + [angles[0]]
        ax.plot(angles_closed, current_closed, 'o-', linewidth=2, color='#2563eb', label='Your Score')
        ax.fill(angles_closed, current_closed, alpha=0.2, color='#2563eb')
        
        # Benchmark
        bench_closed = benchmark_values + [benchmark_values[0]]
        ax.plot(angles_closed, bench_closed, 's--', linewidth=2, color='#ef4444', label='Industry Benchmark')
        ax.fill(angles_closed, bench_closed, alpha=0.1, color='#ef4444')
        
        ax.set_xticks(angles)
        ax.set_xticklabels(labels, fontsize=10, fontweight='bold')
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=8)
        ax.grid(True, alpha=0.3)
        
        plt.title(f'{company_name}\nBenchmark Comparison', 
                  size=14, fontweight='bold', pad=30, color='#1e293b')
        plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=10)
        
        filename = f"{self.output_dir}/radar_benchmark_{company_name.replace(' ', '_')}.png"
        plt.tight_layout()
        plt.savefig(filename, dpi=300, bbox_inches='tight', facecolor='white')
        plt.close()
        
        return filename


# ============================================================
# Analysis & Recommendations Engine
# ============================================================

class AnalysisEngine:
    """Generate analysis and improvement recommendations."""
    
    # Detailed recommendations per section
    RECOMMENDATIONS = {
        'company_profile': {
            'strengths': ['Basic company information captured'],
            'gaps': ['Revenue range in THB may need conversion for international benchmarking',
                     'Ownership type impacts governance - ensure clarity'],
            'quick_wins': ['Complete all optional fields for better context',
                          'Add website for digital presence assessment'],
            'strategic': ['Align company profile with industry peers for benchmarking']
        },
        'swot': {
            'strengths': [],
            'gaps': [],
            'quick_wins': [],
            'strategic': []
        },
        'strategic_planning': {
            'strengths': ['Clear vision/mission provides direction',
                         'OKR adoption enables measurable execution'],
            'gaps': ['Strategy review frequency may be too low (annual only)',
                    'KPIs not cascaded to individual level',
                    'Scenario planning often missing'],
            'quick_wins': ['Increase strategy reviews to quarterly',
                          'Define 3-5 measurable strategic priorities',
                          'Implement basic OKR framework'],
            'strategic': ['Develop 3-5 year strategic roadmap with milestones',
                         'Build competitive intelligence capability',
                         'Integrate scenario planning into annual cycle']
        },
        'production_management': {
            'strengths': ['OEE tracking provides visibility',
                         'Lean adoption improves efficiency'],
            'gaps': ['Maintenance strategy often reactive',
                    'Digital manufacturing maturity low',
                    'Sustainability not integrated into production'],
            'quick_wins': ['Implement preventive maintenance schedule',
                          'Start OEE data collection on bottleneck equipment',
                          'Conduct 5S workplace organization'],
            'strategic': ['Deploy TPM (Total Productive Maintenance)',
                         'Invest in Industry 4.0 / IIoT capabilities',
                         'Integrate circular economy principles']
        },
        'sales_marketing': {
            'strengths': ['CRM adoption enables pipeline visibility',
                         'Digital presence supports lead generation'],
            'gaps': ['Forecasting accuracy often below 70%',
                    'Marketing ROI measurement immature',
                    'Sales-marketing alignment weak'],
            'quick_wins': ['Implement weekly pipeline reviews',
                          'Define shared MQL/SQL definitions',
                          'Set up marketing attribution tracking'],
            'strategic': ['Build account-based marketing for key accounts',
                         'Develop sales enablement program',
                         'Invest in predictive analytics for forecasting']
        },
        'rd_innovation': {
            'strengths': ['IP management protects innovations',
                         'External collaboration expands capabilities'],
            'gaps': ['R&D investment often below industry average',
                    'Commercialization success rate low',
                    'Innovation culture not systematically measured'],
            'quick_wins': ['Stage-gate process for project selection',
                          'Allocate 10-15% time for exploratory innovation',
                          'Create innovation challenge program'],
            'strategic': ['Build corporate venture / startup partnership program',
                         'Establish innovation metrics (vitality index, NPV)',
                         'Create dedicated innovation lab or CoE']
        },
        'productivity': {
            'strengths': ['Continuous improvement culture emerging',
                         'Performance measurement in place'],
            'gaps': ['Automation level below peers',
                    'Cross-functional collaboration limited',
                    'Change management capability weak'],
            'quick_wins': ['Map and eliminate top 3 process wastes',
                          'Standardize work instructions for critical processes',
                          'Launch employee suggestion system'],
            'strategic': ['Deploy automation/RPA for repetitive tasks',
                         'Build digital skills academy',
                         'Implement integrated performance management system']
        },
        'waste_management': {
            'strengths': ['Regulatory compliance baseline met',
                         'Energy efficiency initiatives started'],
            'gaps': ['Circular economy initiatives minimal',
                    'Scope 3 emissions not tracked',
                    'Supplier engagement on sustainability low'],
            'quick_wins': ['Conduct waste audit across operations',
                          'Set waste reduction targets (e.g., 20% in 2 years)',
                          'Implement energy monitoring'],
            'strategic': ['Develop circular business model pilots',
                         'Commit to science-based targets (SBTi)',
                         'Integrate ESG into procurement decisions']
        },
        'bcg': {
            'strengths': ['Awareness of BCG model growing',
                         'Some green economy initiatives'],
            'gaps': ['Bioeconomy adoption very low',
                    'Circular economy not systematic',
                    'Governance structure for BCG missing'],
            'quick_wins': ['Map current bio-based material usage',
                          'Identify circular opportunities in value chain',
                          'Assign BCG champion in leadership'],
            'strategic': ['Develop BCG transformation roadmap',
                         'Invest in bio-based R&D partnerships',
                         'Create green finance framework']
        },
        'oee': {
            'strengths': ['OEE measurement provides baseline',
                         'TPM awareness exists'],
            'gaps': ['OEE data collection often manual',
                    'Loss analysis not systematic',
                    'Operator involvement limited'],
            'quick_wins': ['Automate OEE data collection on key lines',
                          'Conduct focused improvement on top 3 losses',
                          'Train operators on basic TPM'],
            'strategic': ['Deploy autonomous maintenance program',
                         'Integrate OEE with MES/ERP',
                         'Build predictive maintenance capability']
        },
    }
    
    def __init__(self):
        pass
    
    def analyze_section(self, section: SectionScore) -> Dict[str, Any]:
        """Generate detailed analysis for a section."""
        recs = self.RECOMMENDATIONS.get(section.section_id, {})
        
        # Determine maturity level
        if section.score >= 80:
            maturity = 'Leading'
            maturity_desc = 'Best-in-class capabilities, focus on innovation and optimization'
        elif section.score >= 60:
            maturity = 'Advanced'
            maturity_desc = 'Strong capabilities, focus on refinement and scaling'
        elif section.score >= 40:
            maturity = 'Developing'
            maturity_desc = 'Basic capabilities in place, focus on strengthening fundamentals'
        else:
            maturity = 'Initial'
            maturity_desc = 'Early stage, focus on building foundational capabilities'
        
        # Priority areas (lowest scoring questions)
        rating_responses = [r for r in section.responses if r.answer_type == 'rating']
        priority_areas = []
        for r in rating_responses:
            score = ScoringEngine().score_answer(r.question_key, r.answer, r.answer_type)
            if score is not None and score < 50:
                priority_areas.append({
                    'question': r.question_text,
                    'score': score,
                    'current_answer': r.answer
                })
        
        priority_areas.sort(key=lambda x: x['score'])
        
        return {
            'section_id': section.section_id,
            'section_title': section.section_title,
            'icon': section.icon,
            'score': section.score,
            'answered': section.answered,
            'total': section.total,
            'completion_rate': round(section.answered / section.total * 100, 1) if section.total > 0 else 0,
            'maturity_level': maturity,
            'maturity_description': maturity_desc,
            'strengths': recs.get('strengths', ['Assessment completed']),
            'gaps': recs.get('gaps', ['Review responses for specific gaps']),
            'quick_wins': recs.get('quick_wins', ['Complete all unanswered questions']),
            'strategic_initiatives': recs.get('strategic', ['Develop improvement roadmap']),
            'priority_areas': priority_areas[:5]  # Top 5
        }
    
    def generate_executive_summary(self, all_analyses: List[Dict], company: Dict) -> Dict[str, Any]:
        """Generate executive summary across all sections."""
        overall_score = np.mean([a['score'] for a in all_analyses]) if all_analyses else 0
        total_answered = sum(a['answered'] for a in all_analyses)
        total_questions = sum(a['total'] for a in all_analyses)
        
        # Top 3 strengths (highest scores)
        sorted_by_score = sorted(all_analyses, key=lambda x: x['score'], reverse=True)
        top_strengths = sorted_by_score[:3]
        
        # Top 3 improvement areas (lowest scores)
        bottom_areas = sorted_by_score[-3:]
        
        # Maturity distribution
        maturity_counts = {}
        for a in all_analyses:
            m = a['maturity_level']
            maturity_counts[m] = maturity_counts.get(m, 0) + 1
        
        return {
            'company_name': company.get('name', 'Unknown'),
            'industry': company.get('industry', 'N/A'),
            'size': company.get('size', company.get('company_size', 'N/A')),
            'assessment_date': datetime.now().strftime('%B %d, %Y'),
            'overall_score': round(overall_score, 1),
            'completion_rate': round(total_answered / total_questions * 100, 1) if total_questions > 0 else 0,
            'top_strengths': [{'title': s['section_title'], 'score': s['score'], 'icon': s['icon']} for s in top_strengths],
            'improvement_areas': [{'title': s['section_title'], 'score': s['score'], 'icon': s['icon']} for s in bottom_areas],
            'maturity_distribution': maturity_counts,
            'total_sections': len(all_analyses),
            'sections_leading': maturity_counts.get('Leading', 0),
            'sections_advanced': maturity_counts.get('Advanced', 0),
            'sections_developing': maturity_counts.get('Developing', 0),
            'sections_initial': maturity_counts.get('Initial', 0),
        }


def build_summary_paragraphs(es: Dict[str, Any]) -> List[str]:
    """Executive summary narrative shared by the Word and PDF reports."""
    strengths = ', '.join(s['title'] for s in es['top_strengths']) or 'none identified'
    gaps = ', '.join(s['title'] for s in es['improvement_areas']) or 'none identified'
    score = float(es['overall_score'])
    if score >= 75:
        overall = "a high level of digital and operational maturity"
    elif score >= 50:
        overall = "a solid foundation with clear opportunities for further advancement"
    elif score >= 25:
        overall = "an early-to-developing level of maturity, with significant room for improvement"
    else:
        overall = "an initial level of maturity, indicating that foundational capabilities still need to be established"
    return [
        (f"This report presents the results of the Digital Diagnostic Assessment for {es['company_name']} "
         f"({es['industry']}, {es['size']}), conducted on {es['assessment_date']}. The assessment evaluates "
         f"{es['total_sections']} key business dimensions, including strategy, operations, production, "
         f"people and technology, and reached a completion rate of {es['completion_rate']}%. Each dimension "
         f"is scored from 0% to 100% and classified as Initial, Developing, Advanced or Leading."),
        (f"The overall score of {es['overall_score']}% reflects {overall}. Across the dimensions assessed, "
         f"{es['sections_leading']} are rated Leading, {es['sections_advanced']} Advanced, "
         f"{es['sections_developing']} Developing and {es['sections_initial']} Initial. This distribution "
         f"shows where the organisation already performs well and where capability building should be "
         f"concentrated to deliver the greatest return."),
        (f"The strongest areas are: {strengths}. These represent established practices that can be "
         f"protected and used as internal reference points when scaling improvements to other functions. "
         f"The priority improvement areas are: {gaps}. Addressing these first is expected to have the "
         f"largest impact on overall maturity."),
        ("The following pages present a combined radar view and an industry benchmark comparison, followed "
         "by a detailed analysis of each dimension with its strengths, gaps, priority focus areas, quick "
         "wins (0-3 months) and strategic initiatives (6-18 months). We recommend starting with the quick "
         "wins to build momentum, while planning the strategic initiatives in parallel."),
    ]


# ============================================================
# Word Document Generator
# ============================================================

class WordReportGenerator:
    """Generate professional MS Word report."""
    
    def __init__(self):
        self.doc = Document()
        self._setup_styles()
    
    def _setup_styles(self):
        """Configure document styles."""
        style = self.doc.styles['Normal']
        font = style.font
        font.name = 'Calibri'
        font.size = Pt(11)
        font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.line_spacing = 1.15
        
        # Heading styles
        for i in range(1, 4):
            hs = self.doc.styles[f'Heading {i}']
            hs.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)
            hs.font.name = 'Calibri'
    
    def add_cover_page(self, exec_summary: Dict):
        """Add cover page."""
        # Title
        for _ in range(4):
            self.doc.add_paragraph('')
        
        title = self.doc.add_paragraph()
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = title.add_run('Digital Diagnostic Assessment Report')
        run.bold = True
        run.font.size = Pt(28)
        run.font.color.rgb = RGBColor(0x25, 0x63, 0xeb)
        
        subtitle = self.doc.add_paragraph()
        subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = subtitle.add_run('Pre-Consulting Company Assessment')
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)
        
        self.doc.add_paragraph('')
        
        # Company name
        company = self.doc.add_paragraph()
        company.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = company.add_run(exec_summary['company_name'])
        run.bold = True
        run.font.size = Pt(22)
        run.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)
        
        self.doc.add_paragraph('')
        self.doc.add_paragraph('')
        
        # Meta info
        meta_items = [
            ('Industry', exec_summary['industry']),
            ('Company Size', exec_summary['size']),
            ('Assessment Date', exec_summary['assessment_date']),
            ('Overall Score', f"{exec_summary['overall_score']}%"),
            ('Completion Rate', f"{exec_summary['completion_rate']}%"),
        ]
        
        for label, value in meta_items:
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(f'{label}: ')
            run.font.size = Pt(12)
            run.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)
            run = p.add_run(value)
            run.bold = True
            run.font.size = Pt(12)
            run.font.color.rgb = RGBColor(0x1e, 0x29, 0x3b)
        
        self.doc.add_page_break()
    
    def add_table_of_contents(self):
        """Add table of contents placeholder."""
        self.doc.add_heading('Table of Contents', level=1)
        p = self.doc.add_paragraph()
        run = p.add_run('[Table of Contents - Right-click and select "Update Field" to refresh]')
        run.italic = True
        run.font.color.rgb = RGBColor(0x94, 0xa3, 0xb8)
        
        # Avoid injecting a custom TOC field: some Word versions reject it.
        self.doc.add_page_break()
    
    def add_executive_summary(self, exec_summary: Dict):
        """Add executive summary section."""
        self.doc.add_heading('Executive Summary', level=1)
        
        # Overview
        for para in build_summary_paragraphs(exec_summary):
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p.add_run(para).font.size = Pt(14)
        
        self.doc.add_paragraph('')
        
        # Overall score with visual
        score_table = self.doc.add_table(rows=1, cols=2)
        score_table.style = 'Table Grid'
        
        # Score cell
        cell1 = score_table.cell(0, 0)
        cell1.width = Inches(3)
        p = cell1.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(f"{exec_summary['overall_score']}%")
        run.bold = True
        run.font.size = Pt(36)
        # Color based on score
        if exec_summary['overall_score'] >= 80:
            run.font.color.rgb = RGBColor(0x16, 0xa3, 0x4a)
        elif exec_summary['overall_score'] >= 60:
            run.font.color.rgb = RGBColor(0x25, 0x63, 0xeb)
        elif exec_summary['overall_score'] >= 40:
            run.font.color.rgb = RGBColor(0xf5, 0x9e, 0x0b)
        else:
            run.font.color.rgb = RGBColor(0xef, 0x44, 0x44)
        
        # Description cell
        cell2 = score_table.cell(0, 1)
        p = cell2.paragraphs[0]
        maturity_desc = self._get_maturity_description(exec_summary['overall_score'])
        p.add_run(f'Overall Maturity: {maturity_desc}').bold = True
        level_notes = {
            'Leading': 'Best-in-class capabilities; focus on innovation and sustaining the lead.',
            'Advanced': 'Strong capabilities; refine processes and scale good practice.',
            'Developing': 'Basic capabilities are in place; strengthen the fundamentals.',
            'Initial': 'Early stage; focus on building foundational capabilities.',
        }
        p.add_run(f"\n\n{level_notes.get(maturity_desc, '')}")
        
        self.doc.add_paragraph('')
        
        # Maturity Distribution
        self.doc.add_heading('Maturity Distribution', level=2)
        
        dist_table = self.doc.add_table(rows=5, cols=3)
        dist_table.style = 'Table Grid'
        headers = ['Maturity Level', 'Sections', 'Description']
        for i, h in enumerate(headers):
            cell = dist_table.cell(0, i)
            cell.text = h
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.bold = True
        
        levels = [
            ('Leading', exec_summary['sections_leading'], 'Best-in-class, focus on innovation'),
            ('Advanced', exec_summary['sections_advanced'], 'Strong capabilities, refine & scale'),
            ('Developing', exec_summary['sections_developing'], 'Basic capabilities, strengthen fundamentals'),
            ('Initial', exec_summary['sections_initial'], 'Early stage, build foundations'),
        ]
        
        colors = [RGBColor(0x16, 0xa3, 0x4a), RGBColor(0x25, 0x63, 0xeb), 
                  RGBColor(0xf5, 0x9e, 0x0b), RGBColor(0xef, 0x44, 0x44)]
        
        for row_idx, (level, count, desc) in enumerate(levels, 1):
            cell = dist_table.cell(row_idx, 0)
            cell.text = level
            for p in cell.paragraphs:
                for run in p.runs:
                    run.font.color.rgb = colors[row_idx - 1]
                    run.bold = True
            dist_table.cell(row_idx, 1).text = str(count)
            dist_table.cell(row_idx, 2).text = desc
        
        self.doc.add_paragraph('')
        
        # Top Strengths
        self.doc.add_heading('Key Strengths', level=2)
        for s in exec_summary['top_strengths']:
            p = self.doc.add_paragraph(style='List Bullet')
            run = p.add_run(f"{s['icon']} {s['title']} ")
            run.bold = True
            p.add_run(f"— Score: {s['score']}%")
        
        # Improvement Areas
        self.doc.add_heading('Priority Improvement Areas', level=2)
        for s in exec_summary['improvement_areas']:
            p = self.doc.add_paragraph(style='List Bullet')
            run = p.add_run(f"{s['icon']} {s['title']} ")
            run.bold = True
            run.font.color.rgb = RGBColor(0xef, 0x44, 0x44)
            p.add_run(f"— Score: {s['score']}%")
        
        self.doc.add_page_break()
    
    def _get_maturity_description(self, score: float) -> str:
        if score >= 80: return 'Leading'
        elif score >= 60: return 'Advanced'
        elif score >= 40: return 'Developing'
        return 'Initial'
    
    def add_section_detail(self, analysis: Dict, chart_path: Optional[str] = None):
        """Add detailed section analysis."""
        self.doc.add_heading(f"{analysis['icon']} {analysis['section_title']}", level=1)
        
        # Score summary table
        score_table = self.doc.add_table(rows=1, cols=4)
        score_table.style = 'Table Grid'
        
        headers = ['Metric', 'Value', 'Maturity', 'Completion']
        for i, h in enumerate(headers):
            cell = score_table.cell(0, i)
            cell.text = h
            for p in cell.paragraphs:
                for run in p.runs:
                    run.bold = True
        
        row = score_table.add_row()
        row.cells[0].text = 'Score'
        row.cells[1].text = f"{analysis['score']}%"
        row.cells[2].text = analysis['maturity_level']
        row.cells[3].text = f"{analysis['completion_rate']}%"
        
        # Color maturity
        maturity_colors = {
            'Leading': RGBColor(0x16, 0xa3, 0x4a),
            'Advanced': RGBColor(0x25, 0x63, 0xeb),
            'Developing': RGBColor(0xf5, 0x9e, 0x0b),
            'Initial': RGBColor(0xef, 0x44, 0x44),
        }
        for p in row.cells[2].paragraphs:
            for run in p.runs:
                run.font.color.rgb = maturity_colors.get(analysis['maturity_level'], RGBColor(0x33, 0x41, 0x55))
                run.bold = True
        
        self.doc.add_paragraph('')
        
        # Radar chart
        if chart_path and os.path.exists(chart_path):
            self.doc.add_picture(chart_path, width=Inches(5.5))
            self.doc.add_paragraph('')
        
        # Maturity description
        p = self.doc.add_paragraph()
        run = p.add_run('Maturity Assessment: ')
        run.bold = True
        p.add_run(analysis['maturity_description'])
        
        self.doc.add_paragraph('')
        
        # Strengths
        if analysis['strengths']:
            self.doc.add_heading('Strengths', level=2)
            for s in analysis['strengths']:
                self.doc.add_paragraph(s, style='List Bullet')
        
        # Gaps
        if analysis['gaps']:
            self.doc.add_heading('Identified Gaps', level=2)
            for g in analysis['gaps']:
                self.doc.add_paragraph(g, style='List Bullet')
        
        # Priority Areas (lowest scoring questions)
        if analysis['priority_areas']:
            self.doc.add_heading('Priority Focus Areas (Lowest Scores)', level=2)
            pa_table = self.doc.add_table(rows=1, cols=3)
            pa_table.style = 'Table Grid'
            for i, h in enumerate(['Question', 'Score', 'Current Response']):
                pa_table.cell(0, i).text = h
                for p in pa_table.cell(0, i).paragraphs:
                    for run in p.runs:
                        run.bold = True
            
            for pa in analysis['priority_areas']:
                row = pa_table.add_row()
                row.cells[0].text = pa['question'][:80]
                row.cells[1].text = f"{pa['score']}%"
                row.cells[2].text = str(pa['current_answer'])[:100]
        
        self.doc.add_paragraph('')
        
        # Quick Wins
        if analysis['quick_wins']:
            self.doc.add_heading('Quick Wins (0-3 Months)', level=2)
            for qw in analysis['quick_wins']:
                self.doc.add_paragraph(qw, style='List Bullet')
        
        # Strategic Initiatives
        if analysis['strategic_initiatives']:
            self.doc.add_heading('Strategic Initiatives (6-18 Months)', level=2)
            for si in analysis['strategic_initiatives']:
                self.doc.add_paragraph(si, style='List Bullet')
        
        self.doc.add_page_break()
    
    def add_overview_radar(self, chart_path: str):
        """Add overall radar chart page."""
        self.doc.add_heading('Overall Assessment Radar', level=1)
        if os.path.exists(chart_path):
            self.doc.add_picture(chart_path, width=Inches(3.5))
            self.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        # No page break: benchmark chart shares this page
    
    def add_benchmark_radar(self, chart_path: str):
        """Add benchmark comparison radar (same page as the overview radar)."""
        self.doc.add_heading('Industry Benchmark Comparison', level=1)
        if os.path.exists(chart_path):
            self.doc.add_picture(chart_path, width=Inches(3.5))
            self.doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
        self.doc.add_page_break()
    
    def save(self, filepath: str):
        """Save the document."""
        self.doc.save(filepath)


# ============================================================
# PDF Report Generator (FPDF fallback)
# ============================================================

class StyledPDF(FPDF):
    """Small visual system shared by every PDF page."""
    def header(self):
        if self.page_no() > 1:
            self.set_draw_color(226, 232, 240)
            self.line(18, 15, self.w - 18, 15)
            self.set_font('Thai', '', 10)
            self.set_text_color(100, 116, 139)
            self.set_y(7)
            self.set_x(18)
            self.cell(self.w - 36, 6, 'DIGITAL DIAGNOSTIC  /  ASSESSMENT REPORT', align='R')
            self.set_y(20)

    def footer(self):
        self.set_y(-15)
        self.set_draw_color(226, 232, 240)
        self.line(18, self.get_y(), self.w - 18, self.get_y())
        self.set_font('Thai', '', 10)
        self.set_text_color(100, 116, 139)
        self.set_x(18)
        self.cell(self.w - 36, 8, f'Confidential  •  Page {self.page_no()}', align='C')


class PDFReportGenerator:
    """Generate PDF report using FPDF."""
    
    # Emoji to text fallback for FPDF (Helvetica font does not support emoji)
    EMOJI_MAP = {
        '🏢': '[Company]', '🔍': '[SWOT]', '🎯': '[Strategy]', '🏭': '[Production]',
        '📈': '[Sales]', '💡': '[R&D]', '⚡': '[Productivity]', '♻️': '[Waste]',
        '🌱': '[BCG]', '📐': '[OEE]', '✅': '[OK]', '❌': '[Error]', '⚠️': '[Warning]',
    }
    
    def __init__(self):
        if not HAS_FPDF:
            raise ImportError("fpdf2 not installed. Run: pip install fpdf2")
        self.pdf = StyledPDF()
        self.pdf.set_margins(18, 25, 18)
        self.pdf.set_auto_page_break(auto=True, margin=22)
        self._setup_thai_font()
    
    def _setup_thai_font(self):
        """Try to register a Thai-capable TTF font from Windows (all styles)."""
        import os
        # Map FPDF style -> font file suffix for common Windows fonts
        # TH SarabunPSK is the preferred Thai font; fall back to Tahoma/Arial if not installed
        font_candidates = [
            # (regular, bold, italic, bold_italic)
            # TH SarabunPSK (preferred Thai font)
            (
                r'C:\Windows\Fonts\THSarabunPSK.ttf',
                r'C:\Windows\Fonts\THSarabunPSK-Bold.ttf',
                r'C:\Windows\Fonts\THSarabunPSK-Italic.ttf',
                r'C:\Windows\Fonts\THSarabunPSK-BoldItalic.ttf',
            ),
            # Local fonts folder (bundled with app)
            (
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'THSarabunPSK.ttf'),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'THSarabunPSK-Bold.ttf'),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'THSarabunPSK-Italic.ttf'),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts', 'THSarabunPSK-BoldItalic.ttf'),
            ),
            # Fallback: Tahoma
            (
                r'C:\Windows\Fonts\tahoma.ttf',
                r'C:\Windows\Fonts\tahomabd.ttf',
                None,
                None,
            ),
            # Fallback: Arial
            (
                r'C:\Windows\Fonts\arial.ttf',
                r'C:\Windows\Fonts\arialbd.ttf',
                r'C:\Windows\Fonts\ariali.ttf',
                r'C:\Windows\Fonts\arialbi.ttf',
            ),
        ]
        for regular, bold, italic, bold_italic in font_candidates:
            if not os.path.exists(regular):
                continue
            try:
                self.pdf.add_font('Thai', '', regular)
                if bold and os.path.exists(bold):
                    self.pdf.add_font('Thai', 'B', bold)
                if italic and os.path.exists(italic):
                    self.pdf.add_font('Thai', 'I', italic)
                if bold_italic and os.path.exists(bold_italic):
                    self.pdf.add_font('Thai', 'BI', bold_italic)
                self._thai_font = 'Thai'
                return
            except Exception:
                continue
        self._thai_font = 'Helvetica'
    
    def _clean_text(self, text: str) -> str:
        """Replace emoji and unsupported characters with plain text equivalents."""
        if not isinstance(text, str):
            text = str(text)
        for emoji, replacement in self.EMOJI_MAP.items():
            text = text.replace(emoji, replacement)
        return text
    
    def add_cover_page(self, exec_summary: Dict):
        self.pdf.add_page()
        # Branded cover band
        self.pdf.set_fill_color(37, 99, 235)
        self.pdf.rect(0, 0, self.pdf.w, 14, 'F')
        self.pdf.set_fill_color(219, 234, 254)
        self.pdf.rect(0, 14, self.pdf.w, 3, 'F')
        self.pdf.ln(42)
        
        # Title
        self.pdf.set_font(self._thai_font, 'B', 20)
        self.pdf.set_text_color(37, 99, 235)
        self.pdf.cell(0, 12, 'Digital Diagnostic Assessment Report', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(100, 116, 139)
        self.pdf.cell(0, 10, 'Pre-Consulting Company Assessment', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        self.pdf.ln(12)
        
        # Company
        self.pdf.set_font(self._thai_font, 'B', 14)
        self.pdf.set_text_color(30, 41, 59)
        self.pdf.cell(0, 12, exec_summary['company_name'], new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        
        self.pdf.ln(10)
        
        # Meta
        meta = [
            ('Industry', exec_summary['industry']),
            ('Company Size', exec_summary['size']),
            ('Assessment Date', exec_summary['assessment_date']),
            ('Overall Score', f"{exec_summary['overall_score']}%"),
            ('Completion Rate', f"{exec_summary['completion_rate']}%"),
        ]
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(100, 116, 139)
        for label, value in meta:
            self.pdf.cell(0, 7, f'{label}: {value}', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')

        # Executive summary (first page)
        self.pdf.ln(6)
        self.pdf.set_text_color(30, 41, 59)
        self.pdf.set_font(self._thai_font, 'B', 13)
        self.pdf.cell(0, 8, 'Executive Summary', new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C')
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(51, 65, 85)
        summary_text = (f"This report presents the results of the Digital Diagnostic Assessment for "
                        f"{exec_summary['company_name']}, conducted on {exec_summary['assessment_date']}. "
                        f"The assessment evaluates {exec_summary['total_sections']} key business dimensions "
                        f"with an overall completion rate of {exec_summary['completion_rate']}%.")
        self.pdf.multi_cell(self.pdf.w - self.pdf.l_margin - self.pdf.r_margin, 6, summary_text, align='C')
    
    def add_executive_summary(self, exec_summary: Dict):
        self.pdf.add_page()
        self.pdf.set_font(self._thai_font, 'B', 13)
        self.pdf.set_text_color(30, 41, 59)
        self.pdf.cell(0, 9, 'Executive Summary', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.pdf.ln(2)
        
        # Overall score box (overview text is already on the cover page)
        self.pdf.set_fill_color(37, 99, 235)
        self.pdf.set_text_color(255, 255, 255)
        self.pdf.set_font(self._thai_font, 'B', 14)
        self.pdf.cell(0, 10, f"Overall Score: {exec_summary['overall_score']}%", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align='C', fill=True)
        self.pdf.ln(4)
        
        # Descriptive narrative (about half a page)
        full_w = self.pdf.w - self.pdf.l_margin - self.pdf.r_margin
        paragraphs = build_summary_paragraphs(exec_summary)
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(51, 65, 85)
        for para in paragraphs:
            self.pdf.set_x(self.pdf.l_margin)
            self.pdf.multi_cell(full_w, 6, para, align='J', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.pdf.ln(2)
        self.pdf.ln(2)
        
        # Maturity distribution
        self.pdf.set_font(self._thai_font, 'B', 13)
        self.pdf.set_text_color(30, 41, 59)
        self.pdf.cell(0, 8, 'Maturity Distribution', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        levels = [
            ('Leading', exec_summary['sections_leading'], (22, 163, 74)),
            ('Advanced', exec_summary['sections_advanced'], (37, 99, 235)),
            ('Developing', exec_summary['sections_developing'], (245, 158, 11)),
            ('Initial', exec_summary['sections_initial'], (239, 68, 68)),
        ]
        
        # One compact row: four equal columns
        col_w = (self.pdf.w - self.pdf.l_margin - self.pdf.r_margin) / len(levels)
        for i, (level, count, color) in enumerate(levels):
            self.pdf.set_font(self._thai_font, 'B', 12)
            self.pdf.set_text_color(*color)
            last = i == len(levels) - 1
            self.pdf.cell(col_w, 8, f"{level}: {count}",
                          new_x=XPos.LMARGIN if last else XPos.RIGHT,
                          new_y=YPos.NEXT if last else YPos.TOP, align='C')
        
        self.pdf.ln(3)
        
        # Strengths
        self.pdf.set_font(self._thai_font, 'B', 13)
        self.pdf.set_text_color(30, 41, 59)
        self.pdf.cell(0, 8, 'Key Strengths', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(51, 65, 85)
        for s in exec_summary['top_strengths']:
            line = f"  - {self._clean_text(s['icon'])} {s['title']} (Score: {s['score']}%)"
            self.pdf.multi_cell(self.pdf.w - self.pdf.l_margin - self.pdf.r_margin, 6, line,
                                new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.pdf.ln(2)
        
        # Improvement areas
        self.pdf.set_font(self._thai_font, 'B', 13)
        self.pdf.set_text_color(239, 68, 68)
        self.pdf.cell(0, 8, 'Priority Improvement Areas', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.pdf.set_font(self._thai_font, '', 11)
        self.pdf.set_text_color(51, 65, 85)
        for s in exec_summary['improvement_areas']:
            line = f"  - {self._clean_text(s['icon'])} {s['title']} (Score: {s['score']}%)"
            self.pdf.multi_cell(self.pdf.w - self.pdf.l_margin - self.pdf.r_margin, 6, line,
                                new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    def _release_margin(self, chart_bottom: float, base_margin: float, start_page: int):
        """Restore the full-width right margin once we are below the side chart (or on a new page)."""
        if self.pdf.page_no() != start_page or self.pdf.get_y() >= chart_bottom:
            self.pdf.set_right_margin(base_margin)
            return True
        return False
    
    def add_section_detail(self, analysis: Dict, chart_path: Optional[str] = None):
        pdf = self.pdf
        base_margin = 18
        has_chart = bool(chart_path and os.path.exists(chart_path))
        chart_w = 58
        chart_h = self._image_height(chart_path, chart_w) if has_chart else 0
        
        # Start a new page only when the header + chart block would not fit here
        needed = 10 + 9 + max(chart_h, 45) + 6
        if pdf.page_no() == 0 or self._remaining_height() < needed:
            pdf.add_page()
        else:
            pdf.ln(6)
        
        # Section title
        pdf.set_font(self._thai_font, 'B', 13)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 9, f"{self._clean_text(analysis['icon'])} {analysis['section_title']}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_draw_color(37, 99, 235)
        pdf.set_line_width(0.8)
        pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - base_margin, pdf.get_y())
        pdf.ln(3)
        
        # Score summary
        maturity_colors = {
            'Leading': (22, 163, 74),
            'Advanced': (37, 99, 235),
            'Developing': (245, 158, 11),
            'Initial': (239, 68, 68),
        }
        color = maturity_colors.get(analysis['maturity_level'], (51, 65, 85))
        
        pdf.set_text_color(51, 65, 85)
        pdf.set_font(self._thai_font, 'B', 13)
        pdf.cell(22, 7, 'Score: ')
        pdf.set_font(self._thai_font, '', 11)
        pdf.cell(20, 7, f"{analysis['score']}%")
        pdf.set_font(self._thai_font, 'B', 13)
        pdf.cell(26, 7, 'Maturity: ')
        pdf.set_text_color(*color)
        pdf.cell(32, 7, analysis['maturity_level'])
        pdf.set_text_color(51, 65, 85)
        pdf.set_font(self._thai_font, '', 11)
        pdf.cell(0, 7, f"Completion: {analysis['completion_rate']}%", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(2)
        
        # Chart on the right; text flows in the column to its left
        start_page = pdf.page_no()
        chart_bottom = 0
        if has_chart:
            y0 = pdf.get_y()
            pdf.image(chart_path, x=pdf.w - base_margin - chart_w, y=y0, w=chart_w)
            chart_bottom = y0 + chart_h
            pdf.set_xy(pdf.l_margin, y0)
            pdf.set_right_margin(base_margin + chart_w + 4)
        
        def block(title, lines):
            if has_chart:
                self._release_margin(chart_bottom, base_margin, start_page)
            pdf.set_x(pdf.l_margin)
            pdf.set_font(self._thai_font, 'B', 13)
            pdf.set_text_color(30, 41, 59)
            pdf.cell(0, 7, title, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font(self._thai_font, '', 11)
            pdf.set_text_color(51, 65, 85)
            for line in lines:
                pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin, 6, line,
                               new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.ln(1.5)
        
        block('Maturity Assessment:', [analysis['maturity_description']])
        if analysis['strengths']:
            block('Strengths:', [f"  - {s}" for s in analysis['strengths']])
        if analysis['gaps']:
            block('Identified Gaps:', [f"  - {g}" for g in analysis['gaps']])
        if analysis['priority_areas']:
            block('Priority Focus Areas:',
                  [f"  - {pa['question']} (Score: {pa['score']}%)" for pa in analysis['priority_areas']])
        if analysis['quick_wins']:
            block('Quick Wins (0-3 Months):', [f"  - {qw}" for qw in analysis['quick_wins']])
        if analysis['strategic_initiatives']:
            block('Strategic Initiatives (6-18 Months):', [f"  - {si}" for si in analysis['strategic_initiatives']])
        
        # Always restore full width; if the chart is taller than the text, skip below it
        pdf.set_right_margin(base_margin)
        if has_chart and pdf.page_no() == start_page and pdf.get_y() < chart_bottom:
            pdf.set_y(chart_bottom)
        pdf.set_x(pdf.l_margin)
    

    def _remaining_height(self) -> float:
        """Vertical space left on the current page before auto page break."""
        return self.pdf.h - self.pdf.b_margin - self.pdf.get_y()
    
    def _image_height(self, path: str, width: float) -> float:
        """Rendered height of an image scaled to the given width."""
        try:
            from PIL import Image
            with Image.open(path) as im:
                return width * im.height / im.width
        except Exception:
            return width  # radar charts are roughly square
    
    def add_radar_pair(self, overview_path: str, benchmark_path: str):
        """Overall radar and industry benchmark side by side.
        Stays on the current page if it fits, otherwise starts a new page."""
        avail = self.pdf.w - self.pdf.l_margin - self.pdf.r_margin
        gap = 6
        col_w = (avail - gap) / 2
        charts = [
            ('Overall Assessment Radar', overview_path),
            ('Industry Benchmark Comparison', benchmark_path),
        ]
        img_h = max((self._image_height(p, col_w) for _, p in charts if os.path.exists(p)),
                    default=col_w)
        heading_h = 9
        needed = heading_h + img_h + 4
        
        # Shrink charts to fit the rest of this page when only slightly short;
        # otherwise move to a fresh page (full-size side by side).
        if needed > self._remaining_height():
            shrink = (self._remaining_height() - heading_h - 4) / img_h
            if shrink >= 0.75:
                col_w *= shrink
                img_h *= shrink
            else:
                self.pdf.add_page()
        else:
            self.pdf.ln(2)
        
        x0 = self.pdf.l_margin
        y0 = self.pdf.get_y()
        for i, (title, path) in enumerate(charts):
            x = x0 + i * (col_w + gap) + (0 if col_w * 2 + gap >= avail else (avail - 2 * col_w - gap) / 2)
            self.pdf.set_xy(x, y0)
            self.pdf.set_font(self._thai_font, 'B', 12)
            self.pdf.set_text_color(30, 41, 59)
            self.pdf.cell(col_w, heading_h, title, align='C')
            if os.path.exists(path):
                self.pdf.image(path, x=x, y=y0 + heading_h, w=col_w)
        self.pdf.set_xy(self.pdf.l_margin, y0 + heading_h + img_h + 4)
    

    def save(self, filepath: str):
        self.pdf.output(filepath)


# ============================================================
# Main Report Generator Orchestrator
# ============================================================

class ReportGenerator:
    """Main orchestrator for report generation."""
    
    def __init__(self, api_base: str = 'http://localhost:3001', output_dir: str = 'reports', token: str = ''):
        self.api_base = api_base
        self.output_dir = output_dir
        self.charts_dir = os.path.join(output_dir, 'charts')
        self.token = token
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.charts_dir, exist_ok=True)
        
        self.scoring = ScoringEngine()
        self.analysis = AnalysisEngine()
        self.chart_gen = RadarChartGenerator(self.charts_dir)
    
    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers including authorization if token is available."""
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        return headers
    
    def fetch_data(self, company_id: str) -> Tuple[Dict, Dict[str, List[Dict]]]:
        """Fetch company and responses from API."""
        # Get company
        resp = requests.get(f'{self.api_base}/api/companies/{company_id}', 
                          headers=self._get_headers(), timeout=10)
        resp.raise_for_status()
        company = resp.json()
        
        # Get responses
        resp = requests.get(f'{self.api_base}/api/export/{company_id}', 
                          headers=self._get_headers(), timeout=10)
        resp.raise_for_status()
        export_data = resp.json()
        
        return company, export_data.get('responses', {})
    
    def generate_report(self, company_id: str, formats: List[str] = ['docx', 'pdf']) -> Dict[str, str]:
        """Generate complete report for a company."""
        print(f"Fetching data for company {company_id}...")
        company, responses = self.fetch_data(company_id)
        
        print("Calculating scores...")
        scores = self.scoring.calculate_all_scores(responses)
        
        print("Generating analysis...")
        analyses = [self.analysis.analyze_section(s) for s in scores]
        exec_summary = self.analysis.generate_executive_summary(analyses, company)
        
        print("Generating charts...")
        overview_chart = self.chart_gen.generate_overview_radar(scores, company['name'])
        benchmark_chart = self.chart_gen.generate_comparison_radar(scores, company['name'])
        
        dimension_charts = {}
        for s in scores:
            chart = self.chart_gen.generate_dimension_radar(s, company['name'])
            if chart:
                dimension_charts[s.section_id] = chart
        
        outputs = {}
        
        # Generate Word document
        if 'docx' in formats:
            print("Generating Word document...")
            docx_path = os.path.join(self.output_dir, 
                f"{company['name'].replace(' ', '_')}_Assessment_Report_{datetime.now().strftime('%Y%m%d')}.docx")
            word_gen = WordReportGenerator()
            word_gen.add_cover_page(exec_summary)
            word_gen.add_table_of_contents()
            word_gen.add_executive_summary(exec_summary)
            word_gen.add_overview_radar(overview_chart)
            word_gen.add_benchmark_radar(benchmark_chart)
            
            for analysis in analyses:
                chart = dimension_charts.get(analysis['section_id'])
                word_gen.add_section_detail(analysis, chart)
            
            word_gen.save(docx_path)
            
            # Validate the docx file can be opened
            if not os.path.exists(docx_path) or os.path.getsize(docx_path) == 0:
                raise RuntimeError(f"Word file was not created or is empty: {docx_path}")
            
            try:
                from docx import Document as DocxDocument
                DocxDocument(docx_path)  # Verify it's a valid docx
            except Exception as e:
                raise RuntimeError(f"Generated Word file is corrupted: {e}")
            
            outputs['docx'] = docx_path
            print(f"  Saved: {docx_path} ({os.path.getsize(docx_path)} bytes)")
        
        # Generate PDF
        if 'pdf' in formats:
            print("Generating PDF...")
            try:
                if HAS_FPDF:
                    # Use FPDF directly (avoids docx2pdf which requires Microsoft Word on Windows)
                    pdf_path = self._generate_pdf_direct(company['name'], exec_summary, analyses,
                                                        overview_chart, benchmark_chart, dimension_charts)
                    outputs['pdf'] = pdf_path
                    print(f"  Saved (via FPDF): {pdf_path}")
                elif HAS_DOCX2PDF and 'docx' in outputs:
                    # Fallback: convert docx to PDF (requires Microsoft Word on Windows)
                    pdf_path = outputs['docx'].replace('.docx', '.pdf')
                    try:
                        convert(outputs['docx'], pdf_path)
                        outputs['pdf'] = pdf_path
                        print(f"  Saved (via docx2pdf): {pdf_path}")
                    except Exception as e:
                        print(f"  docx2pdf failed: {e}")
                        raise RuntimeError(f"PDF generation failed: docx2pdf error - {e}")
                else:
                    raise RuntimeError("PDF generation failed: Neither fpdf2 nor docx2pdf is available")
            except Exception as e:
                print(f"  PDF generation error: {e}")
                raise
        
        if not outputs:
            raise RuntimeError("Report generation failed: No output files were created")
        
        print("\nReport generation complete!")
        return outputs
    
    def _generate_pdf_direct(self, company_name: str, exec_summary: Dict, analyses: List[Dict],
                             overview_chart: str, benchmark_chart: str, 
                             dimension_charts: Dict[str, str]) -> str:
        """Generate PDF directly using FPDF."""
        pdf_path = os.path.join(self.output_dir, 
            f"{company_name.replace(' ', '_')}_Assessment_Report_{datetime.now().strftime('%Y%m%d')}.pdf")
        
        pdf_gen = PDFReportGenerator()
        pdf_gen.add_cover_page(exec_summary)
        pdf_gen.add_executive_summary(exec_summary)
        pdf_gen.add_radar_pair(overview_chart, benchmark_chart)
        
        for analysis in analyses:
            chart = dimension_charts.get(analysis['section_id'])
            pdf_gen.add_section_detail(analysis, chart)
        
        pdf_gen.save(pdf_path)
        
        # Validate the PDF file was created and is not empty
        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            raise RuntimeError(f"PDF file was not created or is empty: {pdf_path}")
        
        # Basic PDF validation: check file starts with %PDF
        with open(pdf_path, 'rb') as f:
            header = f.read(5)
            if header != b'%PDF-':
                raise RuntimeError(f"Generated PDF is invalid (bad header: {header!r})")
        
        print(f"  Saved (via FPDF): {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
        return pdf_path


# ============================================================
# CLI Entry Point
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='Generate assessment reports')
    parser.add_argument('company_id', help='Company ID to generate report for')
    parser.add_argument('--api', default='http://localhost:3001', help='API base URL')
    parser.add_argument('--output', default='reports', help='Output directory')
    parser.add_argument('--formats', nargs='+', default=['docx', 'pdf'], 
                        choices=['docx', 'pdf'], help='Output formats')
    parser.add_argument('--token', default='', help='Authorization token for API requests')
    
    args = parser.parse_args()
    
    generator = ReportGenerator(api_base=args.api, output_dir=args.output, token=args.token)
    
    try:
        outputs = generator.generate_report(args.company_id, formats=args.formats)
        
        print("\n" + "="*60)
        print("GENERATED REPORTS:")
        print("="*60)
        for fmt, path in outputs.items():
            print(f"  {fmt.upper()}: {path}")
        
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API server.")
        print(f"Make sure the backend is running on {args.api}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()