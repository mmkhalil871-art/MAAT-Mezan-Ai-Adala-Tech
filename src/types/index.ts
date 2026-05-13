/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LegalWorkflow = 
  | 'General'
  | 'Drafting' 
  | 'Regulation'
  | 'Analysis' 
  | 'Interpretation' 
  | 'Comparison' 
  | 'Redrafting'
  | 'Translation'
  | 'Forms'
  | 'Library'
  | 'History'
  | 'ProvisionSearch'
  | 'Summarization'
  | 'Relationships'
  | 'Admin';

export type Language = 'en' | 'ar';

export type FormType = 
  | 'Contract'
  | 'Decree'
  | 'Official Notice'
  | 'Power of Attorney'
  | 'Administrative Decision'
  | 'Info Paper'
  | 'Policy Paper'
  | 'Action Plan'
  | 'Reply for Formal Entities'
  | 'Regulation'
  | 'Legal Memo'
  | 'Legal Opinion'
  | 'Judgment Summary';

export interface MessageAction {
  id: string;
  label: string;
  labelAr: string;
  type: 'workflow' | 'output' | 'system';
  value: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  workflow?: LegalWorkflow;
  timestamp: number;
  formType?: FormType;
  actions?: MessageAction[];
  isResult?: boolean;
}

export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  type: 'law' | 'decree' | 'regulation' | 'ruling' | 'draft';
  lastModified: number;
}
