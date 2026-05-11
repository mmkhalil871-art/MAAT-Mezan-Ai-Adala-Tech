/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Trash2, 
  Edit3, 
  Plus, 
  Sparkles,
  Search,
  RotateCcw,
  History as HistoryIcon,
  Loader2
} from 'lucide-react';
import { 
  getDepositionLogs,
  deleteDepositionLog,
  DepositionLog 
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
}

export default function HistoryPanel({ language, onClose, onReuse }: HistoryPanelProps) {
  const [logs, setLogs] = useState<DepositionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const isAr = language === 'ar';

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const logsData = await getDepositionLogs();
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDepositionLog(id);
      setLogs(prev => prev.filter(log => log.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete log:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const searchString = `${log.operation} ${log.email} ${log.details?.title || log.details?.url || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-bg-sidebar/95 backdrop-blur-xl border-l border-border-subtle shadow-2xl">
      <header className="p-6 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-5 h-5 text-gold-start" />
          <h2 className="text-sm font-bold caps tracking-wider text-text-main">
            {isAr ? 'سجل العمليات الكامل' : 'Global Operation History'}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-bg-soft rounded-full transition-colors text-text-muted hover:text-text-main"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="p-4 border-b border-border-subtle/50">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted opacity-30 group-focus-within:text-gold-start transition-all" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث في السجلات...' : 'Search logs...'}
            className="w-full bg-bg-deep/50 border border-border-subtle/30 py-2.5 px-10 text-[12px] focus:outline-none focus:border-gold-start/40 focus:bg-bg-deep transition-all"
          />
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-gold-start disabled:opacity-20"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="w-10 h-10 animate-spin text-gold-start" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 border border-dashed border-border-subtle/30 rounded-sm">
            <HistoryIcon className="w-10 h-10 mb-4" />
            <p className="text-[10px] caps font-bold">
              {isAr ? 'لا توجد سجلات مطابقة' : 'No matching logs found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={log.id} 
                className="bg-bg-deep/40 border border-border-subtle/30 p-4 rounded-sm hover:border-gold-start/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                    log.operation === 'create' ? "bg-green-500/10 text-green-500" :
                    log.operation === 'update' ? "bg-blue-500/10 text-blue-500" :
                    log.operation === 'delete' ? "bg-red-500/10 text-red-500" : "bg-gold-start/10 text-gold-start"
                  )}>
                    {log.operation === 'create' ? <Plus className="w-4 h-4" /> :
                     log.operation === 'update' ? <Edit3 className="w-4 h-4" /> :
                     log.operation === 'delete' ? <Trash2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[12px] font-bold text-text-main uppercase tracking-tight truncate">
                      {log.operation}: {(log.details?.title as string) || (log.details?.url as string) || (isAr ? 'عملية مبهمة' : 'Unknown Operation')}
                    </h4>
                    <div className="flex flex-col gap-1 mt-2">
                       <span className="text-[10px] text-text-muted flex items-center gap-2 opacity-50">
                         <User className="w-3 h-3" /> {log.email}
                       </span>
                       <span className="text-[10px] text-text-muted flex items-center gap-2 opacity-50">
                         <Clock className="w-3 h-3" /> {new Date(log.timestamp?.seconds * 1000).toLocaleString()}
                       </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {deleteConfirmId === log.id ? (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="px-2 py-1 bg-red-500 text-white text-[8px] caps font-bold border border-red-400"
                        >
                          {isAr ? 'تأكيد' : 'Confirm'}
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-bg-soft text-text-muted text-[8px] caps font-bold border border-border-subtle"
                        >
                          {isAr ? 'إلغاء' : 'Exit'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirmId(log.id)}
                        disabled={!!isDeleting}
                        className="p-2 text-text-muted opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-500 rounded-full"
                        title={isAr ? 'حذف السجل' : 'Delete Log'}
                      >
                        {isDeleting === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {onReuse && log.operation !== 'delete' && (
                      <button 
                        onClick={() => onReuse(log.details)}
                        className="p-2 text-gold-start opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gold-start/5 rounded-full"
                        title={isAr ? 'إعادة استخدام البيانات' : 'Reuse data'}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      <footer className="p-6 border-t border-border-subtle bg-bg-deep/20">
         <p className="text-[9px] caps text-text-muted opacity-40 leading-relaxed">
           {isAr 
             ? 'سجل العمليات يوفر شفافية كاملة لمسار تدقيق المعرفة القانونية.' 
             : 'The operation history provides full transparency for the legal knowledge audit trail.'}
         </p>
      </footer>
    </div>
  );
}
