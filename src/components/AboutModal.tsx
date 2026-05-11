/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { X, Info, Scale, Mail, Github, ExternalLink, Shield } from 'lucide-react';
import { Language } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AboutModalProps {
  language: Language;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export default function AboutModal({ language, onClose, theme }: AboutModalProps) {
  const isAr = language === 'ar';

  const content = {
    title: isAr ? 'عن المنصة' : 'About Platform',
    developer: isAr ? 'المبدع والمطور' : 'Creator & Developer',
    devName: 'Mostafa Magdy Mahmoud Khalil',
    devTitle: isAr ? 'باحث قانوني أول - وزارة العمل - مهندس أنظمة ذكاء اصطناعي' : 'Senior Legal Researcher - Ministry of Labour - AI Systems Architect',
    version: isAr ? 'الإصدار السيادي' : 'Sovereign Edition',
    verNum: isAr ? 'v2.4.0 Mezan Ai Adala (ماعت)' : 'v2.4.0 Mezan Ai Adala (MAAT)',
    purpose: isAr ? 'الغرض من المنصة' : 'Platform Purpose',
    purposeDesc: isAr 
      ? 'منصة احترافية مدعومة بالذكاء الاصطناعي مصممة للصياغة التشريعية، وتحليل الأحكام القضائية، والتوثيق السيادي مع ميزات تحليلية متقدمة.'
      : 'A professional AI-powered legal platform for legislative drafting, judicial analysis, and sovereign documentation.',
    contact: isAr ? 'بيانات التواصل' : 'Professional Contacts',
    email: 'm.mkhalil871@proton.me',
    syncStatus: isAr ? 'حالة المزامنة' : 'System Status',
    syncDesc: isAr ? 'مزامنة فورية - قاعدة البيانات الفقهية' : 'Real-time Sync - Jurisprudence Database'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full max-w-4xl overflow-hidden shadow-2xl theme-radius border z-50 pointer-events-auto",
          theme === 'dark' ? "bg-bg-sidebar border-border-subtle" : "bg-white border-lite-border"
        )}
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gold-gradient" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-start/10 blur-3xl rounded-full" />
        
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gold-start/10 rounded-xl flex items-center justify-center border border-gold-start/20">
                <Info className="w-6 h-6 text-gold-start" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-black tracking-tight text-text-main">
                  {content.title}
                </h2>
                <div className="flex items-center gap-2 mt-1 opacity-50">
                  <Shield className="w-3 h-3 text-gold-start" />
                  <span className="text-[10px] caps font-bold tracking-widest">{content.syncDesc}</span>
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-text-muted hover:text-text-main group relative z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6 group-active:scale-95 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <section>
                <h3 className="text-[10px] caps font-bold text-gold-start/60 mb-3">{content.developer}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bg-soft flex items-center justify-center font-serif text-lg font-bold border border-border-subtle">
                    MK
                  </div>
                  <div>
                    <p className="text-text-main font-bold text-lg leading-tight mb-1">{content.devName}</p>
                    <p className="text-xs text-text-muted leading-relaxed max-w-[240px] opacity-80">{content.devTitle}</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] caps font-bold text-gold-start/60 mb-3">{content.version}</h3>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                  theme === 'dark' ? "bg-bg-soft border-border-subtle" : "bg-lite-bg border-lite-border"
                )}>
                  <Scale className="w-4 h-4 text-gold-start" />
                  <span className="text-sm font-mono font-medium">{content.verNum}</span>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section>
                <h3 className="text-[10px] caps font-bold text-gold-start/60 mb-3">{content.purpose}</h3>
                <p className="text-sm leading-relaxed text-text-muted font-sans italic border-l-2 border-gold-start/20 pl-4 py-1">
                  "{content.purposeDesc}"
                </p>
              </section>

              <section>
                <h3 className="text-[10px] caps font-bold text-gold-start/60 mb-3">{content.contact}</h3>
                <div className="flex flex-col gap-3">
                  <a 
                    href={`mailto:${content.email}`}
                    className="flex items-center gap-3 text-sm text-text-muted hover:text-gold-start transition-all duration-300 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-bg-soft flex items-center justify-center border border-border-subtle group-hover:border-gold-start/40 group-hover:bg-gold-start/5 transition-all">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="border-b border-transparent group-hover:border-gold-start/30">{content.email}</span>
                  </a>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-3 text-sm text-text-muted hover:text-gold-start transition-colors group opacity-50 cursor-not-allowed">
                      <div className="w-8 h-8 rounded-lg bg-bg-soft flex items-center justify-center border border-border-subtle">
                        <Github className="w-4 h-4" />
                      </div>
                      GitHub Repository
                    </button>
                    <ExternalLink className="w-3 h-3 opacity-30" />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border-subtle/30 flex flex-col items-center">
            <p className="text-[9px] caps font-bold text-text-muted/40 tracking-[0.5em] mb-4">
              {isAr ? 'نظام ماعت الفقهي' : 'MAAT JURISPRUDENCE SYSTEM'}
            </p>
            <div className="flex items-center gap-4 opacity-20">
              <div className="w-1 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white" />
              <Scale className="w-4 h-4" />
              <div className="w-1 h-1 rounded-full bg-white" />
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
