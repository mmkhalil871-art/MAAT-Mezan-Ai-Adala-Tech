import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, ShieldCheck, Waves } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceConversationProps {
  onClose: () => void;
  language: 'en' | 'ar';
}

export default function VoiceConversation({ onClose, language }: VoiceConversationProps) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const isAr = language === 'ar';

  const stopConversation = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    sourceNodesRef.current.forEach(node => {
        try { node.stop(); } catch { /* ignore */ }
    });
    sourceNodesRef.current = [];
  }, []);

  const pcmToBase64 = (float32Array: Float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7FFF;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!audioCtxRef.current) return;

    try {
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const float32Array = new Float32Array(int16Array.length);
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 0x7FFF;
        }

        const buffer = audioCtxRef.current.createBuffer(1, float32Array.length, 24000); // Gemini returns 24k
        buffer.getChannelData(0).set(float32Array);

        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);

        const now = audioCtxRef.current.currentTime;
        const startTime = Math.max(now, nextStartTimeRef.current);
        
        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
        sourceNodesRef.current.push(source);
        
        setStatus('speaking');
        source.onended = () => {
            sourceNodesRef.current = sourceNodesRef.current.filter(n => n !== source);
            if (sourceNodesRef.current.length === 0) {
                setStatus('listening');
            }
        };

    } catch (err) {
        console.error("Audio playback error:", err);
    }
  }, []);

  const startConversation = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext({ sampleRate: 16000 });
      } else if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      ws.onopen = async () => {
        setIsActive(true);
        setStatus('listening');

        // Capture Mic
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        const source = audioCtxRef.current!.createMediaStreamSource(stream);
        const processor = audioCtxRef.current!.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        
        source.connect(processor);
        processor.connect(audioCtxRef.current!.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN && !isMuted) {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64 = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'audio') {
          playAudioChunk(msg.data);
        } else if (msg.type === 'text') {
          setTranscription(prev => (prev + ' ' + msg.data).slice(-150));
        } else if (msg.type === 'interrupted') {
          // Stop current playback
          sourceNodesRef.current.forEach(node => {
            try { node.stop(); } catch { /* ignore */ }
          });
          sourceNodesRef.current = [];
          nextStartTimeRef.current = audioCtxRef.current?.currentTime || 0;
          setStatus('listening');
        } else if (msg.type === 'error') {
          setError(msg.message);
          stopConversation();
        }
      };

      ws.onclose = () => {
        stopConversation();
      };

      ws.onerror = () => {
          setError(isAr ? 'خطأ في الاتصال بالخادم' : 'Connection error');
          stopConversation();
      };

    } catch (err) {
      console.error("Failed to start voice conversation:", err);
      setError(isAr ? 'تعذر الوصول إلى الميكروفون' : 'Could not access microphone');
      setStatus('error');
    }
  }, [isAr, isMuted, playAudioChunk, stopConversation]);

  useEffect(() => {
    return () => {
      stopConversation();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(console.error);
      }
    };
  }, [stopConversation]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className={cn(
        "fixed bottom-24 right-6 z-50 p-6 theme-radius border-2 shadow-2xl transition-all duration-500",
        "w-[clamp(320px,90vw,400px)]",
        "bg-bg-soft border-gold-start/30"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            status === 'listening' ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
            status === 'speaking' ? "bg-gold-start shadow-[0_0_10px_rgba(212,175,55,0.5)]" :
            status === 'connecting' ? "bg-blue-500 animate-bounce" :
            "bg-text-muted"
          )} />
          <h3 className="text-sm font-black caps tracking-[0.1em] text-gold-start flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {isAr ? 'جلسة صوتية حية' : 'LIVE VOICE SESSION'}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gold-start/10 rounded-full transition-colors text-text-muted"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-10 relative">
        {/* Animated Rings */}
        <AnimatePresence>
          {(status === 'listening' || status === 'speaking') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [0.8, 1.5, 2], 
                    opacity: [0.5, 0.2, 0] 
                  }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    delay: i * 0.4,
                    ease: "easeOut"
                  }}
                  className={cn(
                    "absolute w-20 h-20 rounded-full border",
                    status === 'speaking' ? "border-gold-start" : "border-lite-accent"
                  )}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isActive ? stopConversation : startConversation}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 overflow-hidden",
            isActive ? "bg-gold-gradient shadow-[0_0_40px_rgba(212,175,55,0.4)]" : "bg-bg-deep border-2 border-border-subtle"
          )}
        >
          {isActive ? (
            <Mic className="w-10 h-10 text-white animate-pulse" />
          ) : (
            <Mic className="w-10 h-10 text-text-muted" />
          )}
          
          {status === 'connecting' && (
            <div className="absolute inset-0 border-4 border-gold-start/20 border-t-gold-start rounded-full animate-spin" />
          )}
        </motion.button>

        <div className="mt-8 text-center w-full min-h-[60px]">
          {status === 'connecting' && (
            <p className="text-sm font-medium animate-pulse text-gold-start">
              {isAr ? 'جاري ربط المحرك السيادي...' : 'Linking Sovereign Engine...'}
            </p>
          )}
          {status === 'listening' && (
            <div className="space-y-2">
                <p className="text-sm font-black text-green-500 uppercase tracking-widest">{isAr ? 'أنا أستمع...' : 'LISTENING...'}</p>
                <div className="flex justify-center gap-1">
                    {[1,2,3,4,5].map(i => (
                        <motion.div 
                            key={i}
                            animate={{ height: [4, 12, 4] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            className="w-1 bg-green-500 rounded-full"
                        />
                    ))}
                </div>
            </div>
          )}
          {status === 'speaking' && (
            <div className="space-y-3">
              <p className="text-sm font-black text-gold-start uppercase tracking-widest leading-none mb-1">
                {isAr ? 'يتحدث معات...' : 'MAAT SPEAKING...'}
              </p>
              <p className="text-xs text-text-muted italic line-clamp-2 max-w-[280px] mx-auto opacity-70">
                "{transcription}"
              </p>
            </div>
          )}
          {status === 'idle' && !error && (
            <p className="text-sm text-text-muted">
              {isAr ? 'اضغط للبدء في محادثة مباشرة' : 'Tap to start live conversation'}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded border border-red-500/20">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-subtle/20">
        <button
          onClick={() => setIsMuted(prev => !prev)}
          disabled={!isActive}
          className={cn(
            "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest p-2 rounded-lg transition-all",
            isMuted ? "bg-red-500/10 text-red-500" : "bg-gold-start/5 text-gold-start hover:bg-gold-start/10",
            !isActive && "opacity-50 cursor-not-allowed"
          )}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {isAr ? (isMuted ? 'إلغاء الكتم' : 'كتم') : (isMuted ? 'UNMUTE' : 'MUTE')}
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-deep/50 border border-border-subtle/30">
          <Waves className="w-3 h-3 text-gold-start" />
          <span className="text-[10px] font-black tracking-tighter text-text-muted">MAAT_LATENCY: OPTIMIZED</span>
        </div>
      </div>
    </motion.div>
  );
}
