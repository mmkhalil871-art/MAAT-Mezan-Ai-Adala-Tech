import React from 'react';
import { motion } from 'motion/react';
import { LogIn, Sun, Moon, Scale, ShieldAlert } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { signInWithGoogle } from '../lib/firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginPageProps {
  onLogin: () => void;
  onGuestAccess: () => void;
  isAr: boolean;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  toggleLanguage: () => void;
}

export default function LoginPage({ onLogin, onGuestAccess, isAr, theme, onThemeToggle, toggleLanguage }: LoginPageProps) {
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        // Enforce personal email if strictly requested
        const personalDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com'];
        const emailDomain = user.email?.split('@')[1]?.toLowerCase();
        
        if (emailDomain && !personalDomains.includes(emailDomain)) {
          // If the user strictly meant "personal email only" vs corporate
          // we can block it here, or just let them through but with a warning.
          // I will enforce it to match the prompt's "condition".
          setError(isAr 
            ? "يرجى تسجيل الدخول باستخدام بريد إلكتروني شخصي (مثل Gmail أو Outlook)." 
            : "Please sign in using a personal email (e.g., Gmail or Outlook).");
          return;
        }

        onLogin();
      }
    } catch (err: unknown) {
      console.error('Login Error:', err);
      setError(isAr ? "فشل تسجيل الدخول. يرجى التحقق من الاتصال والمحاولة مرة أخرى." : "Login failed. Please check your connection and try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const content = {
    title: isAr ? "ماعت" : "MAAT",
    subtitle: isAr ? "ميزان تقنية العدالة الذكي" : "Mezan Ai Adala Tech",
    tagline: "v2.0.4-SOVEREIGN",
    description: isAr 
      ? "منصة ذكاء اصطناعي متقدمة للأتمتة القضائية وتحسين سير العمل."
      : "Advanced AI platform for judicial automation and workflow optimization.",
    loginBtn: isAr ? "الدخول بالحساب الشخصي" : "Sign in with Personal Account",
    guestBtn: isAr ? "الدخول بصفة زائر" : "Continue as Guest",
    authenticating: isAr ? "جاري المصادقة..." : "Authenticating..."
  };

  return (
    <div 
      className="min-h-[100dvh] w-full bg-bg-deep flex flex-col items-center justify-center p-[clamp(0.5rem,3vh,2rem)] relative overflow-y-auto overflow-x-hidden antialiased transition-colors duration-700" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-start/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold-start/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-lite-bg via-white/50 to-lite-bg opacity-30" />
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, rotateX: 5, perspective: 1200 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "w-[clamp(340px,94%,600px)] portrait:w-[94%] landscape:w-[clamp(360px,85%,580px)] border-2 relative z-10 theme-radius transition-all duration-700 my-auto flex flex-col max-h-[94dvh] min-h-[min(760px,94dvh)]",
          "p-[clamp(1.75rem,6vh,4rem)]",
          theme === 'dark' ? "bg-bg-soft border-gold-start/20 shadow-[0_0_120px_rgba(0,0,0,0.8)]" : "bg-white border-lite-border shadow-[0_50px_140px_rgba(27,54,93,0.25)]"
        )}
      >
        <div className="flex flex-col items-center text-center w-full flex-shrink-0">
          {/* Internal Controls Bar */}
          <div className="w-full flex justify-end items-center gap-3 mb-[clamp(1rem,3vh,2rem)] -mt-1" dir="ltr">
            <div className={cn(
              "flex p-1 border theme-radius transition-all relative overflow-hidden",
              theme === 'dark' ? "bg-bg-soft/50 border-border-subtle/20" : "bg-white/50 border-lite-border"
            )}>
              {[
                { id: 'en', label: 'EN', active: !isAr },
                { id: 'ar', label: 'AR', active: isAr }
              ].map((lang) => (
                <button 
                  key={lang.id}
                  onClick={lang.active ? undefined : toggleLanguage}
                  className={cn(
                    "px-[clamp(0.4rem,1.2vw,1rem)] py-[clamp(0.2rem,0.6vw,0.4rem)] transition-all font-bold text-[clamp(9px,1.1vw,11px)] uppercase tracking-wider relative z-10",
                    lang.active 
                      ? (theme === 'dark' ? "text-bg-deep" : "text-white") 
                      : (theme === 'dark' ? "text-text-muted hover:text-gold-start" : "text-lite-accent/60 hover:text-lite-accent")
                  )}
                >
                  {lang.active && (
                    <motion.div 
                      layoutId="login-lang-active"
                      className={cn(
                        "absolute inset-0 theme-radius shadow-sm",
                        theme === 'dark' ? "bg-gold-start" : "bg-lite-accent"
                      )}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{lang.label}</span>
                </button>
              ))}
            </div>
            
            <button 
              onClick={onThemeToggle}
              className={cn(
                "p-[clamp(0.3rem,1vw,0.6rem)] border transition-all theme-radius group shadow-sm",
                theme === 'dark' ? "bg-bg-soft/50 hover:bg-gold-start/10 border-gold-start/20" : "bg-white/50 hover:bg-lite-accent/5 border-lite-border"
              )}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-[clamp(12px,1.5vw,16px)] h-[clamp(12px,1.5vw,16px)] text-gold-start" /> : <Moon className="w-[clamp(12px,1.5vw,16px)] h-[clamp(12px,1.5vw,16px)] text-lite-accent" />}
            </button>
          </div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={cn(
              "flex flex-col items-center justify-center transition-all duration-700 aspect-square",
              "w-[clamp(4rem,12vh,5.5rem)]",
              theme === 'dark' ? "bg-gold-start/10 border-2 border-gold-start/20 logo-3d theme-radius mb-[clamp(1rem,3vh,1.5rem)]" : "bg-lite-accent shadow-2xl shadow-[#1B365D]/30 theme-radius mb-[clamp(1rem,3vh,1.5rem)]"
            )}
          >
            <Scale className={cn("w-[45%] h-[45%] mb-1 relative z-10", theme === 'dark' ? "text-gold-start" : "text-white")} />
          </motion.div>
          
          <div className="mb-[clamp(1rem,4vh,2rem)] w-full">
            <h1 className="text-[clamp(1.5rem,4vw,2.4rem)] font-serif text-text-main mb-[clamp(0.25rem,1vh,0.75rem)] tracking-tight text-gold-gradient font-bold leading-tight">
              {content.title}
            </h1>
            <div className="flex flex-col items-center gap-1 px-[5%]">
              <p className="text-[clamp(13px,1.8vw,16px)] text-text-main font-bold uppercase tracking-[clamp(0.15em,0.25vw,0.35em)]">
                {content.subtitle}
              </p>
              <p className="text-[clamp(10px,1.2vw,13px)] text-text-muted font-bold uppercase tracking-[0.1em] max-w-[min(90%,400px)]">
                {content.tagline}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-[clamp(1rem,3vh,2rem)] w-full overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">
          <div className="text-center max-w-[min(94%,450px)] mx-auto pt-2">
            <p className="text-[clamp(14px,1.6vw,17px)] text-text-muted leading-relaxed font-sans font-medium">
              {content.description}
            </p>
          </div>

          <div className="flex flex-col gap-[clamp(1rem,3vh,1.5rem)] w-full max-w-[460px] mx-auto">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className={cn(
                "w-full py-[clamp(1rem,2vh,1.4rem)] px-10 font-bold text-[clamp(13px,1.5vw,16px)] uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50 theme-radius shadow-xl relative group overflow-hidden",
                theme === 'dark' ? "bg-primary-action text-bg-deep" : "bg-lite-accent text-white hover:shadow-2xl hover:-translate-y-0.5"
              )}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {isLoggingIn ? (
                <span className="animate-pulse">{content.authenticating}</span>
              ) : (
                <>
                  <LogIn className="w-[clamp(14px,1.8vw,18px)] h-[clamp(14px,1.8vw,18px)]" />
                  <span>{content.loginBtn}</span>
                </>
              )}
            </button>
            <button
              onClick={onGuestAccess}
              className={cn(
                "w-full py-[clamp(1rem,2vh,1.4rem)] px-10 font-bold text-[clamp(13px,1.5vw,16px)] uppercase tracking-[0.12em] transition-all flex items-center justify-center gap-4 active:scale-[0.98] border-2 theme-radius group",
                theme === 'dark' ? "border-gold-start/20 text-gold-start hover:bg-gold-start/5" : "border-lite-accent/20 text-lite-accent hover:bg-lite-accent/5 hover:border-lite-accent/40"
              )}
            >
              {content.guestBtn}
            </button>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-red-500/5 border border-red-500/20 flex items-center gap-3 theme-radius text-center justify-center"
            >
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[11px] sm:text-[12px] text-red-500 font-bold uppercase tracking-wider">{error}</p>
            </motion.div>
          )}

          <div className={cn(
            "w-full flex justify-center items-center opacity-50 pt-[clamp(1rem,3vh,2rem)] border-t border-border-subtle/30"
          )}>
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 bg-gold-start rounded-full shadow-[0_0_8px_rgba(230,198,130,0.5)]" />
              <div className="w-1.5 h-1.5 bg-gold-start rounded-full opacity-50" />
              <div className="w-1.5 h-1.5 bg-gold-start rounded-full opacity-20" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
