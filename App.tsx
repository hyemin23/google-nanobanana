
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Smartphone,
  Scissors,
  Menu,
  X,
  PanelLeftClose,
  Wallpaper,
  Settings,
  Key
} from 'lucide-react';
import UGCMaster from './components/UGCMaster';
import FitBuilder from './components/FitBuilder';
import BackgroundChange from './components/BackgroundChange';
import { ApiKeySelector } from './components/ApiKeySelector';

type StudioView = 'ugc' | 'fit' | 'bg';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<StudioView>('ugc');
  const [keySelected, setKeySelected] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const checkInitialKey = async () => {
    // 1. Check Local Storage
    const storedKey = localStorage.getItem('GOOGLE_API_KEY');
    if (storedKey) {
      setKeySelected(true);
      return;
    }

    // 2. Check Environment Variable (Development)
    if (process.env.API_KEY) {
      setKeySelected(true);
      return;
    }

    // 3. Check IDX Environment
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (hasKey) setKeySelected(true);
    }
  };

  useEffect(() => {
    checkInitialKey();
    
    // 화면 크기가 작으면 초기 상태 닫힘
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleOpenApiKeySettings = async () => {
    // Reset Key
    if (confirm("저장된 API 키를 삭제하고 다시 입력하시겠습니까?")) {
      localStorage.removeItem('GOOGLE_API_KEY');
      setKeySelected(false);
      
      const win = window as any;
      if (win.aistudio && win.aistudio.openSelectKey) {
        try {
          await win.aistudio.openSelectKey(); 
        } catch (e) {
          console.error("Failed to open key settings:", e);
        }
      }
    }
  };

  if (!keySelected) {
    return <ApiKeySelector onKeySelected={() => setKeySelected(true)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'ugc':
        return <UGCMaster />;
      case 'fit':
        return <FitBuilder />;
      case 'bg':
        return <BackgroundChange />;
      default:
        return <UGCMaster />;
    }
  };

  const navItems = [
    { id: 'ugc', name: '화보 생성', icon: <Smartphone className="w-5 h-5" />, desc: '자유 프롬프트 기반 화보' },
    { id: 'fit', name: '핏 마스터', icon: <Scissors className="w-5 h-5" />, desc: '포즈/앵글 정밀 편집' },
    { id: 'bg', name: '배경 합성', icon: <Wallpaper className="w-5 h-5" />, desc: 'AI 환경 합성 엔진' },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-[240px] border-r border-white/5 glass-panel flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none text-white">STUDIO</h1>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.3em]">AI PRO v3</span>
              </div>
            </div>
            {/* Close Button (Desktop/Mobile) */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as StudioView);
                  // 모바일에서는 메뉴 클릭 시 사이드바 닫기
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`w-full group flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  currentView === item.id 
                    ? 'bg-indigo-600 border-indigo-500 shadow-lg' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className={`p-2 rounded-lg ${currentView === item.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {item.icon}
                </div>
                <div className="text-left">
                  <p className={`text-xs font-bold tracking-tight ${currentView === item.id ? 'text-white' : 'text-slate-200'}`}>{item.name}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
             <div className="relative">
               <div className="w-2 h-2 bg-green-500 rounded-full" />
               <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
             </div>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">엔진 활성화</span>
          </div>

          <button 
            onClick={handleOpenApiKeySettings}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-slate-400 hover:text-white group"
          >
            <div className="p-1.5 bg-slate-800 rounded-lg group-hover:bg-indigo-600 transition-colors">
              <Key className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">API Key 변경</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 overflow-y-auto custom-scrollbar relative bg-slate-950 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'md:ml-[240px]' : 'ml-0'
        }`}
      >
        {/* Hamburger Button (Visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <div className="fixed top-4 left-4 z-30 animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-3 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl text-white shadow-xl hover:bg-indigo-600 hover:border-indigo-500 transition-all group"
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}

        <div className="min-h-full">
          {renderContent()}
        </div>
        <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none" />
      </main>
    </div>
  );
};

export default App;
