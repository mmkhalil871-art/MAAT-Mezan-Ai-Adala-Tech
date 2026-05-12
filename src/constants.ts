/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageAction } from './types';

export const WORKFLOW_ACTIONS: MessageAction[] = [
  { id: '1', label: 'Analyze Gaps', labelAr: 'تحليل الفجوات', type: 'workflow', value: 'Analysis' },
  { id: '2', label: 'Draft Decree', labelAr: 'صياغة قرار', type: 'workflow', value: 'Drafting' },
  { id: '3', label: 'Draft Regulation', labelAr: 'صياغة لائحة', type: 'workflow', value: 'Regulation' },
  { id: '4', label: 'Legal Interpretation', labelAr: 'تفسير قانوني', type: 'workflow', value: 'Interpretation' },
  { id: '5', label: 'Comparison Study', labelAr: 'دراسة مقارنة', type: 'workflow', value: 'Comparison' },
  { id: '6', label: 'Reformulate', labelAr: 'إعادة صياغة', type: 'workflow', value: 'Redrafting' },
  { id: '7', label: 'Advisor Opinion', labelAr: 'رأي المستشار القضائي', type: 'workflow', value: 'Advisor' },
  { id: '8', label: 'Library Support', labelAr: 'دعم المكتبة الرقمية', type: 'workflow', value: 'Library' },
  { id: '9', label: 'Summarize Ruling', labelAr: 'تلخيص حكم قضائي', type: 'workflow', value: 'Summarization' },
  { id: '10', label: 'Legal Relationships', labelAr: 'الروابط القانونية', type: 'workflow', value: 'Relationships' },
];

export const OUTCOME_ACTIONS: MessageAction[] = [
  { id: 'o1', label: 'Save to Library', labelAr: 'حفظ في المكتبة', type: 'output', value: 'save' },
  { id: 'o2', label: 'Export PDF', labelAr: 'تصدير PDF', type: 'output', value: 'export_pdf' },
  { id: 'o6', label: 'Analyze Reg. Relationships', labelAr: 'تحليل الروابط التنظيمية', type: 'workflow', value: 'Relationships' },
  { id: 'o3', label: 'Convert to Memo', labelAr: 'تحويل لمذكرة', type: 'output', value: 'memo' },
  { id: 'o4', label: 'Policy Paper', labelAr: 'ورقة سياسات', type: 'output', value: 'policy' },
  { id: 'o5', label: 'Action Plan', labelAr: 'خطة عمل', type: 'output', value: 'action_plan' },
];
