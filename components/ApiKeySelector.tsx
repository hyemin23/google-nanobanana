
import React, { useState, useEffect } from 'react';
import { Key, Lock, ExternalLink, ShieldAlert } from 'lucide-react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);

  const checkKey = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      try {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (hasKey) {
          onKeySelected();
        }
      } catch (e) {
        console.error("Key check error:", e);
      } finally {
        setChecking(false);
      }
    } else {
      setTimeout(() => setChecking(false), 500);
    }
  };

  useEffect(() => {
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio && win.aistudio.openSelectKey) {
      try {
        await win.aistudio.openSelectKey();
        onKeySelected(); // Assume success immediately to avoid race conditions
      } catch (error) {
        console.error("Failed to open key selector:", error);
      }
    }
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest">Checking API Configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">API PERMISSION REQUIRED</h1>
        <p className="text-slate-400 mb-8 leading-relaxed text-sm">
          현재 Gemini 3 Pro 모델 사용 권한이 없습니다.<br/>
          (403 PERMISSION_DENIED 에러 발생 시)<br/>
          <strong className="text-indigo-400">유료 결제가 활성화된 GCP 프로젝트</strong>의<br/>
          API 키를 선택해야 고해상도 이미지 생성이 가능합니다.
        </p>

        <button
          onClick={handleSelectKey}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-xl shadow-indigo-500/20 group uppercase text-xs tracking-widest"
        >
          <Key className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          API 키 선택하기
        </button>

        <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-[10px] text-slate-500 hover:text-indigo-400 transition-colors uppercase font-bold tracking-widest"
          >
            Google Cloud 결제 및 할당량 문서
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-[9px] text-slate-600 leading-tight">
            * 403 에러는 선택한 프로젝트의 결제 수단이 유효하지 않거나 API가 활성화되지 않았을 때 발생합니다.
          </p>
        </div>
      </div>
    </div>
  );
};
