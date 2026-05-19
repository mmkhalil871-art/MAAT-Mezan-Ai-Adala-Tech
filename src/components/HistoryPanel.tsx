/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Trash2, 
  Search,
  RotateCcw,
  History as HistoryIcon,
  Loader2,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { 
  getChatHistory,
  deleteChatHistory,
  ChatHistoryItem 
} from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryPanelProps {
  language: 'en' | 'ar';
  onClose: () => void;
  onReuse?: (details: Record<string, unknown>) => void;
  isFullPage?: boolean;
}

export default function HistoryPanel({ language, onClose, onReuse, isFullPage }: HistoryPanelProps) {
  const [logs, setLogs] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isAr = language === 'ar';

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const logsData = await getChatHistory();
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(isAr ? 'فشل تحميل السجل. يرجى المحاولة مرة أخرى.' : 'Failed to load history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setIsDeleting(id);
    setError(null);
    try {
      console.log('[History] Starting deletion for:', id);
      await deleteChatHistory(id);
      setLogs(prev => prev.filter(log => log.id !== id));
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      console.error('[History] Failed to delete history item:', err);
      // Attempt to parse Firestore error if available
      let displayError = isAr ? 'فشل حذف السجل. يرجى التحقق من الاتصال.' : 'Failed to delete entry. Please check connection.';
      if (err instanceof Error) {
        try {
          const errorDetail = JSON.parse(err.message);
          if (errorDetail.error?.includes('permission-denied')) {
            displayError = isAr ? 'ليست لديك صلاحية لحذف هذا السجل.' : 'Unauthorized to delete this record.';
          }
        } catch { /* ignore parse errors */ }
      }
      setError(displayError);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (logs.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      console.log('[History] Clearing all history items:', logs.length);
      // For safety and security rules, we delete items one by one
      // We use a simple loop instead of Promise.all to avoid overloading or losing context
      for (const log of logs) {
        await deleteChatHistory(log.id);
      }
      setLogs([]);
      setClearConfirm(false);
    } catch (err) {
      console.error('[History] Failed to clear history:', err);
      setError(isAr ? 'فشل مسح السجل بالكامل. قد يكون هناك مشكلة في الاتصال.' : 'Failed to clear all history entries. Connection issue suspected.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchString = `${log.userMessage} ${log.aiResponse} ${log.workflow}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className={cn(
      "flex flex-col h-full backdrop-blur-xl transition-all h-full",
      isFullPage 
        ? "bg-transparent w-full max-w-6xl mx-auto" 
        : "bg-bg-sidebar/95 border-l border-border-subtle shadow-2xl"
    )}>
      <header className={cn(
        "p-6 flex items-center justify-between",
        !isFullPage && "border-b border-border-subtle"
      )}>
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-gold-start" />
          <h2 className={cn(
            "font-bold caps tracking-wider text-text-main",
            isFullPage ? "text-2xl font-serif" : "text-sm"
          )}>
            {isAr ? 'سجل الاستشارات القانونية' : 'Legal Consultation History'}
          </h2>
          {logs.length > 0 && (
            <button 
              onClick={() => setClearConfirm(true)}
              className="ml-4 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black caps rounded-lg hover:bg-red-500/20 transition-all"
            >
              {isAr ? 'مسح السجل' : 'Clear History'}
            </button>
          )}
        </div>
        {!isFullPage && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-bg-soft rounded-full transition-colors text-text-muted hover:text-text-main"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className={cn(
        "p-4",
        !isFullPage && "border-b border-border-subtle/50"
      )}>
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between text-red-500 text-xs font-bold">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="relative group max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted opacity-30 group-focus-within:text-gold-start transition-all" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في الأسئلة السابقة...' : 'Search previous questions...'}
            className={cn(
              "w-full bg-bg-deep/50 border border-border-subtle/30 py-3 px-10 text-[14px] focus:outline-none focus:border-gold-start/40 focus:bg-bg-deep transition-all theme-radius",
              isFullPage && "text-lg"
            )}
          />
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-gold-start disabled:opacity-20"
          >
            <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="w-10 h-10 animate-spin text-gold-start" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-30 border border-dashed border-border-subtle/30 theme-radius">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-[12px] caps font-bold">
              {isAr ? 'لا توجد استشارات سابقة' : 'No previous consultations found'}
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            isFullPage ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}>
            {filteredLogs.map((log) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={log.id} 
                className="bg-bg-sidebar/40 border border-border-subtle/30 p-6 theme-radius hover:border-gold-start/40 transition-all group flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-1 opacity-5">
                   <HistoryIcon className="w-12 h-12" />
                </div>

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-gold-start/10 text-gold-start text-[8px] font-black caps rounded-full border border-gold-start/20">
                      {log.workflow}
                    </div>
                    <span className="text-[10px] text-text-muted opacity-40 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(log.timestamp?.seconds * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                     <button 
                       onClick={() => setDeleteConfirmId(log.id)}
                       className={cn(
                         "p-1.5 rounded-lg transition-all",
                         deleteConfirmId === log.id ? "text-red-500 bg-red-500/10" : "text-text-muted hover:text-red-500 hover:bg-red-500/5"
                       )}
                       title={isAr ? 'حذف' : 'Delete'}
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-[14px] font-bold text-text-main line-clamp-2 mb-2 leading-relaxed">
                    {log.userMessage}
                  </p>
                  <p className="text-[12px] text-text-muted/60 line-clamp-3 leading-relaxed break-words">
                    {log.aiResponse}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border-subtle/20 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-muted/40 truncate max-w-[150px]">
                    {log.userEmail}
                  </span>
                  
                  {onReuse && (
                    <button 
                      onClick={() => onReuse({ userMessage: log.userMessage })}
                      className="flex items-center gap-2 text-[10px] font-black caps text-gold-start hover:gap-3 transition-all"
                    >
                      {isAr ? 'البناء على هذا' : 'Build on this'}
                      <ArrowRight className={cn("w-3 h-3", isAr && "rotate-180")} />
                    </button>
                  )}
                </div>
                
                {deleteConfirmId === log.id && (
                  <div className="absolute inset-0 bg-bg-sidebar/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200">
                    <Trash2 className="w-8 h-8 text-red-500 mb-2" />
                    <p className="text-[14px] font-bold mb-4 text-text-main">{isAr ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Delete this history entry?'}</p>
                    <div className="flex gap-2">
                       <button 
                         onClick={(e) => handleDeleteLog(log.id, e)}
                         className="px-6 py-2 bg-red-500 text-white text-[11px] caps font-bold theme-radius hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                       >
                         {isDeleting === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (isAr ? 'حذف نهائي' : 'Permanent Delete')}
                       </button>
                       <button 
                         onClick={() => setDeleteConfirmId(null)}
                         className="px-6 py-2 bg-bg-soft text-text-muted text-[11px] caps font-bold border border-border-subtle theme-radius hover:bg-bg-deep transition-colors"
                       >
                         {isAr ? 'إلغاء' : 'Cancel'}
                       </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {clearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-bg-sidebar border border-border-subtle p-8 theme-radius max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">
              {isAr ? 'مسح سجل الاستشارات' : 'Clear Consultation History'}
            </h3>
            <p className="text-sm text-text-muted mb-8 leading-relaxed">
              {isAr 
                ? 'سيتم حذف جميع سجلاتك القانونية بشكل نهائي. لا يمكن التراجع عن هذه العملية.' 
                : 'All your legal consultation records will be permanently deleted. This action cannot be undone.'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={handleClearAll}
                className="flex-1 py-3 bg-red-500 text-white font-bold caps text-xs theme-radius hover:bg-red-600 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isAr ? 'تأكيد المسح الشامل' : 'Confirm Clear All')}
              </button>
              <button 
                onClick={() => setClearConfirm(false)}
                className="flex-1 py-3 bg-bg-soft text-text-muted font-bold caps text-xs border border-border-subtle theme-radius hover:bg-bg-deep transition-colors"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {isFullPage && (
        <footer className="p-8 border-t border-border-subtle/10 bg-bg-deep/10">
           <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
             <p className="text-[10px] caps text-text-muted opacity-40 leading-relaxed text-center md:text-start max-w-xl">
               {isAr 
                 ? 'سجل الاستشارات يحفظ جميع تفاعلاتك القانونية مع المحرك السيادي لضمان استمرارية التحليل التشريعي.' 
                 : 'The consultation history preserves all your legal interactions with the sovereign engine to ensure regulatory analysis continuity.'}
             </p>
             <button 
               onClick={onClose}
               className="px-6 py-2 border border-border-subtle text-[11px] font-black caps hover:bg-bg-soft transition-all theme-radius"
             >
               {isAr ? 'العودة للمستشار' : 'Back to Advisor'}
             </button>
           </div>
        </footer>
      )}
    </div>
  );
}
