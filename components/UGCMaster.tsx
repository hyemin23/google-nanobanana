
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, FileUp, CheckCircle, Download, AlertCircle, Trash2, Wand2, Zap, Smartphone, Eye, X } from 'lucide-react';
import LocationGrid from './LocationGrid';
import { LOCATIONS } from '../constants/ugcPresets';
import { GenerationConfig, Quality, AspectRatio } from '../types';
import { generateFashionContent, parseGeminiError } from '../services/geminiService';

const UGCMaster: React.FC = () => {
  const [config, setConfig] = useState<GenerationConfig>({
    freePrompt: '',
    locationIds: ['korean_subway_station'],
    quality: '2K', 
    aspectRatio: '9:16', 
    gender: 'Female',
    imageFile: null
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setConfig(prev => ({ ...prev, imageFile: file }));
          setError(null);
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleGenerate = async () => {
    if (!config.imageFile) {
      setError("의류 사진을 업로드하거나 이미지를 복사(Ctrl+V)해서 붙여넣으세요.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    const selectedLocations = config.locationIds?.map(id => LOCATIONS.find(l => l.id === id)).filter(Boolean) || [];
    const taskLocations = selectedLocations.length > 0 ? selectedLocations : [{ id: 'custom', name: '자유 설정', prompt: '' }];

    for (const location of taskLocations) {
      const tempId = `${location!.id}-${Date.now()}`;
      setResults(prev => [{ id: tempId, status: 'loading', locationName: location!.name }, ...prev]);

      try {
        const res = await generateFashionContent(config, location!.prompt);
        setResults(prev => prev.map(r => r.id === tempId ? { ...r, imageUrl: res.imageUrl, status: 'success' } : r));
      } catch (err) {
        const parsed = parseGeminiError(err);
        setResults(prev => prev.map(r => r.id === tempId ? { ...r, status: 'error', errorMessage: parsed.message } : r));
        
        if (parsed.message.includes("권한") || parsed.message.includes("403")) {
          const win = window as any;
          if (win.aistudio && win.aistudio.openSelectKey) {
            win.aistudio.openSelectKey();
          }
        }
      }
    }
    setIsGenerating(false);
  };

  const handleDownloadAll = async () => {
    const successfulResults = results.filter(r => r.status === 'success');
    for (let i = 0; i < successfulResults.length; i++) {
      const res = successfulResults[i];
      const link = document.createElement('a');
      link.href = res.imageUrl;
      link.download = `화보_${res.locationName}_${i}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setConfig(prev => ({ ...prev, imageFile: file }));
      setError(null);
    }
  };

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-full mx-auto px-6 py-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* 제어 패널 (좌측) */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-white/5 p-5 rounded-2xl shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-sm font-bold tracking-tight text-white uppercase italic">생성 도구</h2>
              </div>
              <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
                {(['1K', '2K', '4K'] as Quality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setConfig(prev => ({ ...prev, quality: q }))}
                    className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${config.quality === q ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-white'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-[16/6] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group ${
                  config.imageFile ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-white/10 hover:border-indigo-500/50 bg-white/5'
                }`}
              >
                {config.imageFile ? (
                  <div className="flex items-center gap-3 p-3 bg-black/60 backdrop-blur-xl rounded-lg border border-white/10 shadow-xl">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{config.imageFile.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, imageFile: null})); }} className="p-1.5 hover:bg-red-500/20 rounded-md">
                      <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-2">
                    <FileUp className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">의류 업로드 (복사/붙여넣기 가능)</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">추가 지시사항</label>
                   <div className="flex gap-1">
                    {(['1:1', '9:16', '16:9'] as AspectRatio[]).map((ar) => (
                      <button key={ar} onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ar }))} className={`px-2 py-0.5 rounded text-[8px] font-bold border transition-all ${config.aspectRatio === ar ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-600'}`}>{ar}</button>
                    ))}
                   </div>
                </div>
                <textarea 
                  rows={4}
                  placeholder="예: 자연스러운 포즈, 도시적인 분위기, 필름 감성..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner text-white placeholder:text-slate-800"
                  value={config.freePrompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, freePrompt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">장소 선택</label>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                  <LocationGrid 
                    selectedIds={config.locationIds || []} 
                    onToggle={(id) => setConfig(prev => ({
                      ...prev, 
                      locationIds: prev.locationIds?.includes(id) 
                        ? prev.locationIds.filter(lid => lid !== id) 
                        : [...(prev.locationIds || []), id]
                    }))} 
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !config.imageFile}
                className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 relative overflow-hidden ${
                  isGenerating ? 'bg-slate-800 text-indigo-400' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'
                }`}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-black" />}
                {isGenerating ? '이미지 생성 중...' : '프로덕션 시작'}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold animate-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* 결과 갤러리 (우측) */}
        <div className="xl:col-span-8">
          <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl min-h-[600px] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-3 z-10 border-b border-white/5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">생성 결과 갤러리</h3>
              <div className="flex items-center gap-3">
                {results.some(r => r.status === 'success') && (
                  <button onClick={handleDownloadAll} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-600/20 transition-all">
                    <Download className="w-3 h-3" /> 전체 다운로드
                  </button>
                )}
                {results.length > 0 && <span className="text-[9px] font-bold text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full">{results.length}개 유닛</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
              {results.length > 0 ? (
                results.map(res => (
                  <div key={res.id} className="relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-lg group animate-in fade-in slide-in-from-bottom-4">
                    {res.status === 'loading' ? (
                      <div className="aspect-[9/16] flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 animate-pulse italic">{res.locationName} 생성 중</p>
                      </div>
                    ) : res.status === 'error' ? (
                      <div className="aspect-[9/16] p-6 text-center flex flex-col items-center justify-center space-y-3 bg-red-500/5">
                        <AlertCircle className="w-8 h-8 text-red-500/20" />
                        <p className="text-[9px] text-red-400 font-bold leading-relaxed">{res.errorMessage}</p>
                        <button onClick={() => removeResult(res.id)} className="text-[8px] font-bold uppercase text-slate-500 hover:text-white underline tracking-widest">삭제</button>
                      </div>
                    ) : (
                      <div className="relative group overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(res.imageUrl)}>
                        <img src={res.imageUrl} className="w-full h-auto transition-transform duration-[1.2s] ease-out group-hover:scale-105" alt={res.locationName} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-5">
                           <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-indigo-400 uppercase italic">{res.locationName}</p>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">{config.quality} • {config.aspectRatio}</span>
                              </div>
                              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { const link = document.createElement('a'); link.href = res.imageUrl; link.download = `화보_${res.locationName}.png`; link.click(); }} className="p-2.5 bg-white text-black rounded-full hover:scale-110 shadow-lg">
                                  <Download className="w-4 h-4" />
                                </button>
                                <button onClick={() => removeResult(res.id)} className="p-2.5 bg-slate-900 text-white rounded-full hover:bg-red-500 shadow-lg">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center h-[450px] opacity-10">
                  <Smartphone className="w-16 h-16 mb-4" />
                  <p className="font-bold uppercase tracking-widest text-[10px]">설정 후 버튼을 눌러주세요</p>
                </div>
              )}
            </div>
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
                  link.download = `화보_다운로드_${Date.now()}.png`;
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

export default UGCMaster;
