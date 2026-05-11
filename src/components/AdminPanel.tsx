import { useEffect, useState } from 'react';
import { getLoginLogs, LoginLog } from '../lib/firebase';
import { ShieldCheck, Clock, Mail, Laptop, Scale, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await getLoginLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

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
              <h1 className="text-xl font-serif text-text-main">Sovereign Audit Logs</h1>
            </div>
            <p className="text-[10px] text-text-muted font-bold caps tracking-[0.3em] opacity-50">System Access Monitor</p>
          </div>
          <div className="bg-gold-start/5 border border-gold-start/20 px-4 py-2 rounded-sm flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gold-start uppercase tracking-widest">Live Monitoring Active</span>
          </div>
        </header>

        <div className="grid gap-4">
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
        </div>
      </div>
    </div>
  );
}
