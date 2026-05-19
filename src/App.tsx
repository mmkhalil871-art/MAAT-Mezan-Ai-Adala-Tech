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
import MessagesPanel from './components/MessagesPanel';
import AboutModal from './components/AboutModal';
import HowToUseModal from './components/HowToUseModal';
import { Message, LegalWorkflow, Language, FormType, MessageAction, ResearcherRole } from './types';
import { WORKFLOW_ACTIONS, OUTCOME_ACTIONS } from './constants';
import { streamLegalResponse } from './lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { auth, LibraryItem } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Scale, Mic } from 'lucide-react';
import VoiceConversation from './components/VoiceConversation';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<LegalWorkflow>('General');
  const [activePersona, setActivePersona] = useState<ResearcherRole>('LegalResearcher');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontScale, setFontScale] = useState(1);
  const [textColor, setTextColor] = useState<string>('#E6C682');
  const [formType, setFormType] = useState<FormType>('Contract');
  const [showHistory, setShowHistory] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
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
    const assistantId = crypto.randomUUID();
    
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
      setMessages(prev => [...prev.filter(m => m.role !== 'system'), userMessage]);

      let accumulatedResponse = "";
      
      // Initialize assistant message placeholder
      const initialAssistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: "",
        workflow,
        timestamp: Date.now(),
        isResult: false
      };
      setMessages(prev => [...prev, initialAssistantMessage]);

      const aiResponse = await streamLegalResponse(
        newMessages, 
        workflow, 
        formType, 
        language, 
        activePersona, 
        files,
        (chunk) => {
          accumulatedResponse += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantId ? { ...m, content: accumulatedResponse } : m
          ));
        }
      );

      // Final update with actions and isResult
      setMessages(prev => prev.map(m => 
        m.id === assistantId ? { 
          ...m, 
          content: aiResponse, 
          actions: OUTCOME_ACTIONS,
          isResult: true 
        } : m
      ));

      // Save to chat history if user is logged in
      if (user?.email) {
        import('./lib/firebase').then(({ saveChatHistory }) => {
          saveChatHistory({
            userEmail: user.email!,
            userMessage: content,
            aiResponse: aiResponse,
            workflow: workflow
          }).catch(err => console.error('Failed to auto-save history:', err));
        });
      }
    } catch (error: unknown) {
      console.error('Legal AI Error:', error);
      const errorDetail = (error as Error)?.message || "Unknown connectivity issue.";
      
      // Remove the partial assistant message if it failed at the start
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== assistantId);
        return [...filtered, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `**Identity Error:** Connection to ministerial jurisprudence engine failed.\n\n*Technical Detail: ${errorDetail}*`,
          workflow: 'General',
          timestamp: Date.now(),
        }];
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, formType, language, activePersona, user]);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      workflow: currentWorkflow,
      timestamp: Date.now()
    };
    
    // Check if this is a follow-up OR if a specific workflow was already selected from the UI
    const isFollowUp = messages.length > 0 && !pendingContent;
    const isDirectWorkflow = currentWorkflow !== 'General';

    if (isFollowUp || isDirectWorkflow) {
      setMessages(prev => [...prev, userMsg]);
      await processLegalTask(content, files, currentWorkflow);
      return;
    }

    // Dispatcher logic for new inputs
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
      if (action.formType) {
        setFormType(action.formType);
      }
      if (pendingContent) {
        await processLegalTask(pendingContent.content, pendingContent.files, workflow);
        setPendingContent(null);
      } else {
        // If triggered as an outcome action without pending content, 
        // use the last user message as the basis for the new workflow task
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        if (lastUserMsg) {
          await processLegalTask(lastUserMsg.content, undefined, workflow);
        }
      }
    } else if (action.type === 'output') {
      if (action.value === 'save') {
        handleSaveToLibrary(context.content);
      } else if (action.value === 'export_pdf') {
        const { downloadAsPDF } = await import('./lib/exportUtils');
        downloadAsPDF(context.content, `legal_doc.pdf`, !!context.isResult);
      }
    }
  }, [pendingContent, processLegalTask, handleSaveToLibrary, messages]);

  const handleTranslateMessage = useCallback(async (content: string, targetLang: Language) => {
    setIsLoading(true);
    const targetLangFull = targetLang === 'ar' ? 'Arabic' : 'English';
    const translationPrompt = `Please translate the following legal outcome into ${targetLangFull}. Maintain the formal legal tone and structure.
    
    CONTENT TO TRANSLATE:
    ${content}`;

    try {
      const translation = await streamLegalResponse(
        [{ id: 'temp-id', role: 'user', content: translationPrompt, timestamp: Date.now() }], 
        'Translation', 
        undefined, 
        targetLang, 
        activePersona
      );
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: translation,
        workflow: 'Translation',
        timestamp: Date.now(),
        actions: OUTCOME_ACTIONS,
        isResult: true
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
        onShowMessages={() => setShowMessages(true)}
        onShowAbout={() => setShowAbout(true)}
        onShowHowToUse={() => setShowHowToUse(true)}
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
                <LibraryPanel 
                  language={language} 
                />
              ) : currentWorkflow === 'History' ? (
                <HistoryPanel 
                  language={language} 
                  onClose={() => setCurrentWorkflow('General')}
                  onReuse={(details) => {
                    if (details.userMessage) {
                      handleSendMessage(details.userMessage as string);
                      setCurrentWorkflow('General');
                    }
                  }}
                  isFullPage
                />
              ) : (
                <ChatArea 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  onTranslateMessage={handleTranslateMessage}
                  onSaveToLibrary={handleSaveToLibrary}
                  isLoading={isLoading}
                  currentWorkflow={currentWorkflow}
                  activePersona={activePersona}
                  onPersonaChange={setActivePersona}
                  language={language}
                  formType={formType}
                  onFormTypeChange={setFormType}
                  onActionClick={handleActionClick}
                  onDeleteMessage={handleDeleteMessage}
                  userEmail={user?.email}
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
          {showMessages && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 bottom-0 right-0 w-96 z-[60]"
            >
              <MessagesPanel 
                language={language} 
                onClose={() => setShowMessages(false)}
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

        <AnimatePresence>
          {showHowToUse && (
            <HowToUseModal 
              isOpen={showHowToUse}
              onClose={() => setShowHowToUse(false)}
              language={language}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showVoice && (
            <VoiceConversation 
              language={language}
              onClose={() => setShowVoice(false)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Floating Voice Toggle */}
      {!showVoice && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowVoice(true)}
          className={cn(
            "fixed bottom-8 z-40 w-14 h-14 rounded-full bg-gold-gradient shadow-2xl flex items-center justify-center text-white transition-all",
            isAr ? "left-2" : "right-24"
          )}
        >
          <Mic className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-bg-deep animate-pulse" />
        </motion.button>
      )}

      {/* Subtle UI Accents */}
      <div className="fixed top-0 right-0 p-1 pointer-events-none opacity-5 no-print">
        <div className="w-[800px] h-[800px] bg-gold-start/10 rounded-full blur-[150px] -mr-96 -mt-96" />
      </div>
    </div>
  );
}
