
import React, { useState } from 'react';
import { Sparkles, ImageIcon, Download, Lock, Unlock, Zap, ShieldCheck, UserX, Shirt, Footprints, AlertCircle, Eye, Trash2, X, Layers, Loader2, Move, Watch, Palette, RefreshCw, Scissors } from 'lucide-react';
import { generatePartialEdit, parseGeminiError } from '../services/geminiService';
import { Resolution, AspectRatio } from '../types';

export interface PartialEditConfig {
  lockedRegions: string[];
  topOptions: {
    mode: 'color' | 'design' | 'material' | 'replace';
    fitLock: boolean;
    neckLock: boolean;
    sleeveLock: boolean;
  };
  shoesOption: 'change' | 'remove';
  accessoryOption: 'remove' | 'replace';
  poseOption: 'maintain' | 'subtle' | 'rotate';
}

const PartialEdit: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Configuration State
  const [lockedRegions, setLockedRegions] = useState<string[]>(['bottom', 'pose', 'face']); // Default: Lock essential parts
  const [topConfig, setTopConfig] = useState<PartialEditConfig['topOptions']>({
    mode: 'design',
    fitLock: true,
    neckLock: false,
    sleeveLock: false
  });
  const [shoesOption, setShoesOption] = useState<'change' | 'remove'>('change');
  const [poseOption, setPoseOption] = useState<'maintain' | 'subtle' | 'rotate'>('maintain');
  const [accessoryOption, setAccessoryOption] = useState<'remove' | 'replace'>('remove');
  const [currentPreset, setCurrentPreset] = useState<'safe' | 'standard' | 'strong' | 'custom'>('custom');

  const toggleLock = (id: string) => {
    setLockedRegions(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
    setCurrentPreset('custom');
  };

  const isLocked = (id: string) => lockedRegions.includes(id);

  // Presets Logic
  const applyPreset = (level: 'safe' | 'standard' | 'strong') => {
    setCurrentPreset(level);
    if (level === 'safe') {
      setLockedRegions(['bottom', 'pose', 'face', 'shoes']);
      setTopConfig({ mode: 'color', fitLock: true, neckLock: true, sleeveLock: true });
      setAccessoryOption('remove');
      // Accessories unlocked implies "edit/remove" in our logic if not in lockedRegions, 
      // but let's say 'accessories' isn't in lockedRegions, it means we act on it.
      // If we want to remove accessories, we should NOT lock them, and set option to remove.
      setLockedRegions(['bottom', 'pose', 'face', 'shoes']); // Top & Accessories Unlocked
    } else if (level === 'standard') {
      setLockedRegions(['bottom', 'face']); // Top, Shoes, Pose, Accessories Unlocked (Pose can be subtle)
      setTopConfig({ mode: 'design', fitLock: true, neckLock: false, sleeveLock: false });
      setPoseOption('subtle');
      setShoesOption('change');
    } else if (level === 'strong') {
      setLockedRegions(['bottom']); // Only Bottom Locked
      setTopConfig({ mode: 'replace', fitLock: false, neckLock: false, sleeveLock: false });
      setPoseOption('rotate');
      setShoesOption('change');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!baseImage) return;
    setIsLoading(true);
    setError(null);

    const config: PartialEditConfig = {
      lockedRegions,
      topOptions: topConfig,
      shoesOption,
      accessoryOption,
      poseOption: isLocked('pose') ? 'maintain' : poseOption,
    };

    try {
      const url = await generatePartialEdit(
        baseImage,
        config,
        prompt,
        resolution,
        aspectRatio
      );
      setResultImage(url);
    } catch (err) {
      const parsed = parseGeminiError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const RegionToggle = ({ id, label, icon }: { id: string, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => toggleLock(id)}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
        isLocked(id)
          ? 'bg-slate-800 border-indigo-500 text-white shadow-md shadow-indigo-500/10' 
          : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      {isLocked(id) ? <Lock className="w-3.5 h-3.5 text-indigo-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-600" />}
    </button>
  );

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* Control Panel */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl space-y-5">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Scissors className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-tight">부분 편집 (Selective Edit)</h3>
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">영역별 유지/변경 정밀 제어</p>
             </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <div 
              onClick={() => document.getElementById('pe-upload')?.click()}
              className={`relative aspect-[16/9] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
              }`}
            >
              {baseImage ? (
                <>
                  <img src={baseImage} className="w-full h-full object-contain p-2" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setBaseImage(null); }} className="p-2 bg-black/60 rounded-full hover:bg-red-500 transition-colors">
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center group">
                  <ImageIcon className="w-8 h-8 text-slate-700 group-hover:text-indigo-500 transition-colors mx-auto mb-2" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">이미지 업로드</span>
                </div>
              )}
              <input id="pe-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'safe', label: '🛡️ 안전 변경', desc: '색상/질감만' },
              { id: 'standard', label: '⚖️ 표준 변경', desc: '디자인/신발' },
              { id: 'strong', label: '⚡ 강력 변경', desc: '완전 교체/포즈' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentPreset === p.id 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                    : 'bg-black/20 border-white/5 text-slate-500 hover:bg-white/5'
                }`}
              >
                <span className="text-[10px] font-bold mb-0.5">{p.label}</span>
                <span className="text-[8px] opacity-70">{p.desc}</span>
              </button>
            ))}
          </div>

          {/* Region Locks Grid */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">영역 잠금 (Lock Regions)</label>
             <div className="grid grid-cols-2 gap-2">
                <RegionToggle id="bottom" label="하의 (Bottoms)" icon={<Layers className="w-3.5 h-3.5" />} />
                <RegionToggle id="top" label="상의 (Tops)" icon={<Shirt className="w-3.5 h-3.5" />} />
                <RegionToggle id="shoes" label="신발 (Shoes)" icon={<Footprints className="w-3.5 h-3.5" />} />
                <RegionToggle id="face" label="얼굴 (Face)" icon={<UserX className="w-3.5 h-3.5" />} />
                <RegionToggle id="pose" label="포즈 (Pose)" icon={<Move className="w-3.5 h-3.5" />} />
                <RegionToggle id="accessories" label="악세사리 (Acc)" icon={<Watch className="w-3.5 h-3.5" />} />
             </div>
          </div>

          {/* Contextual Edit Options */}
          {!isLocked('top') && (
            <div className="space-y-3 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">상의 변경 옵션</span>
                <div className="flex gap-1">
                   {/* Fit Lock Toggles */}
                   {[{k: 'fitLock', l: '핏'}, {k: 'neckLock', l: '넥'}, {k: 'sleeveLock', l: '소매'}].map(opt => (
                     <button
                       key={opt.k}
                       onClick={() => setTopConfig(p => ({ ...p, [opt.k]: !p[opt.k as keyof typeof p] }))}
                       className={`px-2 py-1 rounded text-[9px] font-bold border transition-all ${topConfig[opt.k as keyof typeof topConfig] ? 'bg-indigo-500 text-white border-indigo-500' : 'text-slate-500 border-slate-700'}`}
                     >
                       {opt.l} 고정
                     </button>
                   ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[{id: 'color', l: '색상'}, {id: 'design', l: '디자인'}, {id: 'material', l: '소재'}, {id: 'replace', l: '교체'}].map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setTopConfig(p => ({ ...p, mode: m.id as any }))}
                    className={`py-2 rounded-lg text-[10px] font-bold transition-all ${topConfig.mode === m.id ? 'bg-white text-black' : 'bg-black/40 text-slate-500'}`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(!isLocked('pose') || !isLocked('shoes')) && (
            <div className="grid grid-cols-2 gap-3">
               {!isLocked('pose') && (
                 <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">포즈 변경</span>
                    <div className="flex gap-1">
                      <button onClick={() => setPoseOption('subtle')} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${poseOption === 'subtle' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>미세</button>
                      <button onClick={() => setPoseOption('rotate')} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${poseOption === 'rotate' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>회전</button>
                    </div>
                 </div>
               )}
               {!isLocked('shoes') && (
                 <div className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">신발 옵션</span>
                    <div className="flex gap-1">
                      <button onClick={() => setShoesOption('change')} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${shoesOption === 'change' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>변경</button>
                      <button onClick={() => setShoesOption('remove')} className={`flex-1 py-1.5 rounded text-[9px] font-bold ${shoesOption === 'remove' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>제거</button>
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">추가 지시사항 (선택)</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 셔츠 색상을 네이비로 변경하고, 더 자연스러운 핏으로 다듬어줘."
              className="w-full h-20 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs focus:border-indigo-500 outline-none resize-none placeholder:text-slate-700 text-white"
            />
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isLoading || !baseImage} 
            className={`w-full py-5 rounded-2xl font-bold text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${
              isLoading ? 'bg-slate-800 text-indigo-400' : 'bg-white text-black hover:bg-indigo-50'
            }`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-black" />}
            {isLoading ? '부분 편집 렌더링 중...' : '편집 레이어 생성'}
          </button>
          
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
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">편집 결과 (Originality Check)</h3>
              </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center gap-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">AI Segmentation & Inpainting...</p>
                    <div className="flex gap-2 justify-center">
                      {lockedRegions.map(r => (
                        <span key={r} className="text-[9px] px-2 py-0.5 bg-slate-800 rounded text-slate-400 font-bold uppercase">{r} Locked</span>
                      ))}
                    </div>
                  </div>
               </div>
            ) : resultImage ? (
               <div className="relative w-full h-full group rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => setSelectedPreview(resultImage)}>
                  <img src={resultImage} className="w-full h-full object-contain" />
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={resultImage} download={`edit_${Date.now()}.png`} onClick={(e) => e.stopPropagation()} className="p-3 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform"><Download className="w-5 h-5" /></a>
                  </div>
               </div>
            ) : (
               <div className="text-center opacity-20">
                  <Layers className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">편집할 영역을 설정하고<br/>이미지를 생성하세요</p>
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

export default PartialEdit;
