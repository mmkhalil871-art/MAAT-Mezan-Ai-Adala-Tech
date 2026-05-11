/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Library, 
  Upload, 
  Search, 
  Trash2, 
  Edit3, 
  Download, 
  Plus, 
  Link as LinkIcon,
  X,
  FileText,
  Clock,
  User,
  ExternalLink,
  Globe,
  Loader2,
  Sparkles,
  Check,
  History as HistoryIcon,
  RotateCcw,
  BookOpen,
  Copy,
  Save,
  Lock,
  Scale
} from 'lucide-react';
import { 
  getLibraryItems, 
  addToLibrary, 
  updateLibraryItem, 
  deleteLibraryItem, 
  deleteDepositionLog,
  getDepositionLogs,
  logOperation,
  LibraryItem, 
  DepositionLog 
} from '../lib/firebase';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { downloadAsPDF, downloadAsWord } from '../lib/exportUtils';
import { Language } from '../types';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LibraryPanelProps {
  language: Language;
}

export default function LibraryPanel({ language }: LibraryPanelProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [optimisticItems, setOptimisticItems] = useState<LibraryItem[]>([]);
  const [logs, setLogs] = useState<DepositionLog[]>([]);
  const [activeTab, setActiveTab] = useState<'depository' | 'history'>('depository');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteSuccessId, setDeleteSuccessId] = useState<string | null>(null);
  const [deleteLogConfirmId, setDeleteLogConfirmId] = useState<string | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recentlyDepositedIds, setRecentlyDepositedIds] = useState<string[]>([]);
  const [uploadQueue, setUploadQueue] = useState<{
    id: string;
    title: string;
    content: string;
    type: LibraryItem['type'];
    isProcessed: boolean;
  }[]>([]);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<LibraryItem['type']>('law');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isAr = language === 'ar';

  useEffect(() => {
    fetchItems();
    
    // Listen for auth changes to re-fetch items with correct permissions
    const unsubscribe = onAuthStateChanged(auth, () => {
      fetchItems();
    });
    return () => unsubscribe();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const [itemsData, logsData] = await Promise.all([
        getLibraryItems(),
        getDepositionLogs()
      ]);
      setItems(itemsData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to fetch library data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const detectUrlInfo = async () => {
    if (!newUrl) return;
    setIsDetecting(true);
    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setNewTitle(isAr ? data.arTitle : data.enTitle);
      
      const summary = isAr ? data.arSummary : data.enSummary;
      const fullText = data.capturedContent || "";
      
      // Combine summary and captured content for the archive
      const contentBuffer = `--- SUMMARY ---\n${summary}\n\n--- CAPTURED CONTENT ---\n${fullText}`;
      setNewContent(contentBuffer);
      setNewType(data.suggestedType || 'url');
      
      // Log the detection
      await logOperation('detect', { url: newUrl, title: data.enTitle || data.arTitle });
      fetchItems(); // Refresh logs
    } catch (err) {
      console.error('Detection failed:', err);
      alert(isAr ? 'فشل تحليل الرابط. يرجى التأكد من صحة الرابط.' : 'URL analysis failed. Please verify the link.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingFile(true);
    try {
      const newQueueItems = [];
      
      for (const file of files) {
        let content = '';
        let type: LibraryItem['type'] = 'law';
        const title = file.name.split('.')[0];
        
        // Auto-detect type from filename
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('قرار') || lowerName.includes('decree')) {
          type = 'decree';
        } else if (lowerName.includes('وزار') || lowerName.includes('ministerial')) {
          type = 'ministerial_decree';
        } else if (lowerName.includes('لائح') || lowerName.includes('regulation')) {
          type = 'regulation';
        } else if (lowerName.includes('توصي') || lowerName.includes('recommendation')) {
          type = 'recommendation';
        } else if (lowerName.includes('اتفاق') || lowerName.includes('convention')) {
          type = 'convention';
        }

        if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          content = await file.text();
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => ('str' in item ? item.str : '')).join(' ');
            fullText += pageText + '\n';
          }
          content = fullText;
        }

        if (content) {
          newQueueItems.push({
            id: Math.random().toString(36).substr(2, 9),
            title,
            content,
            type,
            isProcessed: false
          });
        }
      }

      if (newQueueItems.length > 0) {
        if (newQueueItems.length === 1 && !newTitle && !newContent) {
          // If only one file and form is empty, populate the main form for convenience
          const item = newQueueItems[0];
          setNewTitle(item.title);
          setNewContent(item.content);
          setNewType(item.type);
        } else {
          setUploadQueue(prev => [...prev, ...newQueueItems]);
        }
      }
    } catch (err) {
      console.error('File processing failed:', err);
      alert(isAr ? 'فشل معالجة بعض الملفات.' : 'Some files failed to process.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (stayOpen = false) => {
    const user = auth.currentUser;
    if (!user) {
      alert(isAr ? 'يرجى تسجيل الدخول أولاً لإيداع المستندات.' : 'Please sign in first to deposit documents.');
      return;
    }

    // Collect all items to upload: current form + queue
    const itemsToUpload: Omit<LibraryItem, 'id' | 'timestamp'>[] = [];
    
    // Add current form if valid
    if (newTitle.trim()) {
      if (newContent.trim() || newUrl.trim()) {
        itemsToUpload.push({
          title: newTitle.trim(),
          content: (newContent.trim() || (newUrl ? `Reference Link: ${newUrl}` : '')),
          type: newType,
          url: newUrl.trim(),
          isPublic,
          uploadedBy: user.email || 'unknown',
          relatedTo: relatedIds
        });
      }
    }

    // Add items from queue
    uploadQueue.forEach(q => {
      if (!q.isProcessed && q.title.trim() && q.content.trim()) {
        itemsToUpload.push({
          title: q.title.trim(),
          content: q.content.trim(),
          type: q.type,
          url: '',
          isPublic,
          uploadedBy: user.email || 'unknown',
          relatedTo: relatedIds
        });
      }
    });

    console.log('[Library] Items to upload:', itemsToUpload.length);

    if (itemsToUpload.length === 0) {
      if (!newTitle.trim()) {
        alert(isAr ? 'يرجى إدخال عنوان للوثيقة.' : 'Please enter a title for the document.');
      } else if (!newContent.trim() && !newUrl.trim()) {
        alert(isAr ? 'يرجى إدخال محتوى أو رابط للوثيقة.' : 'Please enter content or a URL for the document.');
      }
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem && itemsToUpload.length === 1) {
        const data = itemsToUpload[0];
        console.log('[Library] Updating item:', editingItem.id);
        await updateLibraryItem(editingItem.id, data);
        
        // Immediate local update
        setItems(prev => prev.map(item => item.id === editingItem.id ? {
          ...item,
          ...data
        } : item));
        
        // Also update optimistic items if it was one of them
        setOptimisticItems(prev => prev.map(item => item.id === editingItem.id ? {
          ...item,
          ...data
        } : item));

        if (!stayOpen) {
          setIsUploadModalOpen(false);
          resetForm();
        }
        
        alert(isAr ? 'تم تحديث الوثيقة بنجاح.' : 'Document updated successfully.');
      } else {
        console.log('[Library] Creating new items...');
        const results = await Promise.all(itemsToUpload.map(data => addToLibrary(data)));
        
        const newItems: LibraryItem[] = results.map((res, index) => ({
          id: res.id,
          ...itemsToUpload[index],
          timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
        }));

        setOptimisticItems(prev => [...newItems, ...prev]);
        setRecentlyDepositedIds(prev => [...newItems.map(i => i.id), ...prev]);

        if (stayOpen && newItems.length === 1) {
           setEditingItem(newItems[0]);
        } else {
          setIsUploadModalOpen(false);
          resetForm();
        }
        
        alert(isAr ? `تم إيداع ${newItems.length} وثيقة بنجاح.` : `Deposited ${newItems.length} document(s) successfully.`);
      }
      
      // Delay fetch to allow Firestore indexing, but rely on optimistic state for now
      setTimeout(() => fetchItems(), 2000);
      
    } catch (err: any) {
      console.error('[Library] Failed to save library item(s):', err);
      let errorMsg = isAr ? 'فشل إيداع بعض المستندات. يرجى المحاولة مرة أخرى.' : 'Failed to deposit some documents. Please try again.';
      
      const rawError = err.message || String(err);
      if (rawError.includes('permission-denied') || rawError.includes('Missing or insufficient permissions')) {
        errorMsg = isAr ? 'ليس لديك صلاحية لإجراء هذه العملية. يرجى التأكد من تسجيل الدخول بحساب مفعل.' : 'You do not have permission to perform this action. Please ensure you are signed in with a verified account.';
      }
      
      alert(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteLibraryItem(id);
      setDeleteConfirmId(null);
      setDeleteSuccessId(id);
      setTimeout(() => {
        setDeleteSuccessId(null);
        fetchItems();
      }, 2000);
    } catch (err: unknown) {
      console.error('Failed to delete library item:', err);
      const errorMsg = (err as Error).message || String(err);
      alert(`${isAr ? 'فشل حذف المستند' : 'Failed to delete document'}: ${errorMsg}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    setIsDeletingLog(id);
    try {
      await deleteDepositionLog(id);
      setLogs(prev => prev.filter(log => log.id !== id));
      setDeleteLogConfirmId(null);
    } catch (err) {
      console.error('Failed to delete log:', err);
    } finally {
      setIsDeletingLog(null);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewContent('');
    setNewUrl('');
    setNewType('law');
    setRelatedIds([]);
    setUploadQueue([]);
    setIsPublic(true);
    setIsUploadModalOpen(false);
    setEditingItem(null);
  };

  const renderItemCard = (item: LibraryItem) => (
    <motion.div 
      key={item.id}
      layoutId={item.id}
      className={cn(
        "bg-bg-sidebar/30 border border-border-subtle/40 p-6 group hover:border-gold-start/20 hover:bg-bg-sidebar/50 transition-all relative overflow-hidden",
        recentlyDepositedIds.includes(item.id) && "ring-1 ring-gold-start shadow-[0_0_15px_rgba(212,175,55,0.1)] border-gold-start/30"
      )}
    >
      {recentlyDepositedIds.includes(item.id) && (
        <div className="absolute top-0 right-0 bg-gold-start text-bg-deep px-3 py-1 text-[8px] font-black caps z-10 shadow-sm">
          {isAr ? 'تم الإيداع حديثاً' : 'JUST DEPOSITED'}
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={cn(
              "px-2 py-0.5 text-[9px] font-bold caps border",
              item.type === 'url' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-gold-start/10 text-gold-start border-gold-start/20"
            )}>
              {item.type === 'url' ? (isAr ? 'رابط' : 'URL') : 
               (item.type === 'recommendation' ? (isAr ? 'توصية' : 'Recommendation') :
                item.type === 'ministerial_decree' ? (isAr ? 'قرار وزاري' : 'Ministerial Decree') :
                item.type === 'convention' ? (isAr ? 'اتفاقية' : 'Convention') :
                translations.type[item.type as keyof typeof translations.type])}
            </span>
            <div className="flex items-center gap-2 mt-2">
              {item.isPublic ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                  <Globe className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[8px] font-bold text-emerald-500 caps tracking-tighter">{isAr ? 'عام' : 'PUBLIC'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-full">
                  <Lock className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[8px] font-bold text-amber-500 caps tracking-tighter">{isAr ? 'خاص' : 'PRIVATE'}</span>
                </div>
              )}
              <span className="text-[10px] text-text-muted opacity-40">|</span>
              <span className="text-[10px] text-text-muted opacity-60 font-mono">
                {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : 'Pending...'}
              </span>
            </div>
          </div>
          <h3 className="text-lg font-serif font-bold text-text-main mb-2 group-hover:text-gold-start transition-colors leading-tight flex items-center gap-2">
            {item.title}
            {item.url && <ExternalLink className="w-3.5 h-3.5 opacity-30" />}
          </h3>
          {item.url && (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[11px] text-gold-start/60 hover:underline mb-2 block truncate max-w-md font-mono"
            >
              {item.url}
            </a>
          )}
          <p className="text-[13px] text-text-muted line-clamp-2 leading-relaxed opacity-60">
            {item.content}
          </p>
        </div>

        <div className="flex flex-col gap-2 no-print relative">
          {deleteConfirmId === item.id ? (
            <div className="absolute right-full top-0 mr-4 bg-bg-sidebar border border-red-500/50 p-2 flex gap-2 z-10 shadow-2xl animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={() => handleDelete(item.id)}
                className="px-3 py-1 bg-red-500 text-white text-[10px] caps font-bold"
              >
                {isAr ? 'تأكيد الحذف' : 'Confirm'}
              </button>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1 bg-bg-deep text-text-muted text-[10px] caps font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          ) : null}
          <button 
            onClick={() => setDeleteConfirmId(item.id)}
            disabled={!!isDeleting || deleteSuccessId === item.id}
            className={cn(
              "p-2 transition-colors lg:opacity-0 lg:group-hover:opacity-100",
              deleteConfirmId === item.id ? "text-red-500 bg-red-500/10" : "text-text-muted/40 hover:text-red-500",
              isDeleting === item.id && "animate-pulse scale-110",
              deleteSuccessId === item.id && "text-emerald-500 bg-emerald-500/10"
            )}
            title={isAr ? 'حذف' : 'Delete'}
          >
            {isDeleting === item.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : deleteSuccessId === item.id ? (
              <Check className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
          <button 
            onClick={() => {
              setEditingItem(item);
              setNewTitle(item.title);
              setNewContent(item.content);
              setNewType(item.type);
              setNewUrl(item.url || '');
              setRelatedIds(item.relatedTo || []);
              setIsPublic(item.isPublic ?? true);
              setIsUploadModalOpen(true);
            }}
            className="p-2 text-text-muted/40 hover:text-gold-start transition-colors lg:opacity-0 lg:group-hover:opacity-100"
            title={isAr ? 'تعديل' : 'Edit'}
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {item.relatedTo && item.relatedTo.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle/30">
          <p className="text-[10px] font-bold caps text-gold-start/40 flex items-center gap-2 mb-2">
            <LinkIcon className="w-3 h-3" />
            {translations.related}
          </p>
          <div className="flex flex-wrap gap-2">
            {item.relatedTo.map(rid => {
              const related = items.find(i => i.id === rid);
              return related && (
                <div key={rid} className="px-2 py-1 bg-bg-deep text-[10px] border border-border-subtle/50 text-text-muted flex items-center gap-2">
                  {related.title}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 border-t border-border-subtle/30 pt-4">
        <button 
          onClick={() => {
            navigator.clipboard.writeText(item.content);
            alert(isAr ? 'تم النسخ!' : 'Copied!');
          }}
          className="flex items-center gap-2 text-[10px] font-bold caps text-text-muted hover:text-gold-start transition-all"
        >
          <Copy className="w-3.5 h-3.5" /> {isAr ? 'نسخ' : 'Copy'}
        </button>
        <button 
          onClick={() => downloadAsPDF(item.content, `${item.title}.pdf`, true)}
          className="flex items-center gap-2 text-[10px] font-bold caps text-text-muted hover:text-gold-start transition-all"
        >
          <Download className="w-3.5 h-3.5" /> PDF
        </button>
        <button 
          onClick={() => downloadAsWord(item.content, `${item.title}.docx`, true)}
          className="flex items-center gap-2 text-[10px] font-bold caps text-text-muted hover:text-gold-start transition-all"
        >
          <FileText className="w-3.5 h-3.5" /> Docx
        </button>
      </div>
    </motion.div>
  );

  const combinedItems = [...optimisticItems, ...items].filter((item, index, self) => 
    index === self.findIndex((t) => t.id === item.id)
  );

  const filteredItems = combinedItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lawItems = filteredItems.filter(item => item.type === 'law' && !recentlyDepositedIds.includes(item.id));
  const decreeItems = filteredItems.filter(item => (item.type === 'decree' || item.type === 'ministerial_decree') && !recentlyDepositedIds.includes(item.id));
  const recentItems = filteredItems.filter(item => recentlyDepositedIds.includes(item.id));
  const otherItems = filteredItems.filter(item => item.type !== 'law' && item.type !== 'decree' && item.type !== 'ministerial_decree' && !recentlyDepositedIds.includes(item.id));

  const translations = {
    title: isAr ? 'المكتبة القانونية' : 'Legal Library',
    search: isAr ? 'البحث في القوانين واللوائح...' : 'Search laws and regulations...',
    upload: isAr ? 'إيداع مستند جديد' : 'Deposit New Document',
    empty: isAr ? 'المكتبة فارغة حالياً' : 'Library is currently empty',
    related: isAr ? 'وثائق مرتبطة' : 'Related Documents',
    history: isAr ? 'سجل العمليات' : 'Operation History',
    depository: isAr ? 'المستودع' : 'Depository',
    reuse: isAr ? 'إعادة استخدام' : 'Reuse Data',
    laws: isAr ? 'القوانين المتاحة' : 'Available Laws',
    decrees: isAr ? 'القرارات المتاحة' : 'Available Decrees',
    others: isAr ? 'وثائق أخرى' : 'Other Documents',
    recent: isAr ? 'المودعة حديثاً' : 'Recently Deposited',
    type: {
      law: isAr ? 'قانون' : 'Law',
      regulation: isAr ? 'لائحة' : 'Regulation',
      decree: isAr ? 'قرار' : 'Decree',
      update: isAr ? 'تحديث' : 'Update',
      recommendation: isAr ? 'توصية' : 'Recommendation',
      convention: isAr ? 'اتفاقية' : 'Convention',
      ministerial_decree: isAr ? 'قرار وزاري' : 'Ministerial Decree',
      url: isAr ? 'رابط' : 'URL'
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-bg-soft",
      isAr ? "font-serif" : "font-sans"
    )} dir={isAr ? 'rtl' : 'ltr'}>
      
      <header className="bg-bg-sidebar/50 backdrop-blur-md border-b border-border-subtle px-8 pt-6 flex flex-col sticky top-0 z-20">
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 flex items-center justify-center bg-gold-gradient shadow-lg logo-3d rounded-sm text-bg-deep">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-gold-gradient tracking-tight">{translations.title}</h2>
              <p className="text-[10px] caps tracking-widest opacity-60 mt-1">{isAr ? 'نظام الإيداع السيادي' : 'Sovereign Depository System'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchItems}
              disabled={isLoading}
              className="p-2.5 text-text-muted hover:text-gold-start transition-all disabled:opacity-30 border border-border-subtle/30 bg-bg-sidebar/30 rounded-sm"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RotateCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gold-gradient text-bg-deep font-bold text-[11px] caps rounded-sm shadow-xl active:scale-95 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <Plus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{isAr ? 'إضافة قانون جديد' : 'ADD NEW LAW'}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {[
            { id: 'depository', label: translations.depository, icon: BookOpen },
            { id: 'history', label: translations.history, icon: HistoryIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'depository' | 'history')}
              className={cn(
                "flex items-center gap-2 px-1 pb-4 text-[11px] font-bold caps transition-all relative",
                activeTab === tab.id ? "text-gold-start" : "text-text-muted opacity-40 hover:opacity-100"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-gradient" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-[var(--max-content-width)] mx-auto flex flex-col gap-8">
          
          {activeTab === 'depository' ? (
            <>
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-30 group-focus-within:text-gold-start group-focus-within:opacity-100 transition-all" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={translations.search}
                  className="w-full bg-bg-sidebar/40 border border-border-subtle/50 py-4 px-14 text-[14px] focus:outline-none focus:border-gold-start/40 focus:bg-bg-sidebar transition-all"
                />
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center py-20 opacity-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Library className="w-12 h-12 text-gold-start" />
                  </motion.div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <p className="text-[12px] font-bold caps tracking-widest">{translations.empty}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-12">
                  {recentItems.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-black caps tracking-[0.3em] text-gold-start mb-6 flex items-center gap-3">
                        <Upload className="w-4 h-4" />
                        {translations.recent}
                        <div className="h-px bg-gold-start/20 flex-1" />
                        <span className="text-[10px] opacity-40 font-mono">[{recentItems.length}]</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {recentItems.map(renderItemCard)}
                      </div>
                    </section>
                  )}

                  {lawItems.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-black caps tracking-[0.3em] text-gold-start/60 mb-6 flex items-center gap-3">
                        <Scale className="w-4 h-4" />
                        {translations.laws}
                        <div className="h-px bg-gold-start/20 flex-1" />
                        <span className="text-[10px] opacity-40 font-mono">[{lawItems.length}]</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {lawItems.map(renderItemCard)}
                      </div>
                    </section>
                  )}

                  {decreeItems.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-black caps tracking-[0.3em] text-gold-start/60 mb-6 flex items-center gap-3">
                        <FileText className="w-4 h-4" />
                        {translations.decrees}
                        <div className="h-px bg-gold-start/20 flex-1" />
                        <span className="text-[10px] opacity-40 font-mono">[{decreeItems.length}]</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {decreeItems.map(renderItemCard)}
                      </div>
                    </section>
                  )}

                  {otherItems.length > 0 && (
                    <section>
                      <h3 className="text-[11px] font-black caps tracking-[0.3em] text-text-muted/40 mb-6 flex items-center gap-3">
                        <BookOpen className="w-4 h-4" />
                        {translations.others}
                        <div className="h-px bg-border-subtle/20 flex-1" />
                        <span className="text-[10px] opacity-40 font-mono">[{otherItems.length}]</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {otherItems.map(renderItemCard)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {isLoading ? (
                <div className="flex flex-col items-center py-20 opacity-20">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <HistoryIcon className="w-12 h-12 text-gold-start" />
                  </motion.div>
                </div>
              ) : logs.length === 0 ? (
                 <div className="h-64 flex flex-col items-center justify-center text-text-muted opacity-30 border border-dashed border-border-subtle/50">
                    <HistoryIcon className="w-12 h-12 mb-4" />
                    <p className="text-[11px] caps font-bold tracking-widest">{isAr ? 'لا توجد عمليات مسجلة' : 'No history recorded yet'}</p>
                 </div>
              ) : logs.map((log) => (
                <div key={log.id} className="bg-bg-sidebar/30 border border-border-subtle/40 p-5 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      log.operation === 'create' ? "bg-green-500/10 text-green-500" :
                      log.operation === 'update' ? "bg-blue-500/10 text-blue-500" :
                      log.operation === 'delete' ? "bg-red-500/10 text-red-500" : "bg-gold-start/10 text-gold-start"
                    )}>
                      {log.operation === 'create' ? <Plus className="w-4 h-4" /> :
                       log.operation === 'update' ? <Edit3 className="w-4 h-4" /> :
                       log.operation === 'delete' ? <Trash2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-text-main uppercase">
                        {log.operation}: {(log.details?.title as string) || (log.details?.url as string) || (isAr ? 'عملية مبهمة' : 'Unknown Operation')}
                      </h4>
                      <p className="text-[11px] text-text-muted opacity-50 flex items-center gap-2 mt-1">
                        <User className="w-3 h-3" /> {log.email} • <Clock className="w-3 h-3" /> {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '...'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {deleteLogConfirmId === log.id ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="px-3 py-1 bg-red-500 text-white text-[9px] caps font-bold border border-red-400"
                        >
                          {isAr ? 'حذف' : 'Del'}
                        </button>
                        <button 
                          onClick={() => setDeleteLogConfirmId(null)}
                          className="px-3 py-1 bg-bg-soft text-text-muted text-[9px] caps font-bold border border-border-subtle"
                        >
                          {isAr ? 'تراجع' : 'Exit'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteLogConfirmId(log.id)}
                        disabled={!!isDeletingLog}
                        className="p-2 text-text-muted opacity-0 group-hover:opacity-100 transition-all hover:text-red-500"
                        title={isAr ? 'حذف السجل' : 'Delete Log'}
                      >
                        {isDeletingLog === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        if (log.details) {
                          setNewTitle((log.details.title as string) || '');
                          setNewContent((log.details.content as string) || '');
                          setNewUrl((log.details.url as string) || '');
                          setNewType((log.details.type as LibraryItem['type']) || 'law');
                          setIsUploadModalOpen(true);
                        }
                      }}
                      className="flex items-center gap-2 text-[10px] font-bold caps text-gold-start opacity-0 group-hover:opacity-100 transition-all hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> {translations.reuse}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Effective Access */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsUploadModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gold-gradient rounded-full shadow-[0_10px_30px_rgba(212,175,55,0.3)] flex items-center justify-center text-bg-deep z-30 no-print lg:hidden"
        title={isAr ? 'إضافة قانون جديد' : 'Add New Law'}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Upload/Edit Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-bg-deep/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-bg-sidebar border border-border-subtle relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-gold-gradient">
                    {editingItem ? (isAr ? 'تعديل وثيقة' : 'Edit Document') : (isAr ? 'إيداع وثيقة جديدة' : 'Deposit New Document')}
                  </h3>
                  <p className="text-[10px] caps tracking-widest opacity-40 mt-1">{isAr ? 'أرشفة القوانين والقرارات' : 'Archive Laws and Decisions'}</p>
                </div>
                <button onClick={resetForm} className="p-2 text-text-muted hover:text-text-main transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
                {/* Input Options Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Link Detection Section */}
                  <div className="p-5 bg-gold-start/5 border border-gold-start/10 rounded-sm space-y-3">
                    <label className="text-[10px] caps text-gold-start font-bold flex items-center gap-2">
                      <Globe className="w-3 h-3" />
                      {isAr ? 'إيداع عبر رابط مائل / دولي' : 'Deposit via Web Link'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url" 
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="flex-1 bg-bg-deep border border-border-subtle px-3 py-2 focus:outline-none focus:border-gold-start/40 text-[12px] font-mono"
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        onClick={detectUrlInfo}
                        disabled={!newUrl || isDetecting}
                        className={cn(
                          "px-3 py-2 bg-bg-sidebar border border-border-subtle text-gold-start font-bold text-[9px] caps hover:bg-gold-start/10 transition-all",
                          (!newUrl || isDetecting) && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        {isDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Local File Upload Section */}
                  <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-sm space-y-3">
                    <label className="text-[10px] caps text-emerald-500 font-bold flex items-center gap-2">
                      <Upload className="w-3 h-3" />
                      {isAr ? 'إيداع ملف من الجهاز (PDF, Word)' : 'Upload from Device (PDF, Word)'}
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt,.md"
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingFile}
                        className={cn(
                          "w-full px-3 py-2 bg-bg-sidebar border border-border-subtle text-emerald-500 font-bold text-[9px] caps hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2",
                          isUploadingFile && "opacity-50 animate-pulse"
                        )}
                      >
                        {isUploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAr ? 'اختيار ملف' : 'SELECT FILE'}
                      </button>
                    </div>
                  </div>
                </div>

                {uploadQueue.length > 0 && (
                  <div className="space-y-3 bg-bg-deep/50 p-4 border border-border-subtle/30 rounded-sm">
                    <label className="text-[10px] caps text-gold-start font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        {isAr ? 'الملفات المجهزة للإيداع' : 'Files Pending Deposit'}
                      </span>
                      <span className="text-gold-start/40">[{uploadQueue.length}]</span>
                    </label>
                    <div className="space-y-2">
                      {uploadQueue.map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3 bg-bg-sidebar border border-border-subtle/50 p-3 group animate-in slide-in-from-top-1">
                          <div className="w-8 h-8 flex items-center justify-center bg-bg-deep border border-border-subtle text-gold-start">
                            <span className="text-[8px] font-black">{idx + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[12px] font-bold text-text-main truncate">{item.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <select 
                                value={item.type}
                                onChange={(e) => {
                                  setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, type: e.target.value as LibraryItem['type'] } : q));
                                }}
                                className="bg-transparent border-none p-0 text-[10px] text-gold-start/60 focus:ring-0 cursor-pointer hover:text-gold-start"
                              >
                                <option value="law">{isAr ? 'قانون' : 'Law'}</option>
                                <option value="decree">{isAr ? 'قرار' : 'Decree'}</option>
                                <option value="ministerial_decree">{isAr ? 'قرار وزاري' : 'Ministerial Decree'}</option>
                                <option value="regulation">{isAr ? 'لائحة' : 'Regulation'}</option>
                                <option value="convention">{isAr ? 'اتفاقية' : 'Convention'}</option>
                              </select>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setUploadQueue(prev => prev.filter(q => q.id !== item.id))}
                            className="p-1.5 text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] caps text-gold-start/60 font-bold">{isAr ? 'العنوان' : 'Title'}</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-bg-deep border border-border-subtle px-4 py-3 focus:outline-none focus:border-gold-start/40 font-bold text-lg"
                    placeholder={isAr ? 'عنوان القانون أو التحديث...' : 'Law title or update name...'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <label className="text-[10px] caps text-gold-start/60 font-bold">{isAr ? 'النوع' : 'Document Type'}</label>
                    <select 
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as LibraryItem['type'])}
                      className={cn(
                        "w-full bg-bg-deep border border-border-subtle px-4 py-3 focus:outline-none focus:border-gold-start/40 text-[13px]",
                        isAr && "direction-rtl"
                      )}
                    >
                      <option value="law">{isAr ? 'قانون' : 'Law'}</option>
                      <option value="regulation">{isAr ? 'لائحة' : 'Regulation'}</option>
                      <option value="decree">{isAr ? 'قرار' : 'Decree'}</option>
                      <option value="ministerial_decree">{isAr ? 'قرار وزاري' : 'Ministerial Decree'}</option>
                      <option value="convention">{isAr ? 'اتفاقية' : 'Convention'}</option>
                      <option value="recommendation">{isAr ? 'توصية' : 'Recommendation'}</option>
                      <option value="update">{isAr ? 'تحديث/تعديل' : 'Update/Amendment'}</option>
                      <option value="url">{isAr ? 'رابط مرجعي' : 'External URL'}</option>
                    </select>
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-[10px] caps text-gold-start/60 font-bold">{isAr ? 'الخصوصية' : 'Privacy'}</label>
                    <button
                      type="button"
                      onClick={() => setIsPublic(!isPublic)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border transition-all rounded-sm",
                        isPublic 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" 
                          : "bg-amber-500/5 border-amber-500/20 text-amber-500"
                      )}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-[12px] font-bold caps">
                        {isPublic 
                          ? (isAr ? 'عام (مرئي للجميع)' : 'Public (Visible to All)') 
                          : (isAr ? 'خاص (لي فقط)' : 'Private (Me Only)')}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] caps text-gold-start/60 font-bold">{isAr ? 'ارتباط' : 'Establish Relations'}</label>
                    <div className="flex flex-wrap gap-1 border border-border-subtle bg-bg-deep p-1.5 min-h-[46px]">
                      {items.filter(i => i.id !== editingItem?.id).map(item => (
                         <button
                           key={item.id}
                           onClick={() => {
                             setRelatedIds(prev => 
                               prev.includes(item.id) 
                                 ? prev.filter(id => id !== item.id) 
                                 : [...prev, item.id]
                             );
                           }}
                           className={cn(
                             "px-2 py-0.5 text-[9px] font-bold rounded-sm transition-all whitespace-nowrap",
                             relatedIds.includes(item.id) ? "bg-gold-start text-bg-deep" : "text-text-muted hover:bg-bg-sidebar/50"
                           )}
                         >
                           {item.title.length > 20 ? item.title.slice(0, 20) + '...' : item.title}
                         </button>
                      ))}
                    </div>
                  </div>

                <div className="space-y-2">
                  <label className="text-[10px] caps text-gold-start/60 font-bold">{isAr ? 'المحتوى' : 'Legal Content'}</label>
                  <textarea 
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-bg-deep border border-border-subtle px-4 py-4 focus:outline-none focus:border-gold-start/40 min-h-[250px] leading-relaxed text-[15px]"
                    placeholder={isAr ? 'أدخل نص القانون أو القرار هنا...' : 'Paste law text or decree here...'}
                  />
                </div>
              </div>

               <div className="p-8 border-t border-border-subtle bg-bg-deep/30 flex justify-end gap-4">
                  <button onClick={resetForm} className="px-6 py-2.5 text-[10px] font-bold caps text-text-muted hover:text-text-main transition-all">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                   onClick={() => handleUpload(false)}
                   disabled={isSaving || (!newTitle && !newContent && uploadQueue.length === 0)}
                   className={cn(
                     "px-8 py-2.5 bg-gold-gradient text-bg-deep font-bold text-[11px] caps rounded-sm shadow-xl active:scale-95 transition-all flex items-center gap-2",
                     (isSaving || (!newTitle && !newContent && uploadQueue.length === 0)) && "opacity-50 cursor-not-allowed"
                   )}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? (isAr ? 'جاري الحفظ لإيداع المستند...' : 'SAVING & DEPOSITING...') : (isAr ? 'حفظ وإيداع نهائي' : 'SAVE & DEPOSIT')}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
