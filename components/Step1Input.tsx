import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { analyzeProduct } from '../services/geminiService';
import { ShoppingBag, Upload, ArrowRight, Sparkles, Loader2, Ruler, ClipboardList, Clipboard } from 'lucide-react';
import { SizeData } from '../types';

const Step1Input: React.FC = () => {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [userDesc, setUserDesc] = useState('');

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => store.setProductInfo({ mainImageUrl: reader.result as string });
          reader.readAsDataURL(file);
        }
      }
    }
  }, [store]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleMainImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => store.setProductInfo({ mainImageUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!store.mainImageUrl) return;
    setLoading(true);
    try {
      const result = await analyzeProduct(store.mainImageUrl, userDesc);
      store.setAnalysis(result);
      store.setProductInfo({ name: userDesc.split(' ')[0] || 'AI PRODUCT' });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isTop = store.analysis?.category === '상의' || store.analysis?.category === '아우터' || store.analysis?.category === '셋업';

  return (
    <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Step 1. Smart Analysis</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <Clipboard className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Ctrl+V Paste Active</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">상품 설명/소재</label>
              <textarea 
                value={userDesc} 
                onChange={(e) => setUserDesc(e.target.value)}
                placeholder="예: 오버핏 울 블렌딩 가디건, 차콜 컬러, 울 80% 나일론 20%"
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 outline-none transition-all resize-none"
              />
            </div>

            <div 
              onClick={() => document.getElementById('main-upload')?.click()}
              className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                store.mainImageUrl ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'
              }`}
            >
              {store.mainImageUrl ? (
                <img src={store.mainImageUrl} className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Upload or Paste Reference Cut</span>
                  <span className="text-[9px] text-slate-600 mt-1 block">누끼 컷 또는 깔끔한 바닥 컷 권장</span>
                </div>
              )}
              <input id="main-upload" type="file" className="hidden" onChange={handleMainImage} />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || !store.mainImageUrl}
              className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-400" />}
              AI 지능형 상품 판별
            </button>
          </div>
        </div>

        {store.analysis && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 animate-in zoom-in-95">
             <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Analysis Result</h4>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <ResultChip label="Category" value={store.analysis.category} />
                <ResultChip label="Fit" value={store.analysis.fit} />
                <ResultChip label="Material" value={store.analysis.materialType} className="col-span-2" />
             </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-7 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl h-full">
          <div className="flex items-center gap-3 mb-6">
            <Ruler className="w-6 h-6 text-indigo-400" />
            <h3 className="text-xl font-bold uppercase tracking-tight">Step 2. Size Measurement</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isTop ? (
              <>
                <SizeInput label="어깨너비" field="shoulder" />
                <SizeInput label="가슴단면" field="chest" />
                <SizeInput label="소매길이" field="sleeve" />
                <SizeInput label="총장" field="length" />
              </>
            ) : (
              <>
                <SizeInput label="허리단면" field="waist" />
                <SizeInput label="힙단면" field="hip" />
                <SizeInput label="허벅지" field="thigh" />
                <SizeInput label="밑단" field="hem" />
                <SizeInput label="총장" field="length" />
              </>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generation Quality</span>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as const).map(res => (
                  <button 
                    key={res}
                    onClick={() => store.setResolution(res)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${store.resolution === res ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => store.setStep(2)}
              disabled={!store.analysis}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20 disabled:opacity-50 transition-all hover:scale-[1.01]"
            >
              AI 룩북 팩토리 가동
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultChip = ({ label, value, className = "" }: { label: string, value: string, className?: string }) => (
  <div className={`bg-slate-950/50 p-3 rounded-xl border border-slate-800 ${className}`}>
    <span className="text-[9px] text-slate-500 block mb-1 uppercase tracking-wider">{label}</span>
    <span className="text-sm font-bold text-slate-200">{value}</span>
  </div>
);

const SizeInput = ({ label, field }: { label: string, field: keyof SizeData }) => {
  const store = useStore();
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 tracking-tight">{label}</label>
      <input 
        value={store.sizeData[field] || ''} 
        onChange={(e) => store.setSizeData({ [field]: e.target.value })}
        placeholder="00" 
        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-center focus:border-indigo-500 outline-none transition-all" 
      />
    </div>
  );
};

export default Step1Input;