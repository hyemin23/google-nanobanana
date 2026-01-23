
import React, { useState, useEffect, useRef } from 'react';
import { Palette, ImageIcon, Loader2, Download, CheckCircle2, Circle, Shirt, Layers, ArrowRight, Pipette, Upload, X, AlertCircle, Zap, ChevronRight, Wand2, Sparkles } from 'lucide-react';
import { generateMultiGarmentColorChange, parseGeminiError } from '../services/geminiService';

const COLOR_PRESETS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Khaki', hex: '#F0E68C' },
  { name: 'Brown', hex: '#A52A2A' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Green', hex: '#008000' },
  { name: 'Olive', hex: '#808000' },
];

export type RegionKey = 'upper_garment' | 'lower_garment' | 'outerwear';

const REGION_META: Record<RegionKey, { label: string; icon: React.ReactNode }> = {
  upper_garment: { label: '상의 (Top)', icon: <Shirt className="w-4 h-4" /> },
  lower_garment: { label: '하의 (Bottom)', icon: <Layers className="w-4 h-4" /> },
  outerwear: { label: '아우터 (Outer)', icon: <Layers className="w-4 h-4" /> } // Using Layers as placeholder for Outer
};

export interface RegionConfig {
  isEnabled: boolean;
  mode: 'picker' | 'reference';
  targetColor: string; // Used for picker mode or as a fallback/description
  refImage: string | null;
  sourceRegion: RegionKey; // Where to extract color FROM in the reference image
  extractedHex: string | null; // Auto-extracted pigment
}

