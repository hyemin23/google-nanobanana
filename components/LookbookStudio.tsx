import React, { useState } from 'react';
import { useStore } from '../store';
import { generateLookbookImage } from '../services/geminiService';
import { Sparkles, Trash2, LayoutGrid, Maximize2, Loader2, Plus } from 'lucide-react';

const LookbookStudio: React.FC = () => {
  const { lookbookImages, addLookbookImage, removeLookbookImage, updateLookbookImage, analysis } = useStore();
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [baseImage, setBaseImage] = useState<string | null>(null);

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const createLookbookSet = async () => {
    if (!baseImage || !description) return;
    setIsGenerating(true);
    
    const id = Math.random().toString(36).substring(7);
    addLookbookImage({ id, url: '', pose: '커스텀 스튜디오 포즈', isGenerating: true });

    try {
      const base64Data = baseImage.split(',')[1] || baseImage;
      const url = await generateLookbookImage(base64Data, description, analysis || undefined, '1K');
      updateLookbookImage(id, { url, isGenerating: false });
    } catch (error) {
      console.error(error);
      removeLookbookImage(id);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 제어 패널 */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              AI 룩북 스튜디오
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-500 font-bold ml-1 uppercase tracking-wider">의류 정보 입력 (컬러/핏/소재)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 루즈한 핏의 스카이 블루 린넨 셔츠, 편안한 실루엣"
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none resize-none transition-colors"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 relative group">
                  <div className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                    baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                  }`}>
                    {baseImage ? (
                      <img src={baseImage} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Plus className="w-8 h-8 text-slate-700 mb-2" />
                        <span className="text-[10px] text-slate-600 font-bold text-center">누끼 또는 바닥 컷 업로드</span>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleBaseImageUpload} />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <button 
                    onClick={createLookbookSet}
                    disabled={isGenerating || !baseImage || !description}
                    className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                    룩북 이미지 생성
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-6 border border-slate-800/50 flex flex-col justify-center">
             <div className="flex items-center gap-2 text-indigo-400 mb-2">
               <Maximize2 className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-widest">포커스 전략</span>
             </div>
             <p className="text-xs text-slate-500 leading-relaxed mb-4">
               AI 스튜디오는 옷의 퀄리티에 집중하기 위해 얼굴을 제외한 '넥-다운(Neck-down)' 크롭 스타일을 기본으로 합니다. 이는 버티컬 커머스에서 높은 클릭률과 전환율을 기록하는 검증된 연출 방식입니다.
             </p>
             <div className="grid grid-cols-2 gap-2">
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                 <span className="text-[10px] text-slate-500 font-bold block mb-1">세트 A</span>
                 <span className="text-xs text-white">전신 룩북 (9:16)</span>
               </div>
               <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                 <span className="text-[10px] text-slate-500 font-bold block mb-1">세트 B</span>
                 <span className="text-xs text-white">디테일 컷 (1:1)</span>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* 결과 갤러리 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {lookbookImages.map((img) => (
          <div key={img.id} className="group relative aspect-[9/16] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all">
            {img.isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-[10px] text-slate-600 font-bold animate-pulse uppercase">AI 생성 중...</span>
              </div>
            ) : (
              <>
                <img src={img.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => removeLookbookImage(img.id)} className="p-2 bg-red-500 rounded-xl hover:scale-110 transition-transform">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </>
            )}
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[8px] font-bold text-white uppercase tracking-wider">
                패션 룩북
              </span>
            </div>
          </div>
        ))}
        
        {lookbookImages.length === 0 && !isGenerating && (
          <div className="col-span-full py-20 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600">
            <LayoutGrid className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm font-medium">생성된 이미지가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LookbookStudio;