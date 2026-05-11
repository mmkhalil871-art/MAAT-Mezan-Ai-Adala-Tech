/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Scale, 
  Search, 
  FileCode, 
  Globe, 
  Plus,
  FilePlus,
  FileText,
  FileSearch,
  Languages,
  FileSignature,
  Library,
  ShieldCheck,
  LogOut,
  History,
  Sun,
  Moon,
  Type,
  Palette,
  PlusCircle,
  MinusCircle,
  X,
  Info,
  User as UserIcon,
  Inbox
} from 'lucide-react';
import { LegalWorkflow, Language } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getAdminRequests } from '../lib/firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  currentWorkflow: LegalWorkflow;
  onWorkflowChange: (workflow: LegalWorkflow) => void;
  onNewSession: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  userEmail?: string | null;
  onLogout: () => void;
  onShowHistory: () => void;
  onShowMessages: () => void;
  onShowAbout: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
}

const workflows: { id: LegalWorkflow; label: { en: string; ar: string }; icon: React.ElementType }[] = [
  { id: 'General', label: { en: 'Advisor', ar: 'المستشار' }, icon: Search },
  { id: 'Drafting', label: { en: 'Draft Text', ar: 'صياغة نص' }, icon: FilePlus },
  { id: 'Regulation', label: { en: 'Regulation', ar: 'تشريع جديد' }, icon: FileText },
  { id: 'Analysis', label: { en: 'Analysis', ar: 'التحليل' }, icon: Scale },
  { id: 'Interpretation', label: { en: 'Interpret', ar: 'التفسير' }, icon: Globe },
  { id: 'Library', label: { en: 'Library', ar: 'المكتبة' }, icon: Library },
  { id: 'Summarization', label: { en: 'Ruling Summary', ar: 'تلخيص الأحكام' }, icon: FileSearch },
  { id: 'Forms', label: { en: 'Forms', ar: 'النماذج' }, icon: FileSignature },
  { id: 'Translation', label: { en: 'Translate', ar: 'الترجمة' }, icon: Languages },
  { id: 'Redrafting', label: { en: 'Refine', ar: 'التحسين' }, icon: FileCode },
];

