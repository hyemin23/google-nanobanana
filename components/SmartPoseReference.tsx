
import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Loader2, ShieldCheck, Activity, RefreshCcw, X, BookTemplate, UserCheck, AlertTriangle, Layers, Plus, Trash2, CheckCircle2, Download, Settings2, FlipHorizontal } from 'lucide-react';
import { generateSmartPose, analyzePoseSafety, analyzePoseQuality, parseGeminiError } from '../services/geminiService';
import { CommercialPoseResult, PoseSafetyAnalysis, PosePreset, PosePresetFamily, Resolution, AspectRatio } from '../types';
import { POSE_PRESETS_LIBRARY } from '../constants/posePresets';

interface CustomRefImage {
  id: string;
  url: string;
  analysis?: PoseSafetyAnalysis;
}

const SmartPoseReference: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('library');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  
  // Generation Settings
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [freePrompt, setFreePrompt] = useState<string>('');
  
  // Multi-select States
  const [selectedPresets, setSelectedPresets] = useState<PosePreset[]>([]);
  const [customRefs, setCustomRefs] = useState<CustomRefImage[]>([]);
  
  const [results, setResults] = useState<CommercialPoseResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [allowFallback, setAllowFallback] = useState(true);
  const [headless, setHeadless] = useState(true);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  // Group presets by family
  const families: PosePresetFamily[] = ['COMMERCE_SAFE', 'CROP_FOCUS', 'RECOVERY', 'ANGLE_SET', 'DETAIL_EMPHASIS', 'LOWER_BODY_FOCUS'];

  const handleBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCustomRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Convert FileList to array and process
    const newRefs: CustomRefImage[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const promise = new Promise<void>((resolve) => {
            reader.onloadend = () => {
                newRefs.push({
                    id: Date.now() + Math.random().toString(),
                    url: reader.result as string
                });
                resolve();
            };
        });
        reader.readAsDataURL(file);
        await promise;
    }
    setCustomRefs(prev => [...prev, ...newRefs]);
  };

  const removeCustomRef = (id: string) => {
    setCustomRefs(prev => prev.filter(r => r.id !== id));
  };

  const togglePreset = (preset: PosePreset) => {
    setSelectedPresets(prev => {
        const exists = prev.find(p => p.id === preset.id);
        if (exists) return prev.filter(p => p.id !== preset.id);
        return [...prev, preset];
    });
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    const successfulResults = results.filter(r => r.status === 'success' && r.url);
    for (let i = 0; i < successfulResults.length; i++) {
        const res = successfulResults[i];
        handleDownload(res.url, `SmartPose_${res.sourceName}_${i + 1}.png`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Stagger downloads
    }
  };

  const executeBatchSmartPose = async () => {
    if (!baseImage) return;
    
    // Combine all jobs
    const presetJobs = selectedPresets.map(p => ({ type: 'preset' as const, data: p }));
    const customJobs = customRefs.map(r => ({ type: 'custom' as const, data: r }));
    const allJobs = [...presetJobs, ...customJobs];

    if (allJobs.length === 0) return;

    setIsProcessing(true);

    // Initial result placeholders
    const newResults: CommercialPoseResult[] = allJobs.map(job => ({
        id: Math.random().toString(36).substr(2, 9),
        url: '',
        qc: null,
        status: 'generating',
        isFallback: false,
        sourceType: job.type,
        sourceName: job.type === 'preset' ? job.data.name_ko : 'Custom Reference'
    }));

    setResults(prev => [...newResults, ...prev]);

    // Parallel Execution Engine
    await Promise.all(allJobs.map(async (job, index) => {
        const resultId = newResults[index].id;
        
        try {
            let refUrl: string | null = null;
            let preset: PosePreset | undefined = undefined;
            let shouldFallback = false;
            let safetyInfo: PoseSafetyAnalysis | null = null;

            if (job.type === 'preset') {
                preset = job.data;
            } else {
                refUrl = job.data.url;
                // Safety Check for Custom
                try {
                    safetyInfo = await analyzePoseSafety(refUrl);
                    shouldFallback = allowFallback && (safetyInfo?.fallbackRecommended || (strictMode && safetyInfo?.riskLevel !== 'SAFE'));
                } catch (e) {
                    console.warn("Safety check skipped for job", index);
                }
            }

            // Generate
            const generatedUrl = await generateSmartPose(
                baseImage,
                refUrl,
                shouldFallback,
                { headless, resolution, aspectRatio, freePrompt, mirrorMode },
                preset
            );

            // CTR Scoring
            const qcResult = await analyzePoseQuality(generatedUrl);

            // Update individual result
            setResults(prev => prev.map(r => r.id === resultId ? {
                ...r,
                url: generatedUrl,
                status: 'success',
                qc: qcResult,
                isFallback: shouldFallback,
                fallbackReason: shouldFallback ? safetyInfo?.reason : undefined,
                appliedPreset: preset?.name_ko
            } : r));

        } catch (err) {
            const parsed = parseGeminiError(err);
            setResults(prev => prev.map(r => r.id === resultId ? { 
                ...r, 
                status: 'failed', 
                error: parsed.message 
            } : r));
        }
    }));

    setIsProcessing(false);
  };

  const totalSelected = selectedPresets.length + customRefs.length;

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* Input Panel */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg">
                <RefreshCcw className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-tight">Smart Pose Engine v2.2</h3>
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">다중 소스 병렬 처리 시스템</p>
             </div>
          </div>

          {/* Base Image (Always Required) */}
          <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">내 상품 (Target)</label>
              <div 
                  onClick={() => document.getElementById('spr-base')?.click()}
                  className={`relative aspect-[3/1] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center ${
                      baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                  }`}
              >
                  {baseImage ? <img src={baseImage} className="h-full object-contain p-2" /> : (
                      <div className="flex items-center gap-2">
                          <Camera className="w-5 h-5 text-slate-600" />
                          <span className="text-[10px] text-slate-500 font-bold uppercase">상품 업로드</span>
                      </div>
                  )}
                  <input id="spr-base" type="file" className="hidden" onChange={handleBaseUpload} />
              </div>
          </div>

          {/* Mode Tabs */}
          <div className="bg-black/40 p-1 rounded-xl flex gap-1 border border-white/5">
             <button 
                onClick={() => setActiveTab('library')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'library' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
             >
                <BookTemplate className="w-3 h-3" /> 라이브러리 ({selectedPresets.length})
             </button>
             <button 
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
             >
                <UserCheck className="w-3 h-3" /> 직접 업로드 ({customRefs.length})
             </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'library' ? (
             <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-400">다중 선택 가능 (Multi-Select)</span>
                    {selectedPresets.length > 0 && (
                        <button onClick={() => setSelectedPresets([])} className="text-[10px] text-red-400 font-bold hover:underline">
                            전체 해제
                        </button>
                    )}
                </div>
                {families.map(family => {
                   const presets = POSE_PRESETS_LIBRARY.filter(p => p.family === family);
                   if (presets.length === 0) return null;
                   
                   return (
                      <div key={family} className="space-y-2">
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{family.replace('_', ' ')}</h4>
                         <div className="grid grid-cols-2 gap-2">
                            {presets.map(preset => {
                               const isSelected = selectedPresets.some(p => p.id === preset.id);
                               return (
                                   <button
                                      key={preset.id}
                                      onClick={() => togglePreset(preset)}
                                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                                         isSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                            : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20'
                                      }`}
                                   >
                                      <div className="flex justify-between items-start mb-2">
                                         <span className="text-xl">{preset.ui.icon}</span>
                                         <div className="flex gap-1">
                                            {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                                            {preset.scoring_priors.ctr_expected >= 0.88 && !isSelected && (
                                               <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">BEST</span>
                                            )}
                                         </div>
                                      </div>
                                      <p className="text-[10px] font-bold truncate">{preset.name_ko}</p>
                                      <p className="text-[9px] opacity-60 truncate">{preset.name_en}</p>
                                   </button>
                               );
                            })}
                         </div>
                      </div>
                   )
                })}
             </div>
          ) : (
             <div className="space-y-3">
                <div 
                    onClick={() => document.getElementById('spr-ref-multi')?.click()}
                    className="relative h-20 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-black/40 transition-all cursor-pointer flex items-center justify-center gap-3 group"
                >
                    <Plus className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase group-hover:text-indigo-400">Add Reference Images</span>
                    <input id="spr-ref-multi" type="file" className="hidden" multiple onChange={handleCustomRefUpload} />
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {customRefs.map((ref) => (
                        <div key={ref.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-800 group">
                            <img src={ref.url} className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeCustomRef(ref.id)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {customRefs.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-[10px] text-slate-600">
                            업로드된 이미지가 없습니다.
                        </div>
                    )}
                </div>
             </div>
          )}

          {/* Detailed Options */}
          <div className="space-y-4 pt-2 border-t border-white/5">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">해상도</label>
                   <select 
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value as Resolution)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white outline-none"
                   >
                      <option value="1K">1K (Fast)</option>
                      <option value="2K">2K (Standard)</option>
                      <option value="4K">4K (High)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">비율</label>
                   <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold text-white outline-none"
                   >
                      <option value="9:16">9:16 (Story)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="3:4">3:4 (Portrait)</option>
                      <option value="4:3">4:3 (Landscape)</option>
                   </select>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">추가 프롬프트 (선택)</label>
                <textarea 
                   value={freePrompt}
                   onChange={(e) => setFreePrompt(e.target.value)}
                   placeholder="예: 배경을 도시적인 느낌으로, 부드러운 자연광 추가..."
                   className="w-full h-16 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none resize-none placeholder:text-slate-700"
                />
             </div>

             {/* Toggles Grid */}
             <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Headless Mode</span>
                    <button 
                        onClick={() => setHeadless(!headless)}
                        className={`w-8 h-4 rounded-full transition-colors ${headless ? 'bg-indigo-500' : 'bg-slate-700'} relative`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${headless ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                </div>
                
                {/* Mirror Mode Toggle */}
                <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-1.5">
                        <FlipHorizontal className="w-3 h-3 text-indigo-400" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Mirror Mode</span>
                    </div>
                    <button 
                        onClick={() => setMirrorMode(!mirrorMode)}
                        className={`w-8 h-4 rounded-full transition-colors ${mirrorMode ? 'bg-indigo-500' : 'bg-slate-700'} relative`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${mirrorMode ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                </div>

                {activeTab === 'upload' && (
                    <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl border border-white/5 col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Safety Fallback (Auto-Repair)</span>
                        <button 
                            onClick={() => setAllowFallback(!allowFallback)}
                            className={`w-8 h-4 rounded-full transition-colors ${allowFallback ? 'bg-indigo-500' : 'bg-slate-700'} relative`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${allowFallback ? 'left-4.5' : 'left-0.5'}`} />
                        </button>
                    </div>
                )}
             </div>
          </div>

          <button 
            onClick={executeBatchSmartPose}
            disabled={isProcessing || !baseImage || totalSelected === 0}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
            {isProcessing ? `Processing ${totalSelected} Jobs...` : `Generate ${totalSelected > 0 ? totalSelected : ''} Variations`}
          </button>
        </div>
      </div>

      {/* Result Panel */}
      <div className="lg:col-span-7">
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl h-full min-h-[600px] flex flex-col relative overflow-hidden">
           <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-2 z-10 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generation Queue</h3>
                </div>
                <div className="flex items-center gap-3">
                    {results.some(r => r.status === 'success' && r.url) && (
                        <button 
                            onClick={handleDownloadAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 border border-indigo-600/30 text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-600/30 transition-all"
                        >
                            <Download className="w-3 h-3" />
                            Download All
                        </button>
                    )}
                    {results.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded">
                            {results.filter(r => r.status === 'success').length} Completed / {results.length} Total
                        </span>
                    )}
                </div>
           </div>

           {results.length > 0 ? (
               <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar max-h-[800px]">
                   {results.map((res) => (
                       <div key={res.id} className="relative w-full" onClick={() => res.url && setSelectedPreview(res.url)}>
                           <div className={`aspect-[9/16] rounded-2xl overflow-hidden bg-black/50 border relative cursor-zoom-in group transition-all ${
                               res.status === 'generating' ? 'border-indigo-500/30' :
                               res.status === 'success' ? 'border-green-500/30' : 'border-red-500/30'
                           }`}>
                               {res.status === 'generating' ? (
                                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                       <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                       <div className="text-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse block">Generating...</span>
                                            <span className="text-[9px] text-slate-600">{res.sourceName}</span>
                                       </div>
                                   </div>
                               ) : res.status === 'failed' ? (
                                   <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-400">
                                       <AlertTriangle className="w-8 h-8" />
                                       <span className="text-xs font-bold">Failed</span>
                                       <span className="text-[9px] px-4 text-center">{res.error}</span>
                                   </div>
                               ) : (
                                   <>
                                       <img src={res.url} className="w-full h-full object-cover" />
                                       
                                       {/* Source Badge */}
                                       <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                                            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 max-w-[70%]">
                                                <span className="text-[8px] font-bold text-white block truncate">{res.sourceName}</span>
                                            </div>
                                            {res.isFallback && (
                                                <div className="bg-indigo-600/90 p-1.5 rounded-lg border border-white/10 shadow-xl" title="Fallback Applied">
                                                    <ShieldCheck className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                       </div>

                                       {/* Download Action Overlay */}
                                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(res.url, `SmartPose_${res.id}.png`);
                                                }}
                                                className="p-3 bg-white text-black rounded-full hover:scale-110 shadow-xl transition-transform"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                       </div>

                                       {/* CTR Score Overlay */}
                                       {res.qc && (
                                           <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10 flex items-center justify-between pointer-events-none">
                                               <div className="flex flex-col">
                                                   <span className="text-[8px] text-slate-400 uppercase font-bold">CTR Score</span>
                                                   <span className={`text-sm font-black ${res.qc.score >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{res.qc.score}</span>
                                               </div>
                                               <div className="text-[8px] text-slate-300 text-right">
                                                   <div className="font-bold">{res.qc.status}</div>
                                               </div>
                                           </div>
                                       )}
                                   </>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
           ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                   <Layers className="w-20 h-20 mb-4 text-slate-500" />
                   <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Select multiple sources<br/>to start batch engine</p>
               </div>
           )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setSelectedPreview(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10">
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-full max-h-[90vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
             <img src={selectedPreview} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
             <button 
                onClick={() => handleDownload(selectedPreview, `SmartPose_Download_${Date.now()}.png`)}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-xl transition-all"
             >
                <Download className="w-5 h-5" />
                High Quality Download
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartPoseReference;
