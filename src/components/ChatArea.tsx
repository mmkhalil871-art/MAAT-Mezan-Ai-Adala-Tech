/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  Loader2, 
  Copy, 
  Check, 
  Paperclip,
  Menu,
  FileText,
  Scale,
  Languages,
  Library,
  Sparkles,
  Trash2,
  Sun,
  Moon,
  X,
  Cpu,
  Globe,
  Briefcase,
  TrendingUp,
  Gavel,
  ShieldCheck,
  HeartHandshake,
  UserCog,
  FileCheck,
  Eye,
  ShieldAlert,
  Zap,
  Brain,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Repeat
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, LegalWorkflow, Language, FormType, MessageAction, ResearcherRole } from '../types';
import { RESEARCHER_ROLES, REPHRASE_STYLES } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { downloadAsPDF } from '../lib/exportUtils';
import { ApiKeyVerification } from '../lib/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, files?: File[]) => void;
  onTranslateMessage: (content: string, targetLang: Language) => void;
  onRephraseMessage?: (content: string) => void;
  onSaveToLibrary: (content: string, title?: string) => void;
  isLoading: boolean;
  currentWorkflow: LegalWorkflow;
  formType: FormType;
  onFormTypeChange: (type: FormType) => void;
  rephraseStyle?: string;
  onRephraseStyleChange?: (style: string) => void;
  onActionClick: (action: MessageAction, messageContext: Message) => void;
  onDeleteMessage: (id: string) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activePersona: ResearcherRole;
  onPersonaChange: (persona: ResearcherRole) => void;
  onToggleSidebar?: () => void;
  userEmail?: string | null;
  responseMode: 'latency' | 'thinking';
  onResponseModeChange: (mode: 'latency' | 'thinking') => void;
  apiKeyStatus?: ApiKeyVerification;
  onReverifyKey?: () => void;
}

