
import React, { useState } from 'react';
import { Shirt, ArrowRight, AlertTriangle, CheckCircle2, ShieldBan, Wand2, Loader2, Download, X, AlertCircle } from 'lucide-react';
import { analyzeGarmentStructure, generateTopDesignReplacement, parseGeminiError } from '../services/geminiService';
import { TopDesignAnalysis, Resolution, AspectRatio } from '../types';

const TopDesignReplacement: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TopDesignAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptOverride, setPromptOverride] = useState('');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [consentL2, setConsentL2] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const handleImageUpload = (type: 'base' | 'ref', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'base') setBaseImage(reader.result as string);
        else setRefImage(reader.result as string);
        setAnalysis(null); // Reset analysis on new upload
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!baseImage || !refImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeGarmentStructure(baseImage, refImage);
      setAnalysis(result);
    } catch (err) {
      const parsed = parseGeminiError(err);
      setError("Analysis Failed: " + parsed.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!baseImage || !refImage) return;
    if (analysis?.level === 'L3') return;
    if (analysis?.level === 'L2' && !consentL2) return;

    setIsGenerating(true);
    setError(null);
    try {
      const url = await generateTopDesignReplacement(baseImage, refImage, resolution, aspectRatio, promptOverride);
      setResultImage(url);
    } catch (err) {
      const parsed = parseGeminiError(err);
      setError(parsed.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* Control Panel */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Shirt className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-tight">상의 디자인 교체 (Design Swap)</h3>
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">구조 분석 기반 디자인 트랜스퍼</p>
             </div>
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">원본 (Target)</label>
              <div 
                onClick={() => document.getElementById('tdr-base')?.click()}
                className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                  baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                }`}
              >
                {baseImage ? <img src={baseImage} className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500 font-bold uppercase">Upload Base</span>}
                <input id="tdr-base" type="file" className="hidden" onChange={(e) => handleImageUpload('base', e)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">디자인 참고 (Ref)</label>
              <div 
                onClick={() => document.getElementById('tdr-ref')?.click()}
                className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                  refImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                }`}
              >
                {refImage ? <img src={refImage} className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-500 font-bold uppercase">Upload Design</span>}
                <input id="tdr-ref" type="file" className="hidden" onChange={(e) => handleImageUpload('ref', e)} />
              </div>
            </div>
          </div>

          {/* Analysis Section */}
          <div className="space-y-4">
             {!analysis ? (
               <button 
                 onClick={handleAnalyze}
                 disabled={isAnalyzing || !baseImage || !refImage}
                 className="w-full py-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "1단계: 구조 적합성 분석"}
               </button>
             ) : (
               <div className={`p-4 rounded-xl border ${
                 analysis.level === 'L1' ? 'bg-green-500/10 border-green-500/30' :
                 analysis.level === 'L2' ? 'bg-amber-500/10 border-amber-500/30' :
                 'bg-red-500/10 border-red-500/30'
               }`}>
                 <div className="flex items-center gap-3 mb-2">
                    {analysis.level === 'L1' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {analysis.level === 'L2' && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {analysis.level === 'L3' && <ShieldBan className="w-5 h-5 text-red-500" />}
                    <span className={`text-sm font-bold ${
                      analysis.level === 'L1' ? 'text-green-400' :
                      analysis.level === 'L2' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {analysis.level === 'L1' ? '안전 (Safe Match)' :
                       analysis.level === 'L2' ? '주의 (Structure Change)' :
                       '불가 (Block)'}
                    </span>
                 </div>
                 <p className="text-[11px] text-slate-300 leading-relaxed">{analysis.reason}</p>
                 <div className="flex gap-2 mt-3 text-[10px] font-bold text-slate-500 uppercase">
                    <span>Base: {analysis.baseCategory || 'N/A'}</span>
                    <span>→</span>
                    <span>Ref: {analysis.refCategory || 'N/A'}</span>
                 </div>
               </div>
             )}
          </div>

          {/* Generation Controls */}
          {analysis && analysis.level !== 'L3' && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
               {analysis.level === 'L2' && (
                 <label className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-black/30 transition-colors">
                    <input type="checkbox" checked={consentL2} onChange={(e) => setConsentL2(e.target.checked)} className="mt-1" />
                    <span className="text-[10px] text-slate-400 leading-snug">
                      <strong className="text-amber-400 block mb-0.5">배경 재구성 동의</strong>
                      참고 의류의 부피가 원본보다 작아, 드러나는 배경 영역이 AI로 자동 생성됨을 이해했습니다.
                    </span>
                 </label>
               )}

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">추가 프롬프트 (선택)</label>
                  <textarea 
                    value={promptOverride} 
                    onChange={(e) => setPromptOverride(e.target.value)}
                    placeholder="예: 조금 더 루즈한 핏으로 변경해줘."
                    className="w-full h-16 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none resize-none"
                  />
               </div>

               <div className="flex gap-2">
                  <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="2K">2K</option><option value="4K">4K</option>
                  </select>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none">
                    <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:3">4:3</option>
                  </select>
               </div>

               <button 
                 onClick={handleGenerate}
                 disabled={isGenerating || (analysis.level === 'L2' && !consentL2)}
                 className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                 디자인 교체 실행
               </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
        </div>
      </div>

      {/* Result Panel */}
      <div className="lg:col-span-7">
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl h-full min-h-[600px] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-4 z-10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Shirt className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">교체 결과 (Preview)</h3>
              </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            {isGenerating ? (
               <div className="flex flex-col items-center justify-center gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">Re-texturing Garment...</p>
                    <p className="text-[10px] text-slate-500">Lighting Adaptation & Structure Matching</p>
                  </div>
               </div>
            ) : resultImage ? (
               <div className="relative w-full h-full group rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => setSelectedPreview(resultImage)}>
                  <img src={resultImage} className="w-full h-full object-contain" />
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={resultImage} download={`design_swap_${Date.now()}.png`} onClick={(e) => e.stopPropagation()} className="p-3 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform"><Download className="w-5 h-5" /></a>
                  </div>
               </div>
            ) : (
               <div className="text-center opacity-20">
                  <Shirt className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">원본과 참고 이미지를 업로드하고<br/>구조 분석을 시작하세요</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setSelectedPreview(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10">
            <X className="w-8 h-8" />
          </button>
          <img src={selectedPreview} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default TopDesignReplacement;
