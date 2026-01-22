
import React, { useState } from 'react';
import { Sparkles, Download, ImageIcon, RefreshCw, X, Layers, Loader2, CheckSquare, Square, Eye, Monitor, Trash2, User, Maximize2 } from 'lucide-react';
import { generatePoseChange, parseGeminiError } from '../services/geminiService';
import { Resolution, AspectRatio, Gender, ViewMode } from '../types';

interface PoseResult {
  id: string;
  url: string;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  poseLabel?: string;
  framingLabel?: string;
}

const POSE_PRESETS = [
  {
    id: 'walking',
    icon: '🚶',
    name: '걷는 모습 (기본)',
    prompt: 'Walking forward naturally, dynamic leg movement, showing the flow of the wide pants.'
  },
  {
    id: 'standing',
    icon: '🧍',
    name: '짝다리 (힙한 느낌)',
    prompt: 'Standing casually with weight on one leg, one hand in pocket, slight side angle.'
  },
  {
    id: 'sitting',
    icon: '🪑',
    name: '살짝 앉은 모습 (디테일)',
    prompt: 'Sitting on a high stool, one leg extended to show the pant length and texture.'
  },
  {
    id: 'backview',
    icon: '🏃',
    name: '뒷모습 (핏 확인)',
    prompt: 'Back view, walking away, highlighting the fit of the hips and leg line.'
  }
];

const FRAMING_PRESETS = {
  full: {
    name: '전신 샷',
    instruction: `**FRAMING:**
- **Full body shot (Head to Toe).**
- Ensure the ENTIRE figure is visible within the frame.
- Do NOT crop the head or the shoes.
- Leave some breathing room (negative space) above the head and below the feet.`
  },
  top: {
    name: '상반신 샷',
    instruction: `**FRAMING:**
- **Upper body shot (Waist Up).**
- Crop from the mid-thighs or waist upwards.
- Focus on the torso, chest, and face.
- Clear facial features (unless requested headless).
- Sharp focus on the upper garment details.`
  },
  bottom: {
    name: '하반신 샷',
    instruction: `**FRAMING:**
- **Lower body shot only.**
- **Crop from waist to shoes.**
- The head and torso should NOT be visible.
- Ensure the shoes are fully visible and grounded (do not cut off the feet).
- Center the pants in the frame.`
  }
};

const PROMPT_TEMPLATE = (desiredPose: string, framingInstruction: string) => `
**ROLE:**
You are an expert AI Fashion Photographer and Image Editor.
Your task is to generate a realistic fashion lookbook image based on the reference image provided.

**CORE TASK:**
1.  **Analyze the Reference:** detailed analysis of the mannequin/model's outfit in the input image. Pay extreme attention to the fabric texture (e.g., corduroy ridges), color, fit (wide/slim), and wrinkles.
2.  **Repose the Subject:** Generate a new image of a model wearing EXACTLY the same outfit, but in the new pose described below.
3.  **Preserve Identity:** The clothing items (especially the pants/trousers) must look identical to the original. Do NOT change the design, texture, or fit.

**TARGET POSE:**
> ${desiredPose}

${framingInstruction}

**BACKGROUND & LIGHTING:**
- Background: Clean, minimal professional studio background (Soft Grey or Off-White).
- Lighting: Soft, directional studio lighting that highlights the fabric texture. Natural shadows on the floor.
- No artifacts, no messy details.

**IMPORTANT CONSTRAINTS:**
- **Fabric Fidelity:** ensure the vertical ridges or textures are clearly visible.
- **Fit Consistency:** maintain the silhouette exactly as in the reference. Do not make them slim if they are wide.
- **Realistic Body:** The model should look like a real fashion model. Headless or cropped face is acceptable if focusing on fit.

**NEGATIVE PROMPT:**
cartoon, illustration, 3d render, distorted body, extra limbs, changed clothes, denim texture (if corduroy), different color pants, blur, low resolution.

STRICTLY MAINTAIN the exact fabric and color of the reference pants. Do not hallucinate new clothes.
`;

const PoseChange: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [selectedPoseIds, setSelectedPoseIds] = useState<string[]>(['walking']);
  const [framingMode, setFramingMode] = useState<ViewMode>('full');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [gender, setGender] = useState<Gender>('Female');

  const [results, setResults] = useState<PoseResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const togglePose = (id: string) => {
    setSelectedPoseIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
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
      alert("원본 이미지를 먼저 업로드해주세요.");
      return;
    }
    if (selectedPoseIds.length === 0) {
      alert("최소 하나 이상의 포즈를 선택해주세요.");
      return;
    }

    setIsGenerating(true);
    
    // 준비된 앵글/프레이밍 정보 가져오기
    const framingInfo = FRAMING_PRESETS[framingMode];

    // 결과 슬롯 미리 생성 (UI 반응성 향상)
    const newResults: PoseResult[] = selectedPoseIds.map((poseId) => {
      const pose = POSE_PRESETS.find(p => p.id === poseId);
      return {
        id: `${Date.now()}-${poseId}`,
        url: '',
        status: 'loading',
        poseLabel: pose?.name || '커스텀',
        framingLabel: framingInfo.name
      };
    });
    
    setResults(prev => [...newResults, ...prev]);

    // 병렬 생성 처리
    await Promise.all(selectedPoseIds.map(async (poseId, index) => {
      const targetResId = newResults[index].id;
      const poseData = POSE_PRESETS.find(p => p.id === poseId);
      const finalPrompt = PROMPT_TEMPLATE(poseData?.prompt || '', framingInfo.instruction);

      try {
        const url = await generatePoseChange(
          baseImage, 
          refImage, 
          finalPrompt, 
          resolution, 
          aspectRatio, 
          { faceMode: 'OFF', gender }
        );
        setResults(prev => prev.map(r => r.id === targetResId ? { ...r, url, status: 'success' } : r));
      } catch (err) {
        const parsed = parseGeminiError(err);
        setResults(prev => prev.map(r => r.id === targetResId ? { ...r, status: 'error', errorMessage: parsed.message } : r));
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
      link.download = `Pose_${res.poseLabel}_${res.framingLabel}.png`;
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
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* 제어 패널 */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-tight italic">전문가용 포즈 변경 엔진</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">의류 원본</label>
              <div 
                onClick={() => document.getElementById('pc-base')?.click()} 
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                  baseImage ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                }`}
              >
                {baseImage ? <img src={baseImage} className="w-full h-full object-contain p-4" /> : <ImageIcon className="w-8 h-8 opacity-10" />}
                <input id="pc-base" type="file" className="hidden" onChange={(e) => handleImageUpload('base', e)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">참고 가이드</label>
              <div 
                onClick={() => document.getElementById('pc-ref')?.click()} 
                className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                  refImage ? 'border-indigo-500 bg-indigo-500/5 shadow-inner' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
                }`}
              >
                {refImage ? <img src={refImage} className="w-full h-full object-contain p-4" /> : <Layers className="w-8 h-8 opacity-10" />}
                <input id="pc-ref" type="file" className="hidden" onChange={(e) => handleImageUpload('ref', e)} />
              </div>
            </div>
          </div>

          {/* 프레이밍 선택 */}
          <div className="space-y-3">
             <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block ml-1">프레이밍 선택</label>
             <div className="grid grid-cols-3 gap-2">
                {(['full', 'top', 'bottom'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFramingMode(mode)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      framingMode === mode 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                        : 'bg-black/40 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {mode === 'full' && <User className="w-5 h-5" />}
                    {mode === 'top' && <Maximize2 className="w-5 h-5" />}
                    {mode === 'bottom' && <Layers className="w-5 h-5" />}
                    <span className="text-[10px] font-bold">{FRAMING_PRESETS[mode].name}</span>
                  </button>
                ))}
             </div>
          </div>

          {/* 포즈 다중 선택 */}
          <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/5">
            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">포즈 다중 선택</label>
            <div className="grid grid-cols-1 gap-1.5">
               {POSE_PRESETS.map(pose => (
                 <button 
                  key={pose.id} 
                  onClick={() => togglePose(pose.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    selectedPoseIds.includes(pose.id) 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'
                  }`}
                 >
                   <div className="flex items-center gap-3">
                     <span className="text-lg">{pose.icon}</span>
                     <span className="text-[10px] font-bold uppercase tracking-widest">{pose.name}</span>
                   </div>
                   {selectedPoseIds.includes(pose.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </button>
               ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">품질 & 비율</label>
                <div className="flex gap-1">
                  <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold text-white outline-none">
                    <option value="1K">1K</option><option value="2K">2K</option><option value="4K">4K</option>
                  </select>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-bold text-white outline-none">
                    <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="4:3">4:3</option>
                  </select>
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">모델 성별</label>
                <div className="flex bg-black p-1 rounded-lg border border-white/10">
                   <button onClick={() => setGender('Male')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${gender === 'Male' ? 'bg-white text-black' : 'text-slate-500'}`}>남성</button>
                   <button onClick={() => setGender('Female')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${gender === 'Female' ? 'bg-white text-black' : 'text-slate-500'}`}>여성</button>
                </div>
             </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating || !baseImage || selectedPoseIds.length === 0} 
            className={`w-full py-5 rounded-2xl font-bold text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all relative overflow-hidden ${
              isGenerating ? 'bg-slate-800 text-indigo-400' : 'bg-white text-black hover:bg-indigo-50 active:scale-95'
            }`}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? '병렬 프로덕션 가동 중...' : '포즈 변경 프로덕션 시작'}
          </button>
        </div>
      </div>

      {/* 결과 갤러리 */}
      <div className="lg:col-span-7">
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] shadow-2xl flex flex-col min-h-[600px] max-h-[85vh] relative overflow-hidden">
           <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900/10 backdrop-blur-md pb-4 z-10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">생성된 화보 갤러리</h3>
              </div>
              <div className="flex items-center gap-3">
                {results.some(r => r.status === 'success') && (
                  <button onClick={handleDownloadAll} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-lg hover:bg-indigo-600/20 transition-all">
                    <Download className="w-3 h-3" /> 전체 일괄 저장
                  </button>
                )}
                {results.length > 0 && <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-full">{results.length} 유닛</span>}
              </div>
           </div>

           <div className={`flex-1 grid gap-6 ${results.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} overflow-y-auto pr-2 custom-scrollbar`}>
              {results.length > 0 ? results.map(res => (
                <div key={res.id} className="relative aspect-auto rounded-3xl overflow-hidden bg-black shadow-lg group animate-in zoom-in-95">
                   {res.status === 'loading' ? (
                     <div className="aspect-[9/16] flex flex-col items-center justify-center gap-4 bg-slate-950/80">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-indigo-500 animate-pulse uppercase italic text-center leading-tight">
                          {res.poseLabel}<br/>{res.framingLabel}<br/>생성 중
                        </p>
                     </div>
                   ) : res.status === 'error' ? (
                     <div className="aspect-[9/16] p-8 text-center flex flex-col items-center justify-center space-y-4 bg-red-500/5">
                        <p className="text-[10px] text-red-400 font-bold leading-relaxed">{res.errorMessage}</p>
                        <button onClick={() => removeResult(res.id)} className="text-[9px] font-bold uppercase text-slate-500 hover:text-white underline tracking-widest">삭제</button>
                     </div>
                   ) : (
                     <div className="relative group cursor-zoom-in" onClick={() => setSelectedPreviewImage(res.url)}>
                       <img src={res.url} className="w-full h-auto transition-transform duration-[1.2s] ease-out group-hover:scale-105" alt={res.poseLabel} />
                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-indigo-400 uppercase italic">{res.poseLabel} - {res.framingLabel}</p>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{resolution} • {aspectRatio}</span>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                             <button onClick={() => { const link = document.createElement('a'); link.href = res.url; link.download = `Pose_${res.poseLabel}.png`; link.click(); }} className="p-3 bg-white text-black rounded-full hover:scale-110 active:scale-90 transition-all shadow-xl">
                                <Download className="w-5 h-5" />
                             </button>
                             <button onClick={() => removeResult(res.id)} className="p-3 bg-slate-900 text-white rounded-full hover:bg-red-500 transition-all shadow-xl">
                                <Trash2 className="w-5 h-5" />
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
                <div className="col-span-full flex flex-col items-center justify-center h-[500px] opacity-10">
                   <Layers className="w-16 h-16 mb-4" />
                   <p className="font-bold uppercase tracking-widest text-[11px]">포즈를 선택하고 프로덕션을 가동하세요</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 이미지 미리보기 모달 */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300" onClick={() => setSelectedPreviewImage(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10" onClick={() => setSelectedPreviewImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img src={selectedPreviewImage} className="max-w-full max-h-[90vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300 rounded-2xl" onClick={(e) => e.stopPropagation()} />
            <div className="absolute bottom-[-60px] flex gap-4">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = selectedPreviewImage;
                  link.download = `Fitting_Pro_${Date.now()}.png`;
                  link.click();
                }} 
                className="px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl flex items-center gap-3 shadow-2xl hover:bg-indigo-500 transition-all uppercase text-xs tracking-widest"
               >
                 <Download className="w-5 h-5" /> 고화질 저장
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoseChange;