const GarmentColorChange: React.FC = () => {
  // --- Global State ---
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(''); // Added user prompt state

  // --- Multi-Region Configuration State ---
  const [configs, setConfigs] = useState<Record<RegionKey, RegionConfig>>({
    upper_garment: { isEnabled: true, mode: 'picker', targetColor: 'Navy', refImage: null, sourceRegion: 'upper_garment', extractedHex: null },
    lower_garment: { isEnabled: false, mode: 'picker', targetColor: 'Black', refImage: null, sourceRegion: 'lower_garment', extractedHex: null },
    outerwear: { isEnabled: false, mode: 'picker', targetColor: 'Beige', refImage: null, sourceRegion: 'outerwear', extractedHex: null }
  });

  // --- Helper: Client-side Color Extraction ---
  const extractDominantColor = (imageSrc: string, regionKey: RegionKey) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Simple center crop sampling for demo (In real-world, we'd use region segmentation or center-weighted)
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      
      const imageData = ctx.getImageData(25, 25, 50, 50); // Sample center 50%
      const data = imageData.data;
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      const hex = "#" + ((1 << 24) + (Math.floor(r / pixelCount) << 16) + (Math.floor(g / pixelCount) << 8) + Math.floor(b / pixelCount)).toString(16).slice(1).toUpperCase();
      
      setConfigs(prev => ({
        ...prev,
        [regionKey]: { ...prev[regionKey], extractedHex: hex }
      }));
    };
  };

  const handleBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRefUpload = (region: RegionKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setConfigs(prev => ({
          ...prev,
          [region]: { ...prev[region], refImage: result }
        }));
        extractDominantColor(result, region);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRegion = (region: RegionKey) => {
    setConfigs(prev => ({
      ...prev,
      [region]: { ...prev[region], isEnabled: !prev[region].isEnabled }
    }));
  };

  const updateConfig = (region: RegionKey, updates: Partial<RegionConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [region]: { ...prev[region], ...updates }
    }));
  };

  const handleGenerate = async () => {
    if (!baseImage) return;
    
    // Validation
    const activeRegions = (Object.entries(configs) as [string, RegionConfig][]).filter(([_, cfg]) => cfg.isEnabled);
    if (activeRegions.length === 0) {
      setError("최소 하나의 영역을 활성화해야 합니다.");
      return;
    }

    const invalidRef = activeRegions.find(([_, cfg]) => cfg.mode === 'reference' && !cfg.refImage);
    if (invalidRef) {
      setError(`${REGION_META[invalidRef[0] as RegionKey].label}의 참고 이미지를 업로드해주세요.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = await generateMultiGarmentColorChange(baseImage, configs, prompt);
      setResultImage(url);
    } catch (err) {
      const parsed = parseGeminiError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeRegionCount = (Object.values(configs) as RegionConfig[]).filter(c => c.isEnabled).length;

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* --- Control Panel (Left) --- */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-[2rem] shadow-xl space-y-8">
          
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/5">
                <Palette className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
               <h3 className="text-sm font-black text-white uppercase tracking-tight">Multi-Region Color Engine v2</h3>
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">다중 영역 동시 편집 & 교차 매칭 지원</p>
             </div>
          </div>

          {/* STEP 1: Base Image */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px]">1</span>
                  원본 의류 (Target)
                </label>
             </div>
             <div 
                onClick={() => document.getElementById('base-upload')?.click()}
                className={`relative aspect-[21/9] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center group ${
                  baseImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 hover:border-indigo-500/30 bg-black/40'
                }`}
              >
                {baseImage ? (
                  <img src={baseImage} className="h-full object-contain p-2" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-6 h-6 text-slate-600 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase">클릭하여 업로드</span>
                  </div>
                )}
                <input id="base-upload" type="file" className="hidden" onChange={handleBaseUpload} accept="image/*" />
             </div>
          </div>

          {/* STEP 2: Region Selection */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px]">2</span>
                편집 영역 선택 (Multi-Select)
             </label>
             <div className="grid grid-cols-3 gap-2">
                {(Object.keys(REGION_META) as RegionKey[]).map((key) => (
                   <button
                      key={key}
                      onClick={() => toggleRegion(key)}
                      className={`flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                         configs[key].isEnabled
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-950 border-white/5 text-slate-600 hover:bg-white/5'
                      }`}
                   >
                      {configs[key].isEnabled ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 opacity-50" />}
                      <span className="text-[10px] font-bold">{REGION_META[key].label.split('(')[0]}</span>
                   </button>
                ))}
             </div>
          </div>

          {/* STEP 3: Configuration Cards (Dynamic) */}
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px]">3</span>
                영역별 상세 설정
             </label>

             {activeRegionCount === 0 && (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
                   <p className="text-xs text-slate-600">편집할 영역을 위에서 선택해주세요.</p>
                </div>
             )}

             {(Object.keys(configs) as RegionKey[]).filter(k => configs[k].isEnabled).map((key) => {
                const cfg = configs[key];
                return (
                   <div key={key} className="bg-slate-950/50 border border-white/10 rounded-2xl p-4 space-y-4 animate-in slide-in-from-left-4">
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">{REGION_META[key].icon}</span>
                            <span className="text-xs font-bold text-white">{REGION_META[key].label}</span>
                         </div>
                         
                         {/* Mode Toggle */}
                         <div className="flex bg-black rounded-lg p-0.5 border border-white/10">
                            <button 
                               onClick={() => updateConfig(key, { mode: 'picker' })}
                               className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${cfg.mode === 'picker' ? 'bg-white text-black' : 'text-slate-500'}`}
                            >
                               Picker
                            </button>
                            <button 
                               onClick={() => updateConfig(key, { mode: 'reference' })}
                               className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${cfg.mode === 'reference' ? 'bg-white text-black' : 'text-slate-500'}`}
                            >
                               Reference Match
                            </button>
                         </div>
                      </div>

                      {/* Config Body */}
                      {cfg.mode === 'picker' ? (
                         <div className="space-y-3">
                            <div className="grid grid-cols-8 gap-1.5">
                               {COLOR_PRESETS.map(c => (
                                  <button
                                     key={c.name}
                                     onClick={() => updateConfig(key, { targetColor: c.name })}
                                     className={`aspect-square rounded-full border transition-all ${cfg.targetColor === c.name ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'}`}
                                     style={{ backgroundColor: c.hex }}
                                     title={c.name}
                                  />
                               ))}
                            </div>
                            <div className="flex items-center gap-2">
                               <input 
                                  type="text" 
                                  value={cfg.targetColor}
                                  onChange={(e) => updateConfig(key, { targetColor: e.target.value })}
                                  className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-700 outline-none"
                                  placeholder="직접 입력 (예: Sage Green)"
                               />
                            </div>
                         </div>
                      ) : (
                         <div className="grid grid-cols-2 gap-4">
                            {/* Ref Image Upload */}
                            <div 
                               onClick={() => document.getElementById(`upload-${key}`)?.click()}
                               className={`relative aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden ${
                                  cfg.refImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 bg-black/20 hover:border-slate-600'
                               }`}
                            >
                               {cfg.refImage ? (
                                  <img src={cfg.refImage} className="w-full h-full object-cover" />
                               ) : (
                                  <div className="text-center">
                                     <Upload className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                                     <span className="text-[8px] font-bold text-slate-500">참고 사진</span>
                                  </div>
                               )}
                               <input id={`upload-${key}`} type="file" className="hidden" onChange={(e) => handleRefUpload(key, e)} accept="image/*" />
                            </div>

                            {/* Ref Settings */}
                            <div className="space-y-3">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500">추출 대상 (Source)</label>
                                  <select 
                                     value={cfg.sourceRegion}
                                     onChange={(e) => updateConfig(key, { sourceRegion: e.target.value as RegionKey })}
                                     className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] font-bold text-white outline-none"
                                  >
                                     {(Object.keys(REGION_META) as RegionKey[]).map(k => (
                                        <option key={k} value={k}>{REGION_META[k].label.split('(')[0]}</option>
                                     ))}
                                  </select>
                                  {key !== cfg.sourceRegion && (
                                     <span className="text-[8px] text-indigo-400 flex items-center gap-1 mt-1">
                                        <Zap className="w-3 h-3" /> Cross-Match
                                     </span>
                                  )}
                               </div>

                               {cfg.extractedHex && (
                                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5">
                                     <div className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: cfg.extractedHex }} />
                                     <div>
                                        <span className="text-[8px] text-slate-500 block">AI Detected</span>
                                        <span className="text-[10px] font-bold text-white leading-none">{cfg.extractedHex}</span>
                                     </div>
                                  </div>
                               )}
                            </div>
                         </div>
                      )}
                   </div>
                );
             })}
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
             <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1 flex items-center gap-2">
               <Sparkles className="w-3 h-3" /> 추가 요청사항 (선택)
             </label>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 조금 더 밝은 톤으로, 자연스러운 조명 효과 추가..."
                className="w-full h-20 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none resize-none placeholder:text-slate-700"
             />
          </div>

          <button 
             onClick={handleGenerate} 
             disabled={isLoading || !baseImage || activeRegionCount === 0}
             className={`w-full py-5 rounded-2xl font-bold text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${
                isLoading ? 'bg-slate-800 text-indigo-400' : 'bg-white text-black hover:bg-indigo-50'
             }`}
          >
             {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 fill-black" />}
             {isLoading ? '멀티 레이어 렌더링 중...' : '색상 변경 실행'}
          </button>
          
          {error && (
             <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4" /> {error}
             </div>
          )}
        </div>
      </div>

      {/* --- Result Panel (Right) --- */}
      <div className="lg:col-span-6">
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl h-full min-h-[600px] flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-4 z-10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">통합 렌더링 결과</h3>
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
                    <p className="text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">Processing Layers...</p>
                    <div className="flex gap-2 justify-center">
                       {(Object.entries(configs) as [string, RegionConfig][]).filter(([_,c]) => c.isEnabled).map(([k]) => (
                          <span key={k} className="text-[9px] px-2 py-0.5 bg-slate-800 rounded text-slate-400 font-bold uppercase">{k.split('_')[0]}</span>
                       ))}
                    </div>
                  </div>
               </div>
            ) : resultImage ? (
               <div className="relative w-full h-full group rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => setSelectedPreview(resultImage)}>
                  <img src={resultImage} className="w-full h-full object-contain" />
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={resultImage} download={`multi_color_result.png`} onClick={(e) => e.stopPropagation()} className="p-3 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform"><Download className="w-5 h-5" /></a>
                  </div>
               </div>
            ) : (
               <div className="text-center opacity-20">
                  <Palette className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">영역을 선택하고<br/>색상을 매칭하세요</p>
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

export default GarmentColorChange;
