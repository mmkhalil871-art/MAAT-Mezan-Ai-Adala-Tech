/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Global constants for the MAAT application
export const APP_NAME = 'MAAT';
export const APP_DESCRIPTION = 'Mezan Ai Adala Tech - Legal AI System';

import { MessageAction } from './types';

export const WORKFLOW_ACTIONS: MessageAction[] = [
  { id: '1', label: 'Analysis', labelAr: 'التحليل', type: 'workflow', value: 'Analysis' },
  { id: '2', label: 'Draft Text', labelAr: 'صياغة نص', type: 'workflow', value: 'Drafting' },
  { id: '3', label: 'Regulation', labelAr: 'تشريع جديد', type: 'workflow', value: 'Regulation' },
  { id: '4', label: 'Interpret', labelAr: 'التفسير', type: 'workflow', value: 'Interpretation' },
  { id: '7', label: 'Advisor', labelAr: 'المستشار', type: 'workflow', value: 'General' },
  { id: '9', label: 'Ruling Summary', labelAr: 'تلخيص الأحكام', type: 'workflow', value: 'Summarization' },
  { id: '10', label: 'Relationships', labelAr: 'الروابط القانونية', type: 'workflow', value: 'Relationships' },
  { id: '11', label: 'Provisions', labelAr: 'النصوص الحاكمة', type: 'workflow', value: 'ProvisionSearch' },
  { id: '12', label: 'Instruments', labelAr: 'المواثيق الدولية', type: 'workflow', value: 'RelatedInstruments' },
];

export const OUTCOME_ACTIONS: MessageAction[] = [
  { id: 'o1', label: 'Save to Library', labelAr: 'حفظ في المكتبة', type: 'output', value: 'save' },
  { id: 'o2', label: 'Export PDF', labelAr: 'تصدير PDF', type: 'output', value: 'export_pdf' },
  { id: 'o10', label: 'Legislative Drafting', labelAr: 'الصياغة التشريعية', type: 'workflow', value: 'Drafting' },
  { id: 'o7', label: 'Governing Provisions', labelAr: 'النصوص الحاكمة', type: 'workflow', value: 'ProvisionSearch' },
  { id: 'o8', label: 'International Instruments', labelAr: 'المواثيق الدولية', type: 'workflow', value: 'RelatedInstruments' },
  { id: 'o6', label: 'Relationships', labelAr: 'الروابط القانونية', type: 'workflow', value: 'Relationships' },
  { id: 'o9', label: 'Judicial Analysis', labelAr: 'التحليل القضائي', type: 'workflow', value: 'Summarization' },
  { id: 'o3', label: 'Draft Memo', labelAr: 'تحويل لمذكرة', type: 'workflow', value: 'Forms' },
  { id: 'o11', label: 'Legal Translation', labelAr: 'ترجمة قانونية', type: 'workflow', value: 'Translation' },
  { id: 'o5', label: 'Ask Question', labelAr: 'سؤال قانوني', type: 'workflow', value: 'General' },
];

export const RESEARCHER_ROLES = [
  { id: 'LegalResearcher', label: 'Legal Researcher', labelAr: 'باحث قانوني', icon: 'Scale' },
  { id: 'TechnicalResearcher', label: 'Technical Researcher', labelAr: 'باحث فني', icon: 'Cpu' },
  { id: 'ILS', label: 'ILS Researcher', labelAr: 'باحث معايير عمل دولية', icon: 'Globe' },
  { id: 'LegalAffairs', label: 'Legal Affairs', labelAr: 'شؤون قانونية', icon: 'Briefcase' },
  { id: 'PoliticalEconomical', label: 'Political & Economic', labelAr: 'باحث سياسي واقتصادي', icon: 'TrendingUp' },
  { id: 'LegalInterpreter', label: 'Legal Interpreter / Jurist', labelAr: 'مترجم قانوني / فقيه', icon: 'Gavel' },
  { id: 'LabourJudge', label: 'Labour Judge', labelAr: 'قاضي عمالي', icon: 'Gavel' },
  { id: 'LabourAttache', label: 'Labour Attache', labelAr: 'ملحق عمالي', icon: 'ShieldCheck' },
  { id: 'LabourCounselor', label: 'Legal Labour Counselor', labelAr: 'مستشار قانوني عمالي', icon: 'HeartHandshake' },
  { id: 'CEACR', label: 'CEACR Expert', labelAr: 'خبير لجنة الخبراء CEACR', icon: 'FileCheck' },
  { id: 'SpecialRapporteur', label: 'Special Rapporteur', labelAr: 'المقرر الخاص', icon: 'Eye' },
  { id: 'LegalAIConsultant', label: 'Legal AI Consultant', labelAr: 'مستشار الذكاء الاصطناعي القانوني', icon: 'Sparkles' },
  { id: 'ProfessionalLabourLawyer', label: 'Professional Labour & Administrative Lawyer', labelAr: 'محامي عمالي وإداري محترف', icon: 'Scale' },
  { id: 'Administrator', label: 'Administrator', labelAr: 'المسؤول - النظام الكامل', icon: 'ShieldAlert' },
];