export default function Sidebar({ 
  isOpen,
  onClose,
  currentWorkflow, 
  onWorkflowChange, 
  onNewSession,
  language,
  onLanguageChange,
  userEmail,
  onLogout,
  onShowHistory,
  onShowMessages,
  onShowAbout,
  theme,
  onThemeToggle,
  fontScale,
  onFontScaleChange,
  textColor,
  onTextColorChange
}: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const isAr = language === 'ar';
  
  const isAdmin = userEmail && userEmail === 'm.mkhalil871@gmail.com'; // Fixed to use the user email from metadata

  useEffect(() => {
    if (isAdmin) {
      const fetchPending = async () => {
        try {
          const reqs = await getAdminRequests();
          const count = reqs.filter(r => r.status === 'pending').length;
          setPendingCount(count);
        } catch (e) {
          console.error('Failed to fetch pending requests for badge:', e);
        }
      };
      fetchPending();
      // Poll every 60 seconds
      const interval = setInterval(fetchPending, 60000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const adjustFont = (delta: number) => {
    onFontScaleChange(Math.min(Math.max(fontScale + delta, 0.8), 1.2));
  };

  const dayColors = [
    { name: 'Sovereign', value: '#0A1B3D' },
    { name: 'Midnight', value: '#0F172A' },
    { name: 'Royal', value: '#1E3A8A' },
    { name: 'Bordeaux', value: '#4C0519' },
    { name: 'Deep Emerald', value: '#064E3B' },
    { name: 'Slate', value: '#334155' },
    { name: 'Imperial', value: '#312E81' },
    { name: 'Sovereign Gold', value: '#B4941F' }
  ];

  const nightColors = [
    { name: 'Gold Tint', value: '#E6C682' },
    { name: 'Alabaster', value: '#F2F5F7' },
    { name: 'Soft Cream', value: '#F5F5DC' },
    { name: 'Pale Azure', value: '#BFDBFE' },
    { name: 'Sage Tint', value: '#D1FAE5' },
    { name: 'Rose Dust', value: '#FFE4E6' },
    { name: 'Platinum', value: '#E5E7EB' },
    { name: 'Amber Glow', value: '#FDE68A' }
  ];

  const currentColors = theme === 'dark' ? nightColors : dayColors;

  const menuItems = [
    ...workflows,
    ...(isAdmin ? [{ id: 'Admin' as LegalWorkflow, label: { en: 'Sovereign Logs', ar: 'سجلات السيادة' }, icon: ShieldCheck }] : [])
  ];

  const activeColor = textColor;

  return (
      <motion.aside className={cn(
        "bg-bg-sidebar text-text-muted flex flex-col h-[100dvh] sticky top-0 transition-all duration-500 z-[60] shrink-0 overflow-hidden uppercase tracking-widest",
        theme === 'dark' ? "border-border-subtle" : "border-lite-border shadow-md",
        "border-e fixed lg:relative",
        isAr ? "right-0" : "left-0",
        // Dynamic Space Reclamation: Collapses to 0 width on desktop when closed
        isOpen 
          ? "w-72 opacity-100 translate-x-0 shadow-2xl lg:shadow-none" 
          : cn(
              "w-72 lg:w-0 opacity-0 pointer-events-none border-none",
              isAr ? "translate-x-full" : "-translate-x-full"
            )
      )}>
        {/* Fixed Width Container to prevent layout shift during Sidebar width animation */}
        <div className="w-72 h-full flex flex-col shrink-0">
          {/* Close Button - Now visible on both mobile and desktop */}
          <button 
            onClick={onClose}
            className="absolute top-4 end-4 p-2 text-text-muted hover:text-gold-start transition-colors z-20"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

      <div className="p-8 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-32 h-32 bg-gold-start/5 blur-3xl rounded-full -me-16 -mt-16 pointer-events-none" />
        <div className="flex items-center gap-4 mb-10 group cursor-default relative z-10">
          <div className={cn(
            "w-14 h-14 flex items-center justify-center font-bold shadow-2xl theme-radius transition-all duration-700 shrink-0",
            theme === 'dark' ? "text-bg-deep bg-gold-gradient logo-3d border border-gold-start/20" : "text-white shadow-2xl"
          )} style={{ backgroundColor: activeColor }}>
            <Scale className="w-8 h-8" />
          </div>
          <div className="flex flex-col">
            <h2 className={cn(
              "text-[32px] font-serif font-black uppercase tracking-widest leading-none transition-colors duration-500",
              theme === 'dark' ? "text-gold-start" : "text-lite-accent"
            )} style={{ color: activeColor }}>
              {isAr ? 'ماعت' : 'MAAT'}
            </h2>
            <div className={cn(
              "h-[1.5px] w-12 mt-2 transition-all duration-500",
              theme === 'dark' ? "bg-gold-start/40" : "bg-lite-accent/40"
            )} style={{ backgroundColor: theme === 'light' ? `${textColor}66` : undefined }} />
            <div className="flex flex-col mt-2 opacity-50">
              <span className="text-[12px] font-bold tracking-[0.2em] leading-tight whitespace-nowrap caps">
                MEZAN AI ADALA TECH
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={onNewSession}
          className={cn(
            "w-full flex items-center justify-center gap-3 py-4 px-4 transition-all border group relative overflow-hidden active:scale-[0.98] theme-radius",
            theme === 'dark' 
              ? "bg-bg-soft/40 hover:bg-gold-start/10 text-gold-start border-gold-start/20" 
              : "bg-white hover:bg-lite-bg/50 border-lite-border shadow-sm"
          )}
          style={{ 
            color: activeColor,
            borderColor: theme === 'light' ? `${textColor}20` : undefined
          }}
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform relative z-10" />
          <span className="text-[14px] font-bold caps tracking-[0.2em] relative z-10">
            {isAr ? 'بدء جديد' : 'New Session'}
          </span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-2">
        <div className="px-6 py-2">
          <span className="text-[9px] caps font-black tracking-[0.3em] text-gold-start/40 mb-4 block">Workflows</span>
          <nav className="space-y-1.5 pb-6">
            {menuItems.map((wf) => (
              <button
                key={wf.id}
                onClick={() => onWorkflowChange(wf.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-2.5 text-[14px] smooth-tab group relative theme-radius transition-all border border-transparent",
                  currentWorkflow === wf.id 
                    ? (theme === 'dark' ? "text-gold-start shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]" : "active text-primary-action")
                    : (theme === 'dark' ? "text-text-muted/60 opacity-80 hover:opacity-100 hover:bg-bg-soft/30" : "text-lite-text-muted hover:bg-black/5")
                )}
                style={{ 
                  color: currentWorkflow === wf.id ? textColor : undefined,
                }}
              >
                {currentWorkflow === wf.id && (
                  <motion.div 
                    layoutId="workflow-active-bg"
                    className={cn(
                      "absolute inset-0 theme-radius border",
                      theme === 'dark' ? "bg-bg-soft/80 border-gold-start/10" : "bg-primary-action/5 border-primary-action/20"
                    )}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                {currentWorkflow === wf.id && (
                  <motion.div 
                    layoutId="active-bar"
                    className={cn(
                      "absolute top-3 bottom-3 w-1 rounded-full relative z-10",
                      "start-0",
                      theme === 'dark' ? "bg-gold-start" : "bg-primary-action"
                    )} 
                    style={{ backgroundColor: textColor }}
                  />
                )}
                <wf.icon className={cn("w-4 h-4 transition-all duration-500 relative z-10", currentWorkflow === wf.id ? "scale-110" : "text-text-muted/30 group-hover:scale-105")} 
                  style={{ 
                    color: currentWorkflow === wf.id ? textColor : undefined,
                  }}
                />
                <span className={cn("font-medium tracking-wide text-[16px] relative z-10", currentWorkflow === wf.id && "font-bold")}>
                  {wf.label[language]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="px-6 pb-12 pt-2 border-t border-border-subtle/10 mt-auto">
          <span className="text-[9px] caps font-black tracking-[0.3em] text-gold-start/40 mb-4 block">{isAr ? 'تفضيلات النظام' : 'System Configuration'}</span>
          
          <div className={cn(
            "flex p-1 border theme-radius mb-4 transition-all relative overflow-hidden",
            theme === 'dark' ? "bg-bg-soft/50 border-border-subtle/50" : "bg-lite-bg border-lite-border shadow-sm"
          )} style={{ borderColor: theme === 'light' ? `${textColor}15` : undefined }}>
             {['en', 'ar'].map((l) => (
               <button 
                 key={l}
                 onClick={() => onLanguageChange(l as Language)}
                 className={cn(
                   "flex-1 py-1.5 text-[12px] font-bold caps transition-all relative z-10",
                   language === l 
                    ? (theme === 'dark' ? "text-gold-start" : "text-white") 
                    : "hover:text-text-main opacity-70"
                 )}
               >
                 {language === l && (
                   <motion.div 
                     layoutId="sidebar-lang-active"
                     className={cn(
                       "absolute inset-0 theme-radius",
                       theme === 'dark' ? "bg-bg-deep shadow-sm" : ""
                     )}
                     style={{ backgroundColor: theme === 'light' ? textColor : undefined }}
                   />
                 )}
                 <span className="relative z-10">{l.toUpperCase()}</span>
               </button>
             ))}
          </div>

          <button 
            onClick={onThemeToggle}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2 border theme-radius mb-4 transition-all group",
              theme === 'dark' ? "bg-bg-soft/50 border-border-subtle/50 hover:border-gold-start/30" : "bg-white border-lite-border shadow-sm"
            )}
            style={{ borderColor: theme === 'light' ? `${textColor}15` : undefined }}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-gold-start" /> : <Sun className="w-4 h-4" style={{ color: textColor }} />}
              <span className="text-[13px] font-bold caps tracking-wider">
                {isAr ? (theme === 'dark' ? 'ليلي' : 'نهاري') : (theme === 'dark' ? 'Night' : 'Day')}
              </span>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full border relative transition-all",
              theme === 'dark' ? "bg-bg-deep border-border-subtle" : "bg-lite-bg border-lite-border active shadow-inner"
            )} style={{ 
              borderColor: theme === 'light' ? `${textColor}20` : undefined,
              backgroundColor: theme === 'light' ? `${textColor}10` : undefined
            }}>
              <motion.div 
                animate={{ x: theme === 'light' ? 16 : 2 }}
                className={cn("absolute top-0.5 w-2.5 h-2.5 rounded-full", theme === 'dark' ? "bg-gold-start" : "")}
                style={{ backgroundColor: theme === 'light' ? textColor : undefined }}
              />
            </div>
          </button>

          <div className={cn(
            "w-full flex flex-col gap-3 p-3 border theme-radius mb-4 transition-all",
            theme === 'dark' ? "bg-bg-soft/50 border-border-subtle/50" : "bg-white border-lite-border shadow-sm"
          )} style={{ borderColor: theme === 'light' ? `${textColor}15` : undefined }}>
            <div className="flex items-center gap-2">
              <Palette className={cn("w-4 h-4", theme === 'dark' ? "text-gold-start" : "")} style={{ color: theme === 'light' ? textColor : undefined }} />
              <span className="text-[13px] font-bold caps tracking-wider">
                {isAr ? 'اللون' : 'Color'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onTextColorChange(c.value)}
                  className={cn(
                    "w-5 h-5 rounded-full border transition-all hover:scale-110",
                    textColor === c.value ? (theme === 'dark' ? "border-white shadow-[0_0_8px_rgba(212,175,55,0.3)]" : "border-gray-300 shadow-sm scale-110") : "border-transparent opacity-60"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className={cn(
            "w-full flex items-center justify-between gap-3 px-3 py-2 border theme-radius mb-4 transition-all",
            theme === 'dark' ? "bg-bg-soft/50 border-border-subtle/50" : "bg-white border-lite-border shadow-sm"
          )} style={{ borderColor: theme === 'light' ? `${textColor}15` : undefined }}>
            <div className="flex items-center gap-2">
              <Type className={cn("w-4 h-4", theme === 'dark' ? "text-gold-start" : "")} style={{ color: theme === 'light' ? textColor : undefined }} />
              <span className="text-[13px] font-bold caps tracking-wider">
                {isAr ? 'الخط' : 'Font'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => adjustFont(-0.1)}
                className={cn("p-1 hover:scale-110 active:scale-90 transition-all text-muted-foreground")}
                style={{ color: theme === 'light' ? textColor : undefined }}
              >
                <MinusCircle className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black w-6 text-center">{Math.round(fontScale * 100)}%</span>
              <button 
                onClick={() => adjustFont(0.1)}
                className={cn("p-1 hover:scale-110 active:scale-90 transition-all text-muted-foreground")}
                style={{ color: theme === 'light' ? textColor : undefined }}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {userEmail ? (
            <div className="mb-4">
              <div className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-lg border mb-2 transition-all",
                theme === 'dark' ? "bg-gold-start/5 border-gold-start/20" : "bg-lite-accent/5 border-lite-accent/20"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0",
                  theme === 'dark' ? "bg-gold-start text-bg-deep" : "bg-lite-accent text-white"
                )} style={{ backgroundColor: activeColor, color: theme === 'light' ? 'white' : undefined }}>
                  {userEmail[0].toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black caps tracking-[0.1em] opacity-40">
                    {isAr ? 'المستخدم الحالي' : 'CURRENT USER'}
                  </span>
                  <span className="text-[12px] font-bold truncate tracking-normal normal-case">
                    {userEmail}
                  </span>
                </div>
              </div>
              <button 
                onClick={onShowHistory}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 text-[12px] font-bold uppercase tracking-widest transition-all border theme-radius",
                  theme === 'dark' 
                    ? "text-gold-start bg-gold-start/5 border-gold-start/10 hover:bg-gold-start/10" 
                    : "border-lite-border hover:bg-black/5 bg-lite-bg/50"
                )}
                style={{ 
                  color: activeColor,
                  backgroundColor: theme === 'light' ? `${textColor}08` : undefined,
                  borderColor: theme === 'light' ? `${textColor}15` : undefined
                }}
              >
                <History className="w-4 h-4" />
                {isAr ? 'سجل العمليات' : 'History Log'}
              </button>

              {isAdmin && (
                <button 
                  onClick={onShowMessages}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 text-[12px] font-bold uppercase tracking-widest transition-all border theme-radius mt-2",
                    theme === 'dark' 
                      ? "text-blue-400 bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10" 
                      : "border-lite-border hover:bg-black/5 bg-lite-bg/50"
                  )}
                  style={{ 
                    color: theme === 'light' ? textColor : undefined,
                    backgroundColor: theme === 'light' ? `${textColor}08` : undefined,
                    borderColor: theme === 'light' ? `${textColor}15` : undefined
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Inbox className="w-4 h-4" />
                    {isAr ? 'بريد الطلبات' : 'Messages Log'}
                  </div>
                  {pendingCount > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-bg-deep text-[10px] font-black animate-bounce">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={async () => {
                try {
                  const { signInWithGoogle } = await import('../lib/firebase');
                  await signInWithGoogle();
                } catch {
                  console.log('Login request failed or was cancelled.');
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 text-[12px] font-bold uppercase tracking-widest transition-all mb-2 border theme-radius shadow-md group",
                theme === 'dark' 
                  ? "bg-gold-start text-bg-deep border-gold-start hover:bg-gold-light" 
                  : "bg-lite-accent text-white border-lite-accent hover:opacity-90"
              )}
              style={{ 
                backgroundColor: theme === 'light' ? textColor : undefined,
                borderColor: theme === 'light' ? textColor : undefined
              }}
            >
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              {isAr ? 'دفع الدخول' : 'Sign In'}
            </button>
          )}

          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-[12px] text-text-muted hover:text-red-500 font-bold uppercase tracking-widest transition-all mb-2 border border-transparent hover:border-red-500/20 theme-radius"
          >
            <LogOut className="w-4 h-4" />
            {isAr ? 'خروج' : 'Exit'}
          </button>

          <div className="flex items-center gap-2 px-2 opacity-30 mt-6 justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase">Jurisprudence Base Synced</span>
            </div>
            {userEmail && (
              <div className="flex items-center gap-1.5">
                 <UserIcon className="w-2.5 h-2.5" />
                 <span className="text-[8px] font-bold truncate max-w-[100px]">{userEmail}</span>
              </div>
            )}
            <button 
              onClick={onShowAbout}
              className="p-1 hover:text-gold-start transition-colors"
              title={isAr ? 'عن التطبيق' : 'About App'}
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </motion.aside>
  );
}