// Form types are now handled inside the component to support filtering by persona

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  onTranslateMessage,
  onRephraseMessage,
  onSaveToLibrary,
  isLoading, 
  currentWorkflow, 
  language,
  formType,
  onFormTypeChange,
  rephraseStyle = 'legislative',
  onRephraseStyleChange,
  onActionClick,
  onDeleteMessage,
  theme,
  onThemeToggle,
  onLanguageChange,
  activePersona,
  onPersonaChange,
  onToggleSidebar,
  userEmail,
  responseMode,
  onResponseModeChange,
  apiKeyStatus,
  onReverifyKey
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<{file: File, preview?: string}[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatPrintRef = useRef<HTMLDivElement>(null);

  const isAr = language === 'ar';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onSendMessage(input, attachments.map(a => a.file));
      setInput('');
      // Clean up previews
      attachments.forEach(att => {
        if (att.preview) URL.revokeObjectURL(att.preview);
      });
      setAttachments([]);
    }
  };

  const toggleLanguage = () => {
    onLanguageChange(isAr ? 'en' : 'ar');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newAttachments = newFiles.map(file => {
        let preview;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }
        return { file, preview };
      });
      setAttachments(prev => [...prev, ...newAttachments]);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const translations = {
    welcome: isAr ? 'مرحباً بك في ماعت' : 'Welcome to MAAT',
    description: isAr ? 'ميزان العدالة الذكي (ماعت): السيادة القانونية والتحليل التشريعي المعمق.' : 'MAAT: Sovereign Legal AI for Legislative Design and Deep Regulatory Analysis.',
    placeholder: {
      Drafting: isAr ? 'اكتب موضوع الصياغة التشريعية...' : 'Type drafting subject...',
      Regulation: isAr ? 'أدخل تفاصيل التشريع أو اللائحة الجديدة...' : 'Enter details for new regulation/legislation...',
      Forms: isAr ? 'اطلب نموذجاً قانونياً محدداً...' : 'Request a legal form...',
      Translation: isAr ? 'اكتب النص المراد ترجمته...' : 'Text to translate...',
      Summarization: isAr ? 'ارفع ملف الحكم القضائي لتلخيصه...' : 'Upload judicial ruling to summarize...',
      Redrafting: isAr ? 'أدخل أو ارفق النص/المستند المطلوب إعادة صياغته وتحديث أسلوبه...' : 'Enter or attach document/text to rephrase or reformulate...',
      General: isAr ? 'اطرح سؤالاً قانونياً...' : 'Ask a legal question...'
    },
    generating: isAr ? 'جاري التحليل القانوني...' : 'Legal analysis in progress...',
    ministerial: isAr ? 'النظام الاستشاري للذكاء الاصطناعي' : 'Advisory AI System',
    sync: isAr ? 'متصل بالقاعدة القانونية' : 'Legal Base Synced'
  };

  const rawFormTypes: FormType[] = [
    'Contract',
    'Decree',
    'Official Notice',
    'Power of Attorney',
    'Administrative Decision',
    'Info Paper',
    'Policy Paper',
    'Action Plan',
    'Reply for Formal Entities',
    'Regulation',
    'Legal Memo',
    'Legal Opinion',
    'Judgment Summary',
    'Speech',
    'Statement'
  ];

  const availableFormTypes = rawFormTypes.filter(type => {
    if (type === 'Speech' || type === 'Statement') {
      return activePersona === 'Administrator';
    }
    return true;
  });

  return (
    <div className={cn(
      "flex flex-col h-full bg-bg-soft relative transition-all duration-700",
      isAr ? "font-serif" : "font-sans"
    )} dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Cleaner Header - Fixed at top via flex */}
      <header className="flex-none bg-bg-sidebar/80 backdrop-blur-md border-b border-border-subtle px-4 md:px-8 py-4 flex items-center justify-between no-print transition-all z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleSidebar}
            className="p-2 -ms-2 text-text-muted hover:text-gold-start transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center opacity-90 shrink-0 aspect-square">
            <img src="/logo.png" alt="MAAT Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[12px] font-bold text-text-main caps tracking-[0.3em] opacity-80 font-serif text-gold-gradient leading-none">
              {isAr ? 'ماعت' : 'MAAT'}
            </h2>
            <span className="text-[8px] text-text-muted font-bold opacity-40 leading-tight">
              Mezan Ai Adala Tech
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 no-print">
          {/* API Key Status Indicator Badge */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={cn(
              "px-2.5 py-1.5 border transition-all theme-radius font-bold text-[10px] sm:text-[11px] flex items-center gap-1.5 shadow-sm",
              apiKeyStatus?.status === 'valid' && (theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-600/10 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/20"),
              apiKeyStatus?.status === 'quota_exceeded' && (theme === 'dark' ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" : "bg-amber-600/10 border-amber-600/30 text-amber-700 hover:bg-amber-600/20"),
              (apiKeyStatus?.status === 'invalid_key' || apiKeyStatus?.status === 'error') && (theme === 'dark' ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20" : "bg-rose-600/10 border-rose-600/30 text-rose-700 hover:bg-rose-600/20"),
              apiKeyStatus?.status === 'checking' && "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
            )}
            title={isAr ? "حالة مفتاح API" : "API Key Status"}
          >
            {apiKeyStatus?.status === 'checking' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">{isAr ? 'جاري الفحص...' : 'Checking...'}</span>
              </>
            ) : apiKeyStatus?.status === 'valid' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">{isAr ? 'المفتاح: صالح' : 'API Key: Valid'}</span>
              </>
            ) : apiKeyStatus?.status === 'quota_exceeded' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline">{isAr ? 'تجاوز الحصة' : 'Quota Limit'}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="hidden sm:inline">{isAr ? 'مفتاح غير صالح' : 'Key Invalid'}</span>
              </>
            )}
          </button>

          <button 
            onClick={toggleLanguage}
            className={cn(
              "px-3 py-1.5 border transition-all theme-radius font-bold text-[10px] sm:text-[11px] uppercase tracking-wider",
              theme === 'dark' ? "bg-gold-start/10 hover:bg-gold-start/20 border-gold-start/30 text-gold-start" : "bg-lite-accent/10 hover:bg-lite-accent/20 border-lite-accent/30 text-lite-accent"
            )}
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
          
          <button 
            onClick={onThemeToggle}
            className={cn(
              "p-2 border transition-all theme-radius group",
              theme === 'dark' ? "bg-gold-start/10 hover:bg-gold-start/20 border-gold-start/30" : "bg-lite-accent/10 hover:bg-lite-accent/20 border-lite-accent/30"
            )}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-gold-start" /> : <Moon className="w-4 h-4 text-lite-accent" />}
          </button>
        </div>
      </header>

      {/* Messages Scroll Area - Simplified spacing */}
      <div 
        ref={chatPrintRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-12 py-6 sm:py-8 pb-2 scrollbar-prominent print:p-8"
      >
        {messages.length === 0 && (
          <div className="w-full max-w-7xl mx-auto flex flex-col pt-0 md:pt-4">
            <div className="space-y-8 sm:space-y-12">
              <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 sm:p-5 bg-bg-sidebar/30 border border-border-subtle/30 theme-radius flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] caps text-gold-start/60">{isAr ? 'حالة النظام' : 'System Status'}</span>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs md:text-sm font-medium">{isAr ? 'العقدة الوزارية نشطة' : 'Ministerial Node Active'}</span>
                  </div>
                </div>
                <div className="p-3 sm:p-5 bg-bg-sidebar/30 border border-border-subtle/30 theme-radius flex flex-col gap-1">
                  <span className="text-[10px] sm:text-[11px] caps text-gold-start/60">{isAr ? 'قاعدة البيانات القانونية' : 'Legal Database'}</span>
                  <span className="text-xs md:text-sm font-medium">{isAr ? 'تمت مزامنة القاعدة السيادية' : 'Sovereign Base Synced'}</span>
                </div>
                <div 
                  onClick={() => setShowKeyModal(true)}
                  className="p-3 sm:p-5 bg-bg-sidebar/30 border border-border-subtle/30 hover:border-gold-start/40 theme-radius flex flex-col gap-1 cursor-pointer transition-all group"
                  title={isAr ? 'اضغط لعرض تفاصيل المفتاح' : 'Click for API Key details'}
                >
                  <span className="text-[10px] sm:text-[11px] caps text-gold-start/60 group-hover:text-gold-start flex items-center justify-between">
                    <span>{isAr ? 'محرك Gemini AI' : 'Gemini API Engine'}</span>
                    <KeyRound className="w-3 h-3 opacity-60" />
                  </span>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className={cn(
                      "w-1.5 md:w-2 h-1.5 md:h-2 rounded-full animate-pulse",
                      apiKeyStatus?.status === 'valid' ? "bg-emerald-500" :
                      apiKeyStatus?.status === 'quota_exceeded' ? "bg-amber-500" :
                      apiKeyStatus?.status === 'checking' ? "bg-blue-500" : "bg-rose-500"
                    )} />
                    <span className="text-xs md:text-sm font-medium">
                      {apiKeyStatus?.status === 'valid' ? (isAr ? 'المفتاح صالح ومتصل' : 'Key Valid & Ready') :
                       apiKeyStatus?.status === 'quota_exceeded' ? (isAr ? 'تم تجاوز الحصة (429)' : 'Quota Rate Limited') :
                       apiKeyStatus?.status === 'checking' ? (isAr ? 'جاري الفحص...' : 'Checking Status...') :
                       (isAr ? 'مفتاح غير صالح' : 'Invalid / Missing Key')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center flex flex-col items-center py-8">
                <div className="w-[clamp(10rem,30vw,20rem)] aspect-square flex items-center justify-center mb-8 bg-transparent shrink-0">
                  <img src="/logo.png" alt="MAAT Logo" className="w-full h-full object-contain scale-110" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold font-serif text-text-main mb-4 tracking-tight leading-tight">
                  {translations.welcome}
                </h2>
                <p className="text-sm md:text-lg lg:text-xl text-text-muted/70 font-sans tracking-wide max-w-2xl mx-auto leading-relaxed opacity-90">
                  {translations.description}
                </p>
              </div>

              {/* Persona Tabs Block */}
              <div className="w-full p-6 md:p-10 bg-bg-sidebar/20 border border-border-subtle/20 theme-radius flex flex-col items-center gap-6 md:gap-8 relative group">
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gold-gradient opacity-10" />
                
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-8 md:w-16 h-[1px] bg-gold-start/30" />
                    <span className="text-[8px] md:text-[11px] caps font-bold text-gold-start tracking-[0.5em] opacity-70">
                       {isAr ? 'تحديد الدور البحثي' : 'RESEARCHER ROLE SELECTION'}
                    </span>
                    <div className="w-8 md:w-16 h-[1px] bg-gold-start/30" />
                  </div>
                  <h3 className="text-lg md:text-xl font-serif font-black text-text-main flex items-center gap-3">
                    <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-gold-start animate-pulse" />
                    {isAr ? 'أنت الآن تعمل بصفتك:' : 'Now you are acting as:'}
                  </h3>
                  
                  {/* Persona Capability Description */}
                  {RESEARCHER_ROLES.find(r => r.id === activePersona) && (
                    <motion.div 
                      key={activePersona}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] md:text-sm text-center max-w-2xl text-gold-start/80 italic px-6 py-3 bg-gold-start/5 border border-gold-start/10 rounded-xl"
                    >
                      {isAr ? RESEARCHER_ROLES.find(r => r.id === activePersona)?.descriptionAr : RESEARCHER_ROLES.find(r => r.id === activePersona)?.description}
                    </motion.div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 relative z-10 w-full">
                  {RESEARCHER_ROLES.filter(role => role.id !== 'Administrator' || userEmail === 'm.mkhalil871@gmail.com').map((role) => {
                    const icons: Record<string, React.ElementType> = { 
                      Scale, 
                      Cpu, 
                      Globe, 
                      Briefcase, 
                      TrendingUp,
                      Gavel,
                      ShieldCheck,
                      HeartHandshake,
                      UserCog,
                      FileCheck,
                      Eye,
                      Sparkles,
                      ShieldAlert
                    };
                    const Icon = icons[role.icon];
                    const isActive = activePersona === role.id;
                    
                    return (
                      <div key={role.id} className="relative group/role-container">
                        <button
                          onClick={() => onPersonaChange(role.id as ResearcherRole)}
                          className={cn(
                            "flex items-center gap-2 md:gap-4 px-3 md:px-5 py-2 md:py-3 theme-radius transition-all text-[10px] md:text-xs font-bold caps whitespace-nowrap border shadow-sm hover:shadow-xl active:scale-95",
                            isActive 
                              ? (theme === 'dark' ? "bg-gold-start/20 text-gold-start border-gold-start/40 shadow-gold-start/10" : "bg-primary-action text-white border-primary-action") 
                              : "bg-bg-deep/40 text-text-muted border-border-subtle/40 hover:text-text-main hover:bg-bg-sidebar/60 hover:border-gold-start/30"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all duration-500",
                            isActive 
                              ? "bg-gold-start/20" 
                              : "bg-bg-sidebar/40 group-hover/role-container:bg-gold-start/10"
                          )}>
                            {Icon && <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-500 group-hover/role-container:scale-110", isActive ? "scale-110 text-gold-start" : "opacity-40")} />}
                          </div>
                          <span className="tracking-[0.1em]">{isAr ? role.labelAr : role.label}</span>
                        </button>
                        
                        {/* Hover Description Tooltip */}
                        <div className={cn(
                          "absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-bg-deep border border-gold-start/30 theme-radius shadow-2xl z-50 pointer-events-none opacity-0 group-hover/role-container:opacity-100 transition-all duration-300 transform scale-90 group-hover/role-container:scale-100",
                          isAr ? "text-right" : "text-left"
                        )}>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-bg-deep border-b border-r border-gold-start/30" />
                          <p className="text-[10px] md:text-xs font-sans text-text-main leading-relaxed">
                            {isAr ? role.descriptionAr : role.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-gold-start/5 blur-3xl rounded-full opacity-50" />
                <div className="absolute -top-16 -left-16 w-32 h-32 bg-gold-start/5 blur-3xl rounded-full opacity-50" />
              </div>
              
              <div className="h-12 w-full" /> {/* Bottom spacer for scrolling comfort */}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-12 py-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={cn(
                "flex flex-col gap-4 sm:gap-6 w-full max-w-[var(--max-message-width)] mx-auto px-1 sm:px-4 group",
                message.role === 'user' ? "items-end" : "items-start"
              )}
            >
              {/* Message Metadata/Header */}
              <div className={cn(
                "flex items-center gap-3 text-[10px] caps font-bold opacity-40 group-hover:opacity-100 transition-opacity",
                message.role === 'user' ? (isAr ? "flex-row" : "flex-row-reverse") : (isAr ? "flex-row-reverse" : "flex-row")
              )}>
                <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="w-1 h-1 rounded-full bg-gold-start/40" />
                <span>{message.role === 'user' ? (isAr ? 'عضو' : 'CONSULTANT') : (isAr ? 'ماعت السيادي' : 'MAAT ENGINE')}</span>
              </div>

              <div className={cn(
                "w-full flex gap-4 md:gap-8",
                message.role === 'user' ? (isAr ? "flex-row" : "flex-row-reverse") : (isAr ? "flex-row-reverse" : "flex-row")
              )}>
                <div className={cn(
                  "flex-1 min-w-0 flex flex-col gap-4",
                  message.role === 'user' ? (isAr ? "items-start" : "items-end") : (isAr ? "items-end" : "items-start")
                )}>
                  <div className={cn(
                    "p-4 sm:p-8 lg:p-12 text-sm md:text-lg relative w-full transition-all border theme-radius leading-relaxed shadow-sm group/msg",
                    theme === 'dark' 
                      ? "bg-bg-sidebar/80 border-border-subtle/50" 
                      : "bg-white border-lite-border shadow-md",
                    message.role === 'assistant' && "analytical-gradient relative"
                  )}>
                    {message.role === 'assistant' ? (
                      <>
                        <div className="markdown-body text-base md:text-lg">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {message.isResult && (
                          <div className="mt-12 pt-8 border-t border-border-subtle/30 flex flex-col items-center text-center">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-8 h-[1px] bg-gold-start/20" />
                              <Scale className="w-4 h-4 text-gold-start opacity-30" />
                              <div className="w-8 h-[1px] bg-gold-start/20" />
                            </div>
                            <p className="text-[9px] caps font-bold text-gold-start/40 tracking-[0.4em] leading-loose">
                              OFFICIAL AI DETERMINATION
                              <br />
                              <span className="opacity-60">JURISPRUDENCE AUTHENTICATED</span>
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap font-sans text-text-main leading-relaxed text-base md:text-lg">{message.content}</p>
                    )}

                    {/* Quick Tools */}
                    <div className={cn(
                      "absolute -top-5 opacity-40 group-hover/msg:opacity-100 transition-all flex gap-1 no-print z-20",
                      "end-0"
                    )}>
                      <div className="flex items-center bg-bg-deep border border-border-subtle/50 p-1 rounded-xl shadow-2xl backdrop-blur-md">
                        {message.role === 'assistant' && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(message.content, index);
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title="Copy"
                            >
                              {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 group-hover/tool:scale-110" />}
                            </button>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsPDF(message.content, `MAAT_Output_${index}.pdf`, !!message.isResult);
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title="Export PDF"
                            >
                              <FileText className="w-4 h-4 group-hover/tool:scale-110" />
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onTranslateMessage(message.content, isAr ? 'en' : 'ar');
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title={isAr ? "ترجمة" : "Translate"}
                            >
                              <Languages className="w-4 h-4 group-hover/tool:scale-110" />
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onRephraseMessage) onRephraseMessage(message.content);
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title={isAr ? "إعادة صياغة" : "Rephrase"}
                            >
                              <Repeat className="w-4 h-4 group-hover/tool:rotate-180 transition-transform duration-300" />
                            </button>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveToLibrary(message.content);
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title={isAr ? "حفظ" : "Save"}
                            >
                              <Library className="w-4 h-4 group-hover/tool:scale-110" />
                            </button>

                            <div className="w-[1px] h-4 bg-border-subtle/50 mx-1" />
                          </>
                        )}

                        <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setDeleteConfirmId(message.id);
                           }}
                           className="p-2 hover:text-red-500 text-text-muted transition-all hover:bg-red-500/10 rounded-lg group/tool"
                           title="Delete"
                        >
                           <Trash2 className="w-4 h-4 group-hover/tool:scale-110" />
                        </button>
                      </div>

                      {deleteConfirmId === message.id && (
                        <div className="absolute bottom-full mb-2 bg-bg-deep border border-red-500/50 p-3 rounded-lg shadow-2xl z-30 flex items-center gap-4 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <span className="text-[10px] caps font-bold text-red-500 whitespace-nowrap">Confirm Removal?</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteMessage(message.id);
                                setDeleteConfirmId(null);
                              }} 
                              className="px-3 py-1.5 bg-red-500 text-white text-[9px] caps font-bold rounded shadow-lg hover:bg-red-600 transition-colors"
                            >
                              YES
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }} 
                              className="px-3 py-1.5 bg-bg-sidebar text-text-muted text-[9px] caps font-bold rounded shadow-lg hover:bg-border-subtle transition-colors"
                            >
                              NO
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {message.actions && message.actions.length > 0 && (
                <div className={cn(
                  "flex flex-wrap gap-2 w-full pt-4",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  {message.actions.filter(action => {
                    if (action.formType === 'Speech' || action.formType === 'Statement') {
                      return activePersona === 'Administrator';
                    }
                    return true;
                  }).map(action => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onActionClick(action, message)}
                      className={cn(
                        "px-4 py-2 text-[10px] font-bold caps transition-all flex items-center gap-2 border theme-radius relative overflow-hidden group shadow-sm",
                        action.type === 'workflow' 
                          ? "border-gold-start/20 text-gold-start bg-gold-start/5 hover:bg-gold-start/10" 
                          : "border-emerald-500/20 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                      )}
                    >
                      <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform opacity-60" />
                      {isAr ? action.labelAr : action.label}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {isLoading && (
          <div className={cn("flex gap-4 sm:gap-6 max-w-[var(--max-message-width)] mx-auto items-start px-3 sm:px-4", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className="w-9 h-9 bg-bg-sidebar text-gold-start border border-border-subtle flex items-center justify-center shrink-0 font-bold">
              AI
            </div>
            <div className="flex-1">
              <div className="bg-bg-sidebar/10 border border-border-subtle/30 rounded-sm p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-gold-start/50 animate-spin" />
                  <span className="text-[10px] text-text-muted font-bold caps opacity-50 tracking-[0.3em]">{translations.generating}</span>
                </div>
                <div className="w-full bg-border-subtle/30 h-[1.5px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-gold-start w-1/3 animate-loader" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Minimal Footer for Screen Space */}
      <footer className="bg-bg-sidebar/30 border-t border-border-subtle py-2 px-2 md:px-4 no-print flex flex-col gap-1">
        <form onSubmit={handleSubmit} className="max-w-[var(--max-message-width)] w-full mx-auto relative group flex items-end gap-2">
          
          {/* Form Selector repositioned and made scrollable */}
          {currentWorkflow === 'Forms' && (
            <div className={cn(
              "absolute -top-16 inset-x-0 flex bg-bg-deep/80 backdrop-blur-md border border-border-subtle p-1.5 z-30 transition-all overflow-x-auto no-scrollbar gap-1 theme-radius flex-nowrap",
              "flex-row"
            )}>
              {availableFormTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onFormTypeChange(type)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold transition-all caps whitespace-nowrap shrink-0 theme-radius relative",
                    formType === type ? "text-bg-deep" : "text-text-muted hover:text-text-main hover:bg-bg-sidebar/40"
                  )}
                >
                  {formType === type && (
                    <motion.div 
                      layoutId="form-type-active"
                      className="absolute inset-0 bg-primary-action theme-radius"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{type}</span>
                </button>
              ))}
            </div>
          )}

          {/* Rephrase Style Selector */}
          {currentWorkflow === 'Redrafting' && (
            <div className={cn(
              "absolute -top-16 inset-x-0 flex bg-bg-deep/90 backdrop-blur-md border border-gold-start/40 p-1.5 z-30 transition-all overflow-x-auto no-scrollbar gap-1.5 theme-radius flex-nowrap shadow-xl",
              "flex-row items-center"
            )}>
              <div className="flex items-center gap-1.5 px-2 text-gold-start font-bold text-[10px] caps shrink-0">
                <Repeat className="w-3.5 h-3.5 animate-spin-slow" />
                <span>{isAr ? 'أسلوب الصياغة:' : 'Rephrase Style:'}</span>
              </div>
              {REPHRASE_STYLES.map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onRephraseStyleChange?.(style.id)}
                  title={isAr ? style.descriptionAr : style.description}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold transition-all caps whitespace-nowrap shrink-0 theme-radius relative flex items-center gap-1",
                    rephraseStyle === style.id ? "text-bg-deep font-black shadow-md" : "text-text-muted hover:text-text-main hover:bg-bg-sidebar/40 border border-transparent hover:border-border-subtle/50"
                  )}
                >
                  {rephraseStyle === style.id && (
                    <motion.div 
                      layoutId="rephrase-style-active"
                      className="absolute inset-0 bg-gold-start theme-radius"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{isAr ? style.labelAr : style.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="relative flex-1">
            {/* File Previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 px-4 md:px-8 py-3 mb-1 animate-in fade-in slide-in-from-bottom-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group shrink-0">
                    <div className="w-20 h-20 bg-bg-deep border border-border-subtle/50 theme-radius overflow-hidden flex items-center justify-center">
                      {att.preview ? (
                        <img src={att.preview} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {att.file.name.toLowerCase().endsWith('.pdf') ? (
                            <FileText className="w-8 h-8 text-red-500/60" />
                          ) : att.file.name.toLowerCase().match(/\.(doc|docx)$/) ? (
                            <FileText className="w-8 h-8 text-blue-500/60" />
                          ) : (
                            <FileText className="w-8 h-8 text-gold-start" />
                          )}
                          <span className="text-[8px] font-bold caps opacity-40 px-1 truncate w-full text-center">{att.file.name.split('.').pop()}</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 pointer-events-none transition-colors" />
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={translations.placeholder[currentWorkflow as keyof typeof translations.placeholder] || translations.placeholder.General}
              className={cn(
                "w-full bg-bg-deep/50 border border-border-subtle/60 theme-radius px-4 md:px-8 py-3 md:py-5 ps-14 md:ps-16 pe-14 md:pe-16 text-base md:text-xl placeholder:text-text-muted/30 focus:outline-none focus:border-gold-start/40 focus:bg-bg-deep transition-all min-h-[50px] md:min-h-[60px] max-h-[350px] resize-none leading-relaxed",
                "text-start"
              )}
              style={{ color: 'var(--dynamic-chat-text)' }}
            />
            
            {/* Action Buttons - Send fixed to side relative to container, not text direction */}
            <div className={cn(
              "absolute bottom-4 flex items-center",
              "end-4"
            )}>
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className={cn(
                  "p-2.5 theme-radius transition-all",
                  (input.trim() || attachments.length > 0) && !isLoading 
                    ? "text-primary-action hover:scale-110 active:scale-95" 
                    : "text-text-muted/20 cursor-not-allowed"
                )}
              >
                <Send className={cn("w-4 h-4", isAr && "rotate-180")} />
              </button>
            </div>

            <div className={cn(
              "absolute bottom-4 flex items-center",
              "start-4"
            )}>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".pdf,.doc,.docx,image/*" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-2 text-text-muted transition-all hover:text-gold-start",
                  attachments.length > 0 && "text-gold-start"
                )}
              >
                <Paperclip className="w-4 h-4" />
                {attachments.length > 0 && (
                  <span className={cn("text-[10px] font-black caps ms-1 bg-gold-start text-bg-deep px-1.5 rounded-full scale-90", isAr ? "font-serif" : "font-mono")}>
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
        <div className="max-w-[1500px] w-full mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-text-muted/40 font-bold uppercase tracking-[0.4em] opacity-60 px-2 gap-2 mt-1">
          <span>{translations.ministerial}</span>
          
          {/* Performance Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-bg-sidebar/40 p-0.5 border border-border-subtle rounded-full no-print">
            <button 
              type="button"
              onClick={() => onResponseModeChange('latency')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider transition-all flex items-center gap-1",
                responseMode === 'latency'
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                  : "text-text-muted/50 hover:text-text-main border border-transparent"
              )}
            >
              <Zap className="w-2.5 h-2.5" />
              {isAr ? "استجابة سريعة" : "Low Latency"}
            </button>
            <button 
              type="button"
              onClick={() => onResponseModeChange('thinking')}
              className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider transition-all flex items-center gap-1",
                responseMode === 'thinking'
                  ? "bg-gold-start/10 text-gold-start border border-gold-start/30"
                  : "text-text-muted/50 hover:text-text-main border border-transparent"
              )}
            >
              <Brain className="w-2.5 h-2.5" />
              {isAr ? "تفكير عميق" : "High Thinking"}
            </button>
          </div>

          <span className="text-emerald-500/50">Verified</span>
        </div>
      </footer>

      {/* API Key Status Details Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-bg-sidebar border border-border-subtle rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
            <button 
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-main p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-xl border shrink-0",
                apiKeyStatus?.status === 'valid' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                apiKeyStatus?.status === 'quota_exceeded' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                apiKeyStatus?.status === 'checking' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                "bg-rose-500/10 border-rose-500/30 text-rose-400"
              )}>
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-text-main">
                  {isAr ? 'حالة مفتاح Gemini API' : 'Gemini API Key Status'}
                </h3>
                <p className="text-xs text-text-muted">
                  {isAr ? 'فحص تلقائي مباشر لاستجابة وصلاحية المفتاح' : 'Real-time ping verification'}
                </p>
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-lg border text-xs leading-relaxed space-y-2",
              apiKeyStatus?.status === 'valid' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300" :
              apiKeyStatus?.status === 'quota_exceeded' ? "bg-amber-500/5 border-amber-500/20 text-amber-300" :
              apiKeyStatus?.status === 'checking' ? "bg-blue-500/5 border-blue-500/20 text-blue-300" :
              "bg-rose-500/5 border-rose-500/20 text-rose-300"
            )}>
              <div className="flex items-center justify-between font-bold text-sm">
                <span>
                  {apiKeyStatus?.status === 'valid' ? (isAr ? '✅ المفتاح صالح ومستجيب' : '✅ API Key Valid & Functional') :
                   apiKeyStatus?.status === 'quota_exceeded' ? (isAr ? '⚠️ تجاوز حد الحصة (429 Quota)' : '⚠️ API Key Quota Exceeded (429)') :
                   apiKeyStatus?.status === 'checking' ? (isAr ? '🔄 جاري الفحص...' : '🔄 Verifying Key...') :
                   (isAr ? '❌ المفتاح غير صالح أو غير موجود' : '❌ API Key Invalid or Missing')}
                </span>
              </div>
              <p className="opacity-90">{apiKeyStatus?.message}</p>
            </div>

            {apiKeyStatus?.status !== 'valid' && (
              <div className="bg-bg-deep/50 p-4 rounded-lg border border-border-subtle/50 text-xs space-y-2 text-text-muted">
                <span className="font-bold text-text-main block">
                  {isAr ? 'خطوات تحديث وإصلاح المفتاح:' : 'How to resolve / update key:'}
                </span>
                <ol className="list-decimal list-inside space-y-1.5 opacity-90 leading-normal">
                  <li>
                    {isAr ? 'احصل على مفتاح جديد من ' : 'Generate a key at '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-gold-start underline inline-flex items-center gap-1 font-semibold hover:text-gold-gradient"
                    >
                      Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>{isAr ? 'افتح لوحة Settings > Secrets في AI Studio (أسفل اليسار).' : 'Open Settings > Secrets in AI Studio (bottom-left).'}</li>
                  <li>{isAr ? 'أضف/حدّث المفتاح تحت اسم GEMINI_API_KEY.' : 'Set or update GEMINI_API_KEY.'}</li>
                </ol>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={async () => {
                  setIsReverifying(true);
                  if (onReverifyKey) await onReverifyKey();
                  setIsReverifying(false);
                }}
                disabled={isReverifying}
                className="px-4 py-2 bg-gold-start/10 hover:bg-gold-start/20 border border-gold-start/30 text-gold-start text-xs font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isReverifying && "animate-spin")} />
                {isAr ? 'إعادة الفحص الآن' : 'Re-verify Now'}
              </button>

              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 bg-bg-deep hover:bg-border-subtle/30 text-text-main text-xs font-bold rounded-lg border border-border-subtle transition-all"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
