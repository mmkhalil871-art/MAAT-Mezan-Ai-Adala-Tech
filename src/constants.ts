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
  { id: '13', label: 'Speech', labelAr: 'إعداد خطاب', type: 'workflow', value: 'Forms', formType: 'Speech' },
  { id: '14', label: 'Statement', labelAr: 'بيان رسمي', type: 'workflow', value: 'Forms', formType: 'Statement' },
];

export const OUTCOME_ACTIONS: MessageAction[] = [
  { id: 'o1', label: 'Save to Library', labelAr: 'حفظ في المكتبة', type: 'output', value: 'save' },
  { id: 'o2', label: 'Export PDF', labelAr: 'تصدير PDF', type: 'output', value: 'export_pdf' },
  { id: 'o12', label: 'Speech Formulation', labelAr: 'صياغة خطاب', type: 'workflow', value: 'Forms', formType: 'Speech' },
  { id: 'o13', label: 'Official Statement', labelAr: 'بيان رسمي', type: 'workflow', value: 'Forms', formType: 'Statement' },
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
  { 
    id: 'LegalResearcher', 
    label: 'Legal Researcher', 
    labelAr: 'باحث قانوني', 
    icon: 'Scale',
    description: 'Expert in laws, regulations, and judicial precedents.',
    descriptionAr: 'خبير في القوانين واللوائح والسوابق القضائية.'
  },
  { 
    id: 'TechnicalResearcher', 
    label: 'Technical Researcher', 
    labelAr: 'باحث فني', 
    icon: 'Cpu',
    description: 'Focuses on technical specifications and implementation details.',
    descriptionAr: 'يركز على المواصفات الفنية وتفاصيل التنفيذ.'
  },
  { 
    id: 'ILS', 
    label: 'ILS Researcher', 
    labelAr: 'باحث معايير عمل دولية', 
    icon: 'Globe',
    description: 'Specializes in International Labour Standards and compliance.',
    descriptionAr: 'متخصص في معايير العمل الدولية والامتثال.'
  },
  { 
    id: 'LegalAffairs', 
    label: 'Legal Affairs', 
    labelAr: 'شؤون قانونية', 
    icon: 'Briefcase',
    description: 'Corporate and administrative legal oversight.',
    descriptionAr: 'الرقابة القانونية للشركات والإدارة.'
  },
  { 
    id: 'PoliticalEconomical', 
    label: 'Political & Economic', 
    labelAr: 'باحث سياسي واقتصادي', 
    icon: 'TrendingUp',
    description: 'Analyzes the socio-economic impact of legal decisions.',
    descriptionAr: 'يحلل الأثر الاجتماعي والاقتصادي للقرارات القانونية.'
  },
  { 
    id: 'LegalInterpreter', 
    label: 'Legal Interpreter / Jurist', 
    labelAr: 'مترجم قانوني / فقيه', 
    icon: 'Gavel',
    description: 'Interprets legal texts and provides jurisprudential insights.',
    descriptionAr: 'يفسر النصوص القانونية ويقدم رؤى فقهية.'
  },
  { 
    id: 'LabourJudge', 
    label: 'Labour Judge', 
    labelAr: 'قاضي عمالي', 
    icon: 'Gavel',
    description: 'Adjudicates labour disputes with a focus on equity.',
    descriptionAr: 'يفصل في المنازعات العمالية مع التركيز على الإنصاف.'
  },
  { 
    id: 'LabourAttache', 
    label: 'Labour Attache', 
    labelAr: 'ملحق عمالي', 
    icon: 'ShieldCheck',
    description: 'Represents labour interests in international contexts.',
    descriptionAr: 'يمثل مصالح العمل في السياقات الدولية.'
  },
  { 
    id: 'LabourCounselor', 
    label: 'Legal Labour Counselor', 
    labelAr: 'مستشار قانوني عمالي', 
    icon: 'HeartHandshake',
    description: 'Provides advisory services for workforce legalities.',
    descriptionAr: 'يقدم خدمات استشارية للشؤون القانونية للقوى العاملة.'
  },
  { 
    id: 'CEACR', 
    label: 'CEACR Expert', 
    labelAr: 'خبير لجنة الخبراء CEACR', 
    icon: 'FileCheck',
    description: 'Committee of Experts on the Application of Conventions and Recommendations.',
    descriptionAr: 'لجنة الخبراء المعنية بتطبيق الاتفاقيات والتوصيات.'
  },
  { 
    id: 'SpecialRapporteur', 
    label: 'Special Rapporteur', 
    labelAr: 'المقرر الخاص', 
    icon: 'Eye',
    description: 'Investigates and reports on specific human rights themes.',
    descriptionAr: 'يحقق ويقدم تقارير حول موضوعات محددة لحقوق الإنسان.'
  },
  { 
    id: 'LegalAIConsultant', 
    label: 'Legal AI Consultant', 
    labelAr: 'مستشار الذكاء الاصطناعي القانوني', 
    icon: 'Sparkles',
    description: 'Optimizes legal workflows using advanced AI analysis.',
    descriptionAr: 'يحسن سير العمل القانوني باستخدام تحليل الذكاء الاصطناعي المتقدم.'
  },
  { 
    id: 'ProfessionalLabourLawyer', 
    label: 'Professional Labour & Administrative Lawyer', 
    labelAr: 'محامي عمالي وإداري محترف', 
    icon: 'Scale',
    description: 'Litigation and defense in complex labour and admin cases.',
    descriptionAr: 'التقاضي والدفاع في القضايا العمالية والإدارية المعقدة.'
  },
  { 
    id: 'Administrator', 
    label: 'Administrator', 
    labelAr: 'المسؤول - النظام الكامل', 
    icon: 'ShieldAlert',
    description: 'Supreme Administrative Authority. Capabilities: 1) Advanced Speech & Keynote Drafting, 2) Official Ministerial Statements, 3) National Policy & Strategy Formulation, 4) Legislative Review & Sovereign Oversight, 5) Full System Governance and Audit access.',
    descriptionAr: 'سلطة إدارية عليا. القدرات: ١) صياغة الخطابات المتقدمة والكلمات الرئيسية، ٢) البيانات الوزارية الرسمية، ٣) صياغة السياسات والاستراتيجيات الوطنية، ٤) المراجعة التشريعية والرقابة السيادية، ٥) الوصول الكامل لحوكمة النظام والتدقيق.'
  },
];
