import { useEffect, useState } from 'react';
import { getLoginLogs, LoginLog, getAdminRequests, updateAdminRequestStatus, deleteAdminRequest, AdminRequest } from '../lib/firebase';
import { ShieldCheck, Clock, Mail, Laptop, Scale, AlertTriangle, MessageSquare, Inbox, CheckCircle2, Archive, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'requests'>('requests');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsData, requestsData] = await Promise.all([
          getLoginLogs(),
          getAdminRequests()
        ]);
        setLogs(logsData);
        setRequests(requestsData);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateStatus = async (id: string, status: AdminRequest['status']) => {
    try {
      await updateAdminRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error('Failed to update request status:', err);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-deep h-full">
        <Scale className="w-8 h-8 text-gold-start animate-pulse opacity-20" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-soft h-full relative overflow-y-auto p-12">
      <div className="max-w-[var(--max-content-width)] mx-auto w-full">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-gold-start" />
              <h1 className="text-xl font-serif text-text-main">Administrative Control Tower</h1>
            </div>
            <p className="text-[10px] text-text-muted font-bold caps tracking-[0.3em] opacity-50 mb-2">Sovereign System Intelligence</p>
            <p className="text-[9px] text-text-muted/60 max-w-md leading-relaxed italic">
              Centralized oversight of all sovereign system activities, including user audit logs and administrative inbound requests for policy clearance.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-bg-sidebar/40 p-1 border border-border-subtle rounded-sm">
            <button 
              onClick={() => setActiveTab('requests')}
              className={cn(
                "px-4 py-2 text-[10px] font-black caps tracking-widest transition-all",
                activeTab === 'requests' ? "bg-gold-start text-bg-deep" : "text-text-muted hover:text-text-main"
              )}
            >
              Inbound Requests ({requests.filter(r => r.status === 'pending').length})
            </button>
            <button 
              onClick={() => setActiveTab('audit')}
              className={cn(
                "px-4 py-2 text-[10px] font-black caps tracking-widest transition-all",
                activeTab === 'audit' ? "bg-gold-start text-bg-deep" : "text-text-muted hover:text-text-main"
              )}
            >
              Audit Logs
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'requests' ? (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-6"
            >
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className={cn(
                    "bg-bg-sidebar/40 border p-8 flex flex-col gap-6 transition-all",
                    request.status === 'pending' ? "border-gold-start/40 bg-gold-start/[0.02]" : "border-border-subtle opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-bg-deep border border-border-subtle flex items-center justify-center logo-3d">
                        <MessageSquare className={cn("w-5 h-5", request.status === 'pending' ? "text-gold-start" : "text-text-muted")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-serif text-text-main">{request.userEmail}</h3>
                          {request.status === 'pending' && (
                            <span className="text-[8px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-bold uppercase animate-pulse">New Request</span>
                          )}
                        </div>
                        <p className="text-[9px] text-gold-start font-bold uppercase tracking-[0.4em] mt-1">
                          {request.requestType.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-text-muted opacity-20" />
                      <span className="text-[10px] text-text-muted font-mono">
                        {request.timestamp?.seconds ? new Date(request.timestamp.seconds * 1000).toLocaleString() : '---'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-bg-deep/50 border border-border-subtle/30 p-6">
                    <p className="text-sm text-text-main leading-relaxed italic opacity-80">"{request.message}"</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-subtle/20 pt-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleUpdateStatus(request.id, 'viewed')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 border text-[9px] font-black caps tracking-widest transition-all",
                          request.status === 'viewed' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" : "border-border-subtle text-text-muted hover:border-blue-500/40 hover:text-blue-500"
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark as Viewed
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(request.id, 'archived')}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 border text-[9px] font-black caps tracking-widest transition-all",
                          request.status === 'archived' ? "bg-text-muted/10 border-text-muted/20 text-text-main" : "border-border-subtle text-text-muted hover:border-text-main hover:text-text-main"
                        )}
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </button>
                      <button 
                        onClick={() => handleDeleteRequest(request.id)}
                        disabled={isDeleting === request.id}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 border transition-all font-black text-[9px] caps tracking-widest",
                          deleteConfirmId === request.id 
                            ? "bg-rose-500 border-rose-600 text-white animate-pulse" 
                            : "border-border-subtle text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
                        )}
                      >
                        {isDeleting === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {deleteConfirmId === request.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-gold-start/5 border border-gold-start/10">
                      <span className="text-[8px] font-bold text-gold-start uppercase tracking-widest">Chatbot Notification Generated</span>
                    </div>
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-32 bg-bg-sidebar/20 border border-border-subtle border-dashed">
                  <Inbox className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest">No inbound requests in pipeline</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4"
            >
              {logs.map((log) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id}
                  className="bg-bg-sidebar/40 border border-border-subtle p-6 flex flex-col md:flex-row md:items-center gap-8 group hover:bg-bg-sidebar/60 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-[300px]">
                    <div className={cn(
                      "w-12 h-12 bg-bg-deep border border-border-subtle flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:border-gold-start/40 group-hover:bg-gold-start/5 transition-all logo-3d rounded-sm overflow-hidden"
                    )}>
                      {log.photoURL ? (
                        <img src={log.photoURL} alt={log.displayName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <Mail className="w-5 h-5 text-text-muted group-hover:text-gold-start transition-colors" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] text-text-main font-serif tracking-tight">{log.displayName || log.email}</p>
                        {log.isPersonalEmail && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full font-bold uppercase tracking-tighter">Personal</span>
                        )}
                      </div>
                      <p className="text-[9px] text-text-muted/60 font-medium mt-0.5">{log.email}</p>
                      <p className="text-[9px] text-gold-start/40 font-bold uppercase tracking-[0.4em] mt-1">Authorized Official Identity</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-8">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Clock className="w-4 h-4 text-text-muted opacity-30" />
                      <span className="text-[11px] text-text-muted font-mono">
                        {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Pending...'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 opacity-60 flex-1">
                      <Laptop className="w-4 h-4 text-text-muted shrink-0" />
                      <span className="text-[10px] text-text-muted font-sans line-clamp-1 italic">
                        {log.userAgent}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 self-start md:self-auto">
                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Secure Login</span>
                  </div>
                </motion.div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-24 bg-bg-sidebar/20 border border-border-subtle border-dashed">
                  <AlertTriangle className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest">No access records detected</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
