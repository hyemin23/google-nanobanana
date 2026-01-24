
import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [apiKey, setApiKey] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if key exists in local storage
    const storedKey = localStorage.getItem('GOOGLE_API_KEY');
    if (storedKey) {
      onKeySelected();
      return;
    }
    
    // Check IDX environment
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      win.aistudio.hasSelectedApiKey().then((hasKey: boolean) => {
        if (hasKey) onKeySelected();
        setChecking(false);
      });
    } else {
      setChecking(false);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim().length > 10) {
      localStorage.setItem('GOOGLE_API_KEY', apiKey.trim());
      onKeySelected();
    } else {
      alert("유효한 API 키를 입력해주세요.");
    }
  };

  const handleIdxSelect = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      await win.aistudio.openSelectKey();
      onKeySelected();
    }
  };

  if (checking) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#020617] p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-indigo-600/5 blur-[100px]" />
      
      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/30">
          <Key className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-black text-center text-white mb-2 tracking-tight">API KEY REQUIRED</h1>
        <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
          Google AI Studio에서 발급받은 API 키를 입력하세요.<br/>
          키는 브라우저에만 안전하게 저장됩니다.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-center tracking-widest font-mono text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!apiKey}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            시작하기
            <ArrowRight className="w-4 h-4" />
          </button>

          {(window as any).aistudio && (
            <button
              onClick={handleIdxSelect}
              className="w-full py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-bold rounded-xl hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Google 계정으로 키 선택 (IDX)
            </button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
          >
            Google AI Studio에서 키 발급받기
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
