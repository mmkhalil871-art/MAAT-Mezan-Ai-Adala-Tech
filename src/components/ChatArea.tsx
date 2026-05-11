/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Send, 
  Loader2, 
  Scale, 
  Copy, 
  Check, 
  Paperclip,
  Menu,
  FileText,
  FileDown,
  Languages,
  Library,
  Sparkles,
  Trash2,
  Sun,
  Moon,
  HelpCircle,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message, LegalWorkflow, Language, FormType, MessageAction } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { downloadAsPDF } from '../lib/exportUtils';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (content: string, files?: File[]) => void;
  onTranslateMessage: (content: string, targetLang: Language) => void;
  onSaveToLibrary: (content: string, title?: string) => void;
  isLoading: boolean;
  currentWorkflow: LegalWorkflow;
  formType: FormType;
  onFormTypeChange: (type: FormType) => void;
  onActionClick: (action: MessageAction, messageContext: Message) => void;
  onDeleteMessage: (id: string) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar?: () => void;
}

const formTypes: FormType[] = [
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
  'Legal Opinion'
];

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  onTranslateMessage,
  onSaveToLibrary,
  isLoading, 
  currentWorkflow, 
  language,
  formType,
  onFormTypeChange,
  onActionClick,
  onDeleteMessage,
  theme,
  onThemeToggle,
  onLanguageChange,
  onToggleSidebar
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<{file: File, preview?: string}[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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
      General: isAr ? 'اطرح سؤالاً قانونياً...' : 'Ask a legal question...'
    },
    generating: isAr ? 'جاري التحليل القانوني...' : 'Legal analysis in progress...',
    ministerial: isAr ? 'النظام الاستشاري للذكاء الاصطناعي' : 'Advisory AI System',
    sync: isAr ? 'متصل بالقاعدة القانونية' : 'Legal Base Synced'
  };

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
          
          <div className="w-8 h-8 flex items-center justify-center opacity-80">
            <Scale className="w-6 h-6 text-gold-start" />
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
        className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-12 py-6 sm:py-8 pb-2 space-y-8 sm:space-y-12 scrollbar-prominent print:p-8"
      >
        {messages.length === 0 && (
          <div className="max-w-5xl mx-auto mt-2 md:mt-4 flex flex-col items-center">
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-bg-sidebar/40 border border-border-subtle/50 theme-radius flex flex-col gap-1">
                <span className="text-[9px] caps text-gold-start/60">{isAr ? 'حالة النظام' : 'System Status'}</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium">{isAr ? 'العقدة الوزارية نشطة' : 'Ministerial Node Active'}</span>
                </div>
              </div>
              <div className="p-3 bg-bg-sidebar/40 border border-border-subtle/50 theme-radius flex flex-col gap-1">
                <span className="text-[9px] caps text-gold-start/60">{isAr ? 'قاعدة البيانات القانونية' : 'Legal Database'}</span>
                <span className="text-xs font-medium">{isAr ? 'تمت مزامنة القاعدة السيادية' : 'Sovereign Base Synced'}</span>
              </div>
              <div className="p-3 bg-bg-sidebar/40 border border-border-subtle/50 theme-radius flex flex-col gap-1">
                <span className="text-[9px] caps text-gold-start/60">{isAr ? 'مجمع المعالجة' : 'Processing Pool'}</span>
                <span className="text-xs font-medium">{isAr ? '99.9% معدل النزاهة' : '99.9% Integrity Rate'}</span>
              </div>
            </div>

            <div className="mb-6 text-center flex flex-col items-center">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-gold-start/5 rounded-full flex items-center justify-center mb-2 logo-3d border border-gold-start/10">
                <Scale className="w-6 h-6 md:w-7 md:h-7 text-gold-start" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold font-serif text-text-main mb-1 tracking-tight leading-tight">
                {translations.welcome}
              </h2>
              <p className="text-xs md:text-sm text-text-muted/60 font-sans tracking-wide max-w-xl leading-relaxed opacity-80">
                {translations.description}
              </p>
            </div>
            
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center gap-3 px-2 mb-1">
                <Sparkles className="w-3 h-3 text-gold-start" />
                <span className="text-[10px] caps font-bold text-text-muted">{isAr ? 'مسار عمل سريع' : 'Accelerated Workflows'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: FileText, title: isAr ? "صياغة تشريعية" : "Legislative Drafting", desc: isAr ? "إعداد قرارات وزارية ومراسيم" : "Prepare ministerial decrees & legislation", prompt: isAr ? "صياغة قرار جديد للمناطق الاستثمارية." : "Draft a new decree for investment zones." },
                  { icon: Sparkles, title: isAr ? "تحليل قضائي" : "Judicial Analysis", desc: isAr ? "تلخيص أحكام وتحديد ثغرات" : "Summarize rulings & identify gaps", prompt: isAr ? "لخص هذا الحكم في مذكرة قانونية." : "Summarize this judicial ruling into a memo." },
                  { icon: FileDown, title: isAr ? "خطاب رسمي/قانوني" : "Formal/Legal Letter", desc: isAr ? "صياغة خطابات رسمية أو قانونية" : "Draft formal or legal correspondence", prompt: isAr ? "إعداد خطاب رسمي موجه إلى..." : "Draft a formal letter addressed to..." },
                  { icon: Languages, title: isAr ? "ترجمة قانونية" : "Legal Translation", desc: isAr ? "ترجمة دقيقة للنصوص السيادية" : "Accurate translation of sovereign texts", prompt: isAr ? "ترجمة رسمية لهذا البند..." : "Formal translation of this clause..." },
                  { icon: HelpCircle, title: isAr ? "سؤال قانوني" : "Ask a legal question", desc: isAr ? "إجابات فورية على استفسارات قانونية" : "Instant answers to legal queries", prompt: isAr ? "أريد طرح سؤال قانوني بخصوص..." : "I would like to ask a legal question regarding..." }
                ].map((action, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(action.prompt)}
                    className={cn(
                      "p-4 border border-border-subtle/50 theme-radius transition-all text-left flex items-start gap-3 hover:border-gold-start/40 hover:bg-bg-sidebar/40 group",
                      theme === 'dark' ? "bg-bg-sidebar/20" : "bg-white shadow-sm hover:shadow-md"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gold-start/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <action.icon className="w-4 h-4 text-gold-start" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-text-main group-hover:text-gold-start transition-colors">{action.title}</span>
                      <span className="text-[10px] text-text-muted leading-relaxed opacity-70">{action.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
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
                              title="Translate"
                            >
                              <Languages className="w-4 h-4 group-hover/tool:scale-110" />
                            </button>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveToLibrary(message.content);
                              }}
                              className="p-2 hover:text-gold-start text-text-muted transition-all hover:bg-gold-start/10 rounded-lg group/tool"
                              title="Save"
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
                  "flex flex-wrap gap-2 w-full pt-2",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  {message.actions.map(action => (
                    <motion.button
                      key={action.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onActionClick(action, message)}
                      className={cn(
                        "px-6 py-2.5 text-[10px] font-bold caps transition-all flex items-center gap-2 border theme-radius bg-bg-sidebar relative overflow-hidden group",
                        action.type === 'workflow' 
                          ? "border-gold-start/20 text-gold-start hover:bg-gold-start/10" 
                          : "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
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
              {formTypes.map(type => (
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
        <div className="max-w-[1500px] mx-auto flex justify-between items-center text-[10px] text-text-muted/40 font-bold uppercase tracking-[0.4em] opacity-60 px-2">
          <span>{translations.ministerial}</span>
          <span className="text-emerald-500/50">Verified</span>
        </div>
      </footer>
    </div>
  );
}
