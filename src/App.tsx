/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import LibraryPanel from './components/LibraryPanel';
import HistoryPanel from './components/HistoryPanel';
import AboutModal from './components/AboutModal';
import { WORKFLOW_ACTIONS, OUTCOME_ACTIONS } from './constants';
import { Message, LegalWorkflow, Language, FormType, MessageAction } from './types';
import { getLegalAssistantResponse, getLegalMultimodalResponse } from './lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { auth, LibraryItem } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Scale } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<LegalWorkflow>('General');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontScale, setFontScale] = useState(1);
  const [textColor, setTextColor] = useState<string>('#E6C682');
  const [formType, setFormType] = useState<FormType>('Contract');
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [pendingContent, setPendingContent] = useState<{ content: string; files?: File[] } | null>(null);
  const [hasDismissedWelcome, setHasDismissedWelcome] = useState(false);

  // Theme defaults for text color
  const DAY_DEFAULT = '#0A1B3D';
  const NIGHT_DEFAULT = '#E6C682'; // Golden Font Default

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      // Reset color to theme default when switching to prevent legibility issues
      setTextColor(newTheme === 'dark' ? NIGHT_DEFAULT : DAY_DEFAULT);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
  }, [fontScale]);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.style.setProperty('--color-lite-text', textColor);
      document.documentElement.style.setProperty('--color-lite-accent', textColor);
      document.documentElement.style.setProperty('--dynamic-chat-text', textColor);
    } else {
      // In Night mode, allow the selected light color palette to take effect
      document.documentElement.style.setProperty('--color-text-main', textColor);
      document.documentElement.style.setProperty('--dynamic-chat-text', textColor);
    }
  }, [textColor, theme]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
      document.documentElement.classList.add('light');
    } else {
      document.body.classList.remove('light');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const isAr = language === 'ar';
  
  const handleSaveToLibrary = useCallback(async (content: string, title?: string) => {
    try {
      const defaultTitle = title || (isAr ? `نص مستخرج - ${new Date().toLocaleDateString('ar-EG')}` : `Extracted Text - ${new Date().toLocaleDateString()}`);
      
      const item: Omit<LibraryItem, 'id' | 'timestamp'> = {
        title: defaultTitle,
        content: content,
        type: (currentWorkflow.toLowerCase().includes('regulation') ? 'regulation' : 
               currentWorkflow.toLowerCase().includes('draft') ? 'decree' : 'recommendation') as LibraryItem['type'],
        uploadedBy: user?.email || 'unknown',
        isPublic: true,
        relatedTo: []
      };
      
      const { addToLibrary } = await import('./lib/firebase');
      await addToLibrary(item);
      alert(isAr ? 'تم الحفظ في المكتبة بنجاح.' : 'Successfully saved to Library.');
    } catch (error) {
      console.error('Failed to save to library:', error);
      alert(isAr ? 'فشل الحفظ في المكتبة.' : 'Failed to save to library.');
    }
  }, [user, currentWorkflow, isAr]);

  const processLegalTask = useCallback(async (content: string, files: File[] | undefined, workflow: LegalWorkflow) => {
    setIsLoading(true);
    try {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        workflow,
        timestamp: Date.now(),
        formType: workflow === 'Forms' ? formType : undefined
      };
      
      const newMessages = [...messages, userMessage];
      let aiResponse: string;
      
      if (files && files.length > 0) {
        aiResponse = await getLegalMultimodalResponse(newMessages, files, workflow, formType, language);
      } else {
        aiResponse = await getLegalAssistantResponse(newMessages, workflow, formType, language);
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiResponse,
        workflow,
        timestamp: Date.now(),
        actions: OUTCOME_ACTIONS, // Ask what to do with the outcome
        isResult: true
      };

      setMessages(prev => [...prev.filter(m => m.role !== 'system'), userMessage, assistantMessage]);
    } catch (error: unknown) {
      console.error('Legal AI Error:', error);
      const errorDetail = (error as Error)?.message || "Unknown connectivity issue.";
      setMessages(prev => [...prev.filter(m => m.role !== 'system'), {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `**Identity Error:** Connection to ministerial jurisprudence engine failed.\n\n*Technical Detail: ${errorDetail}*`,
        workflow: 'General',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, formType, language]);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    // 1. Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      workflow: currentWorkflow,
      timestamp: Date.now()
    };
    
    // Check if this is a follow-up (we are already in a workflow and not waiting for a dispatcher choice)
    const isFollowUp = messages.length > 0 && !pendingContent;

    if (isFollowUp) {
      setMessages(prev => [...prev, userMsg]);
      await processLegalTask(content, files, currentWorkflow);
      return;
    }

    // 2. Dispatcher logic for new inputs
    setMessages(prev => [...prev, userMsg]);
    setPendingContent({ content, files });
    
    const dispatcherMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: isAr 
        ? "لقد استلمت المحتوى الخاص بك. كيف ترغب في المتابعة؟ يرجى اختيار أحد الخيارات المتاحة في التطبيق:" 
        : "I have received your content. How would you like to proceed? Please select one of the available options in the app:",
      workflow: 'General',
      timestamp: Date.now() + 1,
      actions: WORKFLOW_ACTIONS
    };

    setTimeout(() => {
      setMessages(prev => [...prev, dispatcherMsg]);
    }, 500);
  }, [currentWorkflow, isAr, messages, pendingContent, processLegalTask]);

  const handleActionClick = useCallback(async (action: MessageAction, context: Message) => {
    if (action.type === 'workflow') {
      const workflow = action.value as LegalWorkflow;
      setCurrentWorkflow(workflow);
      if (pendingContent) {
        await processLegalTask(pendingContent.content, pendingContent.files, workflow);
        setPendingContent(null);
      }
    } else if (action.type === 'output') {
      if (action.value === 'save') {
        handleSaveToLibrary(context.content);
      } else if (action.value === 'export_pdf') {
        const { downloadAsPDF } = await import('./lib/exportUtils');
        downloadAsPDF(context.content, `legal_doc.pdf`, !!context.isResult);
      } else if (action.value === 'memo') {
         // Follow up
         await processLegalTask(`Re-draft the previous response into a formal Legal Memo format.`, undefined, 'Forms');
      } else if (action.value === 'policy') {
         await processLegalTask(`Reformulate the previous analysis into a Policy Paper for parliamentary review.`, undefined, 'Forms');
      } else if (action.value === 'action_plan') {
         await processLegalTask(`Generate an implementation Action Plan for the previous legal outcome.`, undefined, 'Forms');
      }
    }
  }, [pendingContent, processLegalTask, handleSaveToLibrary]);

  const handleTranslateMessage = useCallback(async (content: string, targetLang: Language) => {
    setIsLoading(true);
    const targetLangFull = targetLang === 'ar' ? 'Arabic' : 'English';
    const translationPrompt = `Please translate the following legal outcome into ${targetLangFull}. Maintain the formal legal tone and structure.
    
    CONTENT TO TRANSLATE:
    ${content}`;

    try {
      const translation = await getLegalAssistantResponse([{ id: 'temp-id', role: 'user', content: translationPrompt, timestamp: Date.now() }], 'Translation');
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: translation,
        workflow: 'Translation',
        timestamp: Date.now(),
        isResult: true,
        actions: OUTCOME_ACTIONS
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLanguage(targetLang);
    } catch (error) {
      console.error('Translation Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setCurrentWorkflow('General');
    setPendingContent(null);
  }, []);

  const handleExit = useCallback(async () => {
    try {
      const { logout: firebaseLogout } = await import('./lib/firebase');
      await firebaseLogout();
      setHasDismissedWelcome(false);
      startNewSession();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if firebase logout fails, we should still allow guest reset
      setHasDismissedWelcome(false);
    }
  }, []);

  if (isAuthChecking) {
    return (
      <div className="h-[100dvh] w-full bg-bg-deep flex items-center justify-center">
        <Scale className="w-12 h-12 text-gold-start animate-pulse opacity-20" />
      </div>
    );
  }

  if (!user && !hasDismissedWelcome) {
    return (
      <LoginPage 
        onLogin={() => setHasDismissedWelcome(true)} 
        theme={theme} 
        onThemeToggle={toggleTheme}
        isAr={isAr}
        toggleLanguage={() => setLanguage(prev => prev === 'ar' ? 'en' : 'ar')}
        onGuestAccess={() => setHasDismissedWelcome(true)}
      />
    );
  }

  return (
    <div 
      className={cn(
        "flex h-[100dvh] w-full bg-bg-deep overflow-hidden text-text-main selection:bg-gold-start/30 antialiased",
        isAr ? "font-arabic" : "font-sans"
      )}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentWorkflow={currentWorkflow} 
        onWorkflowChange={setCurrentWorkflow} 
        onNewSession={startNewSession}
        language={language}
        onLanguageChange={setLanguage}
        userEmail={user?.email}
        onLogout={handleExit}
        onShowHistory={() => setShowHistory(true)}
        onShowAbout={() => setShowAbout(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        textColor={textColor}
        onTextColorChange={setTextColor}
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative bg-bg-deep/50 h-[100dvh] overflow-hidden">
        <div className="w-full h-full flex flex-col relative bg-bg-deep/40 backdrop-blur-md overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${currentWorkflow}-${language}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex-1 overflow-hidden"
            >
              {currentWorkflow === 'Admin' ? (
                <AdminPanel />
              ) : currentWorkflow === 'Library' ? (
                <LibraryPanel language={language} />
              ) : (
                <ChatArea 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  onTranslateMessage={handleTranslateMessage}
                  onSaveToLibrary={handleSaveToLibrary}
                  isLoading={isLoading}
                  currentWorkflow={currentWorkflow}
                  language={language}
                  formType={formType}
                  onFormTypeChange={setFormType}
                  onActionClick={handleActionClick}
                  onDeleteMessage={handleDeleteMessage}
                  theme={theme}
                  onThemeToggle={toggleTheme}
                  onLanguageChange={setLanguage}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Overlay Components */}
        <AnimatePresence>
          {showHistory && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 right-0 w-96 z-[60]"
            >
              <HistoryPanel 
                language={language} 
                onClose={() => setShowHistory(false)}
                onReuse={() => {
                  // If reuse is triggered, we can populate draft or library
                  setShowHistory(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAbout && (
            <AboutModal 
              theme={theme}
              language={language}
              onClose={() => setShowAbout(false)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Subtle UI Accents */}
      <div className="fixed top-0 right-0 p-1 pointer-events-none opacity-5 no-print">
        <div className="w-[800px] h-[800px] bg-gold-start/10 rounded-full blur-[150px] -mr-96 -mt-96" />
      </div>
    </div>
  );
}
