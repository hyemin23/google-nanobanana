
import React, { useState } from 'react';
import { Sparkles, Download, ImageIcon, Wallpaper, Eye, X, Layers, Loader2, Trash2, Settings2, Ratio, Wand2, Upload } from 'lucide-react';
import { generateBackgroundChange, generateAutoBackgrounds } from '../services/geminiService';
import { Resolution, AspectRatio } from '../types';

type BgMode = 'upload' | 'auto';

const BackgroundChange: React.FC = () => {
  const [mode, setMode] = useState<BgMode>('upload');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [bgRefImage, setBgRefImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (type: 'base' | 'bg', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'base') setBaseImage(reader.result as string);
        else if (type === 'bg') setBgRefImage(reader.result as string);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!baseImage) return;
    if (mode === 'upload' && !bgRefImage) return;

    setIsLoading(true);
    
    try {
      if (mode === 'upload' && bgRefImage) {
        // 기존: 참고 이미지 기반 합성
        const result = await generateBackgroundChange(baseImage, bgRefImage, prompt, resolution, aspectRatio);
        if (result) {
          setResultImages(prev => [result, ...prev]);
        }
      } else if (mode === 'auto') {
        // 신규: AI 자동 추천 (3종 생성)
        const results = await generateAutoBackgrounds(baseImage, prompt, resolution, aspectRatio);
        if (results && results.length > 0) {
          setResultImages(prev => [...results, ...prev]);
        }
      }
    } catch (error) {
      console.error(error);
      alert("이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-12 p-6 animate-in fade-in duration-700">
      {/* 입력 영역 */}
      <div className="space-y-8">
        <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-8 space-y-8 shadow-2xl">
          <div className="flex items-center gap-4 px-2">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Wallpaper className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">배경 <span className="text-indigo-500">교체기</span></h3>
              <p className="text-xs text-gray-500 font-bold tracking-[0.3em] mt-1">AI 환경 합성 엔진</p>
            </div>
          </div>

          {/* 모드 선택 탭 */}
          <div className="bg-black/40 p-1.5 rounded-2xl border border-white/5 flex gap-1">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'upload' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              참고 이미지 업로드
            </button>
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'auto' 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              AI 자동 추천 (3종)
            </button>
          </div>

          {/* 이미지 업로드 영역 */}
          <div className="grid grid-cols-2 gap-6">
            <div className={`${mode === 'auto' ? 'col-span-2' : 'col-span-1'} space-y-3 transition-all duration-300`}>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">의류 원본 (Image A)</label>
              <div 
                onClick={() => document.getElementById('bgc-base-upload')?.click()}
                className={`relative ${mode === 'auto' ? 'aspect-[16/9]' : 'aspect-square'} rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group ${
                  baseImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-white/30 bg-black/40'
                }`}
              >
                {baseImage ? (
                  <>
                    <img src={baseImage} className="w-full h-full object-contain p-4" />
                    <button onClick={(e) => { e.stopPropagation(); setBaseImage(null); }} className="absolute top-3 right-3 p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors z-10 opacity-0 group-hover:opacity-100"><X className="w-4 h-4 text-white" /></button>
                  </>
                ) : (
                  <ImageIcon className="w-10 h-10 opacity-20 group-hover:opacity-40 transition-opacity" />
                )}
                <input id="bgc-base-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('base', e)} />
              </div>
            </div>

            {mode === 'upload' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">배경 참고 (Image B)</label>
                <div 
                  onClick={() => document.getElementById('bgc-bg-upload')?.click()}
                  className={`relative aspect-square rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group ${
                    bgRefImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-white/30 bg-black/40'
                  }`}
                >
                  {bgRefImage ? (
                    <>
                      <img src={bgRefImage} className="w-full h-full object-contain p-4" />
                      <button onClick={(e) => { e.stopPropagation(); setBgRefImage(null); }} className="absolute top-3 right-3 p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors z-10 opacity-0 group-hover:opacity-100"><X className="w-4 h-4 text-white" /></button>
                    </>
                  ) : (
                    <Wallpaper className="w-10 h-10 opacity-20 group-hover:opacity-40 transition-opacity" />
                  )}
                  <input id="bgc-bg-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('bg', e)} />
                </div>
              </div>
            )}
          </div>

          {/* 자동 모드 안내 */}
          {mode === 'auto' && (
            <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">자동 생성 배경 세트</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                 <div className="p-3 bg-black/40 rounded-xl border border-indigo-500/10 text-center">
                    <span className="text-lg block mb-1">🌤️</span>
                    <span className="text-[10px] font-bold text-slate-300">Soft Daylight<br/>Studio</span>
                 </div>
                 <div className="p-3 bg-black/40 rounded-xl border border-indigo-500/10 text-center">
                    <span className="text-lg block mb-1">🏢</span>
                    <span className="text-[10px] font-bold text-slate-300">Minimal<br/>Urban</span>
                 </div>
                 <div className="p-3 bg-black/40 rounded-xl border border-indigo-500/10 text-center">
                    <span className="text-lg block mb-1">🛋️</span>
                    <span className="text-[10px] font-bold text-slate-300">Warm<br/>Indoor</span>
                 </div>
              </div>
              <p className="text-[10px] text-indigo-300/70 text-center pt-2">
                * 이커머스 클릭률(CTR)에 최적화된 3가지 배경을 한 번에 생성합니다.
              </p>
            </div>
          )}

          {/* 옵션 설정 영역 */}
          <div className="space-y-5 bg-black/20 p-6 rounded-[2rem] border border-white/5">
             {/* 프롬프트 입력 */}
             <div className="space-y-2">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> 추가 프롬프트 (선택사항)
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mode === 'auto' ? "자동 추천 배경에 더하고 싶은 느낌이 있다면 적어주세요." : "예: 자연광을 조금 더 따뜻하게 표현해줘, 그림자를 부드럽게 처리해줘..."}
                  className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-4 text-xs focus:border-indigo-500 outline-none resize-none placeholder:text-slate-700 text-slate-300 transition-all"
                />
             </div>

             {/* 해상도 및 비율 */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="w-3 h-3" /> 해상도
                  </label>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                    {(['2K', '4K'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                          resolution === res ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Ratio className="w-3 h-3" /> 비율
                  </label>
                  <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500 h-[42px]"
                  >
                    <option value="1:1">1:1 (Square)</option>
                    <option value="9:16">9:16 (Story)</option>
                    <option value="4:3">4:3 (Classic)</option>
                    <option value="16:9">16:9 (Wide)</option>
                  </select>
                </div>
             </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isLoading || !baseImage || (mode === 'upload' && !bgRefImage)}
            className="w-full py-6 rounded-[2rem] bg-white text-black font-black text-sm shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            {isLoading ? '고해상도 렌더링 중...' : mode === 'auto' ? 'AI 배경 3종 자동 생성' : '배경 합성 실행'}
          </button>
        </div>
      </div>

      {/* 결과 갤러리 */}
      <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 flex flex-col min-h-[800px] shadow-2xl">
        <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 flex items-center justify-between">
          <span>합성된 <span className="text-indigo-500">환경 갤러리</span></span>
          {resultImages.length > 0 && <span className="text-xs font-bold text-slate-500 tracking-wide px-3 py-1 bg-white/5 rounded-full">{resultImages.length} RESULT</span>}
        </h3>
        <div className={`flex-1 grid gap-8 ${resultImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} bg-black/40 border border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative custom-scrollbar overflow-y-auto max-h-[800px]`}>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-gray-500 bg-black/80 z-20 backdrop-blur-xl">
              <div className="w-20 h-20 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-2">
                <p className="text-sm font-black uppercase tracking-[0.5em] animate-pulse text-indigo-400">배경 렌더링 중...</p>
                <p className="text-[10px] text-slate-500 font-bold">{mode === 'auto' ? '3가지 스타일 동시 생성 중' : `${resolution} • ${aspectRatio}`}</p>
              </div>
            </div>
          )}
          
          {resultImages.length > 0 ? (
            resultImages.map((url, i) => (
              <div key={i} className="relative group rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                <img src={url} className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button onClick={() => setSelectedImage(url)} className="p-4 bg-white text-black rounded-full shadow-2xl hover:scale-110 transition-transform"><Eye className="w-5 h-5" /></button>
                  <a href={url} download={`bg_synthesis_${i}.png`} className="p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-transform"><Download className="w-5 h-5" /></a>
                </div>
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                   <span className="text-[8px] font-bold text-white uppercase tracking-widest">Ver {resultImages.length - i}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-10 h-full">
              <Layers className="w-32 h-32 mb-8" />
              <p className="font-black uppercase tracking-[0.8em] text-xs">결과 대기 중</p>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-10 animate-in fade-in duration-500" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-10 right-10 p-5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10" onClick={() => setSelectedImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={selectedImage} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-500 rounded-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default BackgroundChange;
