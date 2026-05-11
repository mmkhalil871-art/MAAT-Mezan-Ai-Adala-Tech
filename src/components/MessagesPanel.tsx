/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { getAdminRequests, updateAdminRequestStatus, deleteAdminRequest, AdminRequest } from '../lib/firebase';
import { X, MessageSquare, Clock, CheckCircle2, Archive, Inbox, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MessagesPanelProps {
  language: 'ar' | 'en';
  onClose: () => void;
}

export default function MessagesPanel({ language, onClose }: MessagesPanelProps) {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const isAr = language === 'ar';

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await getAdminRequests();
        setRequests(data);
      } catch (err) {
        console.error('Failed to fetch requests:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, status: AdminRequest['status']) => {
    try {
      await updateAdminRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirmId(prev => prev === id ? null : prev), 3000);
      return;
    }
    
    setIsDeleting(id);
    try {
      await deleteAdminRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete request:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className={cn(
      "h-full bg-bg-sidebar border-s border-border-subtle shadow-2xl flex flex-col",
      isAr ? "font-serif" : "font-sans"
    )} dir={isAr ? 'rtl' : 'ltr'}>
      <header className="p-6 border-b border-border-subtle flex items-center justify-between bg-bg-deep/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold-start/10 flex items-center justify-center border border-gold-start/20">
            <MessageSquare className="w-4 h-4 text-gold-start" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-main caps tracking-widest">
              {isAr ? 'بريد الطلبات' : 'Document Requests'}
            </h2>
            <p className="text-[10px] text-text-muted opacity-50 caps tracking-tighter">
              {isAr ? 'صندوق الوارد الإداري' : 'Administrative Inbox'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-main transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="w-8 h-8 animate-spin text-gold-start" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
            <Inbox className="w-12 h-12 mb-4" />
            <p className="text-[10px] font-bold caps tracking-widest">{isAr ? 'لا توجد طلبات واردة' : 'No incoming requests'}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {requests.map((request) => (
              <motion.div 
                key={request.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "border p-4 rounded-sm flex flex-col gap-3 transition-all",
                  request.status === 'pending' ? "bg-gold-start/5 border-gold-start/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]" : "bg-bg-deep/30 border-border-subtle opacity-70"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-text-main truncate">{request.userEmail}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-text-muted opacity-40" />
                      <span className="text-[9px] text-text-muted font-mono">
                        {request.timestamp?.seconds ? new Date(request.timestamp.seconds * 1000).toLocaleString(isAr ? 'ar-EG' : 'en-US') : '---'}
                      </span>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </div>

                <div className="bg-bg-sidebar/50 p-3 rounded-sm border border-border-subtle/30">
                  <p className="text-[12px] text-text-main leading-relaxed italic opacity-80">{request.message}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(request.id, 'viewed')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 border text-[9px] font-black caps tracking-widest transition-all",
                      request.status === 'viewed' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "bg-bg-deep border-border-subtle text-text-muted hover:border-blue-500/40 hover:text-blue-500"
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {isAr ? 'تمت القراءة' : 'Viewed'}
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(request.id, 'archived')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 border text-[9px] font-black caps tracking-widest transition-all",
                      request.status === 'archived' ? "bg-text-muted/10 border-text-muted/20 text-text-main" : "bg-bg-deep border-border-subtle text-text-muted hover:border-text-main hover:text-text-main"
                    )}
                  >
                    <Archive className="w-3 h-3" />
                    {isAr ? 'أرشفة' : 'Archive'}
                  </button>
                  <button 
                    onClick={() => handleDelete(request.id)}
                    disabled={isDeleting === request.id}
                    className={cn(
                      "flex items-center justify-center p-2 border transition-all",
                      deleteConfirmId === request.id 
                        ? "bg-rose-500 border-rose-600 text-white animate-pulse" 
                        : "border-border-subtle text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
                    )}
                    title={deleteConfirmId === request.id ? (isAr ? 'انقر مرة أخرى للتأكيد' : 'Click again to confirm') : (isAr ? 'حذف' : 'Delete')}
                  >
                    {isDeleting === request.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <footer className="p-4 border-t border-border-subtle bg-bg-deep/20">
        <p className="text-[8px] text-text-muted font-bold caps tracking-widest text-center opacity-40">
          {isAr ? 'نظام الإيداع السيادي - صندوق بريد المشرف' : 'Sovereign Depository - Admin Inbox'}
        </p>
      </footer>
    </div>
  );
}
