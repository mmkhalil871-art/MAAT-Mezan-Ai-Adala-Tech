/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  X, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Library,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function HowToUseModal({ isOpen, onClose, language }: HowToUseModalProps) {
  const isAr = language === 'ar';

  const steps = [
    {
      id: 1,
      title: isAr ? 'تسجيل الدخول' : 'Sign In',
      description: isAr 
        ? 'ابدأ بتسجيل الدخول باستخدام بريدك الإلكتروني الشخصي (Gmail, Outlook, إلخ) للوصول إلى كامل خصائص النظام.' 
        : 'Start by signing in with your personal email (Gmail, Outlook, etc.) to access all system features.',
      icon: ShieldCheck
    },
    {
      id: 2,
      title: isAr ? 'اختر سير العمل' : 'Choose Workflow',
      description: isAr 
        ? 'من القائمة الجانبية، حدد نوع المهمة القانونية التي تريد القيام بها، مثل "المستشار"، "صياغة نص"، أو "تلخيص الأحكام".' 
        : 'From the sidebar, select the legal task type you want to perform, such as "Advisor", "Draft Text", or "Ruling Summary".',
      icon: Scale
    },
    {
      id: 3,
      title: isAr ? 'حدد الدور البحثي' : 'Select Researcher Persona',
      description: isAr 
        ? 'اختر المنظور البحثي الذي ترغب أن يتبناه النظام في تحليله (باحث قانوني، قاضي عمالي، خبير ILS، إلخ).' 
        : 'Choose the research perspective you want the system to adopt (Legal Researcher, Labour Judge, ILS Expert, etc.).',
      icon: Users
    },
    {
      id: 4,
      title: isAr ? 'التفاعل والتحليل' : 'Interact & Analyze',
      description: isAr 
        ? 'اكتب سؤالك في منطقة الدردشة أو ارفع المستندات (PDF/صور) للتحليل العميق واستخراج البيانات.' 
        : 'Type your question in the chat area or upload documents (PDF/Images) for deep analysis and data extraction.',
      icon: MessageSquare
    },
    {
      id: 5,
      title: isAr ? 'النتائج والحفظ' : 'Outputs & Saving',
      description: isAr 
        ? 'يمكنك تصدير النتائج كملفات PDF، أو حفظها في مكتبتك الخاصة للرجوع إليها لاحقاً.' 
        : 'You can export results as PDF files or save them to your personal library for future reference.',
      icon: Library
    }
  ];

  const capabilities = [
    {
      title: isAr ? 'تحليل قانوني شامل' : 'Comprehensive Legal Analysis',
      items: isAr 
        ? ['تفسير النصوص التشريعية', 'مقارنة الأحكام القضائية', 'تحليل القوانين المحلية والدولية']
        : ['Interpreting legislative texts', 'Comparing judicial rulings', 'Analyzing local and international laws']
    },
    {
      title: isAr ? 'صياغة وتحرير العقود' : 'Contract Drafting & Editing',
      items: isAr 
        ? ['صياغة عقود العمل', 'تحسين النصوص القانونية', 'توليد نماذج رسمية']
        : ['Drafting labour contracts', 'Refining legal texts', 'Generating official forms']
    },
    {
      title: isAr ? 'معايير العمل الدولية' : 'International Labour Standards',
      items: isAr 
        ? ['فحص الامتثال لاتفاقيات ILO', 'تحليل تقارير CEACR', 'تطبيق الحماية الدولية للعمال']
        : ['Checking compliance with ILO conventions', 'Analyzing CEACR reports', 'Applying international worker protections']
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg-deep/80 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl max-h-[90vh] bg-bg-sidebar border border-gold-start/20 theme-radius overflow-hidden shadow-2xl flex flex-col relative z-20 font-serif"
          >
            {/* Header */}
            <div className="p-6 border-b border-border-subtle/30 flex items-center justify-between sticky top-0 bg-bg-sidebar/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg">
                  <HelpCircle className="w-6 h-6 text-bg-deep" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gold-start tracking-tight">
                    {isAr ? 'دليل استخدام ماعت' : 'MAAT Usage Guide'}
                  </h2>
                  <p className="text-xs text-text-muted caps tracking-widest mt-0.5">
                    {isAr ? 'خطوات التشغيل والإمكانيات التقنية' : 'OPERATIONAL STEPS & SYSTEM CAPABILITIES'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-bg-soft/50 theme-radius transition-all"
              >
                <X className="w-6 h-6 text-text-muted" />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-12">
              
              {/* Steps Section */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-0.5 w-12 bg-gold-start/30" />
                  <h3 className="text-xl font-bold text-text-main">
                    {isAr ? 'دليل الخطوات' : 'Step-by-Step Guide'}
                  </h3>
                </div>
                
                <div className="grid gap-6">
                  {steps.map((step) => (
                    <motion.div 
                      key={step.id}
                      initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="flex gap-6 p-6 theme-radius bg-bg-soft/30 border border-border-subtle/20 group hover:border-gold-start/30 transition-all duration-500"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-bg-sidebar border border-gold-start/20 flex items-center justify-center text-xl font-black text-gold-start group-hover:scale-110 transition-transform shadow-inner">
                          {step.id}
                        </div>
                        {step.id < steps.length && (
                          <div className="w-0.5 h-full bg-border-subtle/20 my-2" />
                        )}
                      </div>
                      <div className="pt-2">
                        <div className="flex items-center gap-3 mb-2">
                          <step.icon className="w-5 h-5 text-gold-start opacity-60" />
                          <h4 className="text-lg font-bold text-text-main">{step.title}</h4>
                        </div>
                        <p className="text-text-muted leading-relaxed text-sm md:text-base">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Capabilities Section */}
              <section className="bg-gold-start/5 p-8 theme-radius border border-gold-start/10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-0.5 w-12 bg-gold-start/30" />
                  <h3 className="text-xl font-bold text-text-main">
                    {isAr ? 'إمكانيات النظام' : 'System Capabilities'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {capabilities.map((cap, idx) => (
                    <div key={idx} className="space-y-4">
                      <h4 className="font-bold text-gold-start flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {cap.title}
                      </h4>
                      <ul className="space-y-2">
                        {cap.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-text-muted">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer Note */}
              <div className="text-center pb-8 border-t border-border-subtle/10 pt-8 mt-8">
                <p className="text-sm text-text-muted italic">
                  {isAr 
                    ? 'هذا النظام مدعوم بأحدث تقنيات الذكاء الاصطناعي لضمان أعلى درجات الدقة القانونية.' 
                    : 'This system is powered by the latest AI technologies to ensure the highest levels of legal accuracy.'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
