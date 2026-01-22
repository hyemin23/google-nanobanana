
import React, { useState } from 'react';
import { Sparkles, ImageIcon, Monitor, Layers, Loader2, Camera, CheckSquare, Square, Download, Trash2, LayoutGrid, Eye, X } from 'lucide-react';
import { generateFittingVariation, parseGeminiError } from '../services/geminiService';
import { Resolution, AspectRatio, ViewMode } from '../types';

interface VariationResult {
  id: string;
  url: string;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  angleLabel?: string;
}

const ANGLES = [
  { id: 'front', name: '정면' },
  { id: 'left35', name: '좌측 35°' },
  { id: 'right35', name: '우측 35°' },
  { id: 'left90', name: '좌측 90° (완전 측면)' },
  { id: 'right90', name: '우측 90° (완전 측면)' },
];

const FittingVariation: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [selectedAngles, setSelectedAngles] = useState<string[]>(['front']);

  const [results, setResults] = useState<VariationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const toggleAngle = (id: string) => {
    setSelectedAngles(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleImageUpload = (type: 'base' | 'ref', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'base') setBaseImage(reader.result as string);
        else setRefImage(reader.result as string);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!baseImage) {
      alert("상품 원본 이미지를 업로드해주세요.");
      return;
    }
    if (selectedAngles.length === 0) {
      alert("최소 하나 이상의 카메라 앵글을 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    
    const newResults: VariationResult[] = selectedAngles.map((angleId) => {
      const angle = ANGLES.find(a => a.id === angleId);
      return {
        id: `${Date.now()}-${angleId}`,
        url: '',
        status: 'loading',
        angleLabel: angle?.name || '기본'
      };
    });
    
    setResults(prev => [...newResults, ...prev]);

    await Promise.all(selectedAngles.map(async (angleId, index) => {
      const targetResId = newResults[index].id;
      try {
        const url = await generateFittingVariation(
          baseImage, 
          refImage, 
          prompt, 
          viewMode, 
          resolution, 
          aspectRatio,
          angleId
        );
        setResults(prev => prev.map(r => r.id === targetResId ? { ...r, url, status: 'success' } : r));
      } catch (err) {
        const parsed = parseGeminiError(err);
        setResults(prev => prev.map(r => r.id === targetResId ? { ...r, status: 'error', errorMessage: parsed.message } : r));
        
        if (parsed.message.includes("권한") || parsed.message.includes("403")) {
          const win = window as any;
          if (win.aistudio && win.aistudio.openSelectKey) {
            setTimeout(() => {
              if (confirm("API 키 권한 오류가 발생했습니다. 유료 계정의 키를 다시 선택하시겠습니까?")) {
                win.aistudio.openSelectKey();
              }
            }, 1000);
          }
        }
      }
    }));
    
    setIsGenerating(false);
  };

  const handleDownloadAll = async () => {
    const successfulResults = results.filter(r => r.status === 'success');
    for (let i = 0; i < successfulResults.length; i++) {
      const res = successfulResults[i];
      const link = document.createElement('a');
      link.href = res.url;
      link.download = `피팅_${res.angleLabel}_${i}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-700">
      
      {/* 설정 제어 (좌측) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-white/5 p-5 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
             <Camera className="w-5 h-5 text-indigo-400" />
             <h3 className="text-sm font-bold text-white uppercase tracking-tight">피팅 엔진 설정</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">의류 원본</label>
                <div 
                  onClick={() => document.getElementById('fv-base')?.click()} 
                  className={`relative aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                    baseImage ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                  }`}
                >
                   {baseImage ? (
                     <img src={baseImage} className="w-full h-full object-contain p-4" />
                   ) : (
                     <div className="text-center group">
                       <ImageIcon className="w-8 h-8 text-slate-800 group-hover:text-indigo-500 transition-colors mx-auto mb-2" />
                       <span className="text-[9px] text-slate-700 font-bold uppercase">상품 업로드</span>
                     </div>
                   )}
                   <input id="fv-base" type="file" className="hidden" onChange={(handleImageUpload.bind(null, 'base'))} />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">포즈 참고 (옵션)</label>
                <div 
                  onClick={() => document.getElementById('fv-ref')?.click()} 
                  className={`relative aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                    refImage ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                  }`}
                >
                   {refImage ? (
                     <img src={refImage} className="w-full h-full object-contain p-4" />
                   ) : (
                     <div className="text-center">
                       <Layers className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                       <span className="text-[9px] text-slate-700 font-bold uppercase">포즈 참고</span>
                     </div>
                   )}
                   <input id="fv-ref" type="file" className="hidden" onChange={(handleImageUpload.bind(null, 'ref'))} />
                </div>
             </div>
          </div>

          <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">카메라 앵글 (다중 선택)</span>
            <div className="grid grid-cols-1 gap-1.5">
               {ANGLES.map(angle => (
                 <button 
                  key={angle.id} 
                  onClick={() => toggleAngle(angle.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
                    selectedAngles.includes(angle.id) 
                      ? 'bg-indigo-600 border-indigo-500 text-white' 
                      : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                 >
                   <span className="text-[10px] font-bold uppercase tracking-widest">{angle.name}</span>
                   {selectedAngles.includes(angle.id) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                 </button>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">프레이밍</label>
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                {(['full', 'top'] as ViewMode[]).map(v => (
                  <button key={v} onClick={() => setViewMode(v)} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${viewMode === v ? 'bg-white text-black shadow-md' : 'text-slate-500 hover:text-white'}`}>{v === 'top' ? '상반신' : '전신'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">품질 & 비율</label>
              <div className="flex gap-1">
                <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none focus:border-indigo-500">
                  <option value="1K">1K</option><option value="2K">2K</option><option value="4K">4K</option>
                </select>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold outline-none focus:border-indigo-500">
                  <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:3">4:3</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">상세 요청사항</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="무드, 시선 처리 등 추가 지시사항..."
              className="w-full h-20 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-indigo-500 outline-none transition-all resize-none text-white placeholder:text-slate-700"
            />
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || !baseImage || selectedAngles.length === 0} 
            className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
              isGenerating ? 'bg-slate-800 text-indigo-400' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'
            }`}
          >
             {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
             {isGenerating ? '신경망 렌더링 중...' : '합성 시작'}
          </button>
        </div>
      </div>

      {/* 결과 화면 (우측) */}
      <div className="lg:col-span-7">
        <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl shadow-2xl flex flex-col min-h-[600px] max-h-[85vh] relative overflow-hidden">
           <div className="flex items-center justify-between mb-5 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-3 z-10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">피팅 결과 갤러리</h3>
              </div>
              <div className="flex items-center gap-3">
                {results.some(r => r.status === 'success') && (
                  <button onClick={handleDownloadAll} className="flex items-center gap-2 px-3 py-1 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-600/20 transition-all">
                    <Download className="w-3 h-3" /> 전체 저장
                  </button>
                )}
                {results.length > 0 && <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold rounded-full">{results.length}개 유닛</span>}
              </div>
           </div>

           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {results.length > 0 ? results.map(res => (
                <div key={res.id} className="relative aspect-auto rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-lg group animate-in fade-in slide-in-from-bottom-4">
                   {res.status === 'loading' ? (
                     <div className="aspect-[9/16] flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[9px] font-bold text-indigo-500 animate-pulse uppercase italic">{res.angleLabel} 렌더링</p>
                     </div>
                   ) : res.status === 'error' ? (
                     <div className="aspect-[9/16] p-6 text-center flex flex-col items-center justify-center space-y-3 bg-red-500/5">
                        <p className="text-[9px] text-red-400 font-bold leading-relaxed">{res.errorMessage}</p>
                        <button onClick={() => removeResult(res.id)} className="text-[8px] font-bold uppercase text-slate-500 hover:text-white underline tracking-widest">삭제</button>
                     </div>
                   ) : (
                     <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage(res.url)}>
                       <img src={res.url} className="w-full h-auto transition-transform duration-[1.2s] ease-out group-hover:scale-105" alt={res.angleLabel} />
                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase italic">{res.angleLabel}</p>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">{resolution} • {aspectRatio}</span>
                          </div>
                          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                             <button onClick={() => { const link = document.createElement('a'); link.href = res.url; link.download = `피팅_${res.angleLabel}.png`; link.click(); }} className="p-2.5 bg-white text-black rounded-full hover:scale-110 active:scale-90 transition-all shadow-lg">
                                <Download className="w-4 h-4" />
                             </button>
                             <button onClick={() => removeResult(res.id)} className="p-2.5 bg-slate-900 text-white rounded-full hover:bg-red-500 transition-all shadow-lg">
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                       <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/10">
                             <Eye className="w-4 h-4 text-white" />
                          </div>
                       </div>
                     </div>
                   )}
                </div>
              )) : (
                <div className="col-span-full flex flex-col items-center justify-center h-[400px] opacity-10">
                   <LayoutGrid className="w-12 h-12 mb-4" />
                   <p className="font-bold uppercase tracking-widest text-[10px]">설정을 마친 후 시작 버튼을 눌러주세요</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10" onClick={() => setSelectedImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img src={selectedImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300 rounded-lg" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-[-50px] flex gap-4">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = selectedImage;
                  link.download = `피팅_다운로드_${Date.now()}.png`;
                  link.click();
                }} 
                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-xl hover:bg-indigo-500 transition-all uppercase text-xs tracking-widest"
               >
                 <Download className="w-4 h-4" /> 이미지 저장
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FittingVariation;
