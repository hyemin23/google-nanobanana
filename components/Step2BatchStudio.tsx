import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { FACTORY_POSES, generateFactoryPose, generateTechSketch, planDetailPage } from '../services/geminiService';
import { Sparkles, Loader2, Image as ImageIcon, Layers, CheckCircle2, ChevronRight, LayoutList } from 'lucide-react';

const ZoomImage = ({ src, alt }: { src: string, alt?: string }) => {
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 ease-out"
        style={{
          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
          transform: isHovered ? 'scale(1.8)' : 'scale(1)'
        }}
      />
    </div>
  );
};

const Step2BatchStudio: React.FC = () => {
  const store = useStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const startBatchProcess = async () => {
    if (!store.mainImageUrl || !store.analysis) return;
    setIsGenerating(true);
    store.clearLookbook();

    try {
      const [sections, techSketch] = await Promise.all([
        planDetailPage(store.analysis, store.name),
        generateTechSketch(store.analysis.category, store.name)
      ]);
      
      store.setSections(sections);
      store.setProductInfo({ techSketchUrl: techSketch });

      const tasks = FACTORY_POSES.map(async (pose) => {
        store.addLookbookImage({ id: pose.id, url: '', pose: pose.name, isGenerating: true });
        try {
          const url = await generateFactoryPose(store.mainImageUrl!, pose, store.analysis!, store.resolution);
          store.updateLookbookImage(pose.id, { url, isGenerating: false });
        } catch (e) {
          console.error(e);
          store.updateLookbookImage(pose.id, { isGenerating: false });
        }
      });
      await Promise.all(tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-3">
            <Layers className="w-6 h-6 text-indigo-400" />
            AI 룩북 팩토리
          </h3>
          <p className="text-slate-500 mt-1">버티컬 커머스 최적화 6종 포즈와 전략 섹션을 일괄 생성합니다.</p>
        </div>
        <button 
          onClick={startBatchProcess}
          disabled={isGenerating}
          className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 flex items-center gap-3 hover:bg-indigo-500 transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          팩토리 가동 (일괄 생성)
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Fixed syntax error: added parentheses around 'pose' parameter in the map callback */}
        {FACTORY_POSES.map((pose) => {
          const img = store.lookbookImages.find(i => i.id === pose.id);
          return (
            <div key={pose.id} className="group relative aspect-[9/16] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 transition-all">
              {img?.isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase animate-pulse tracking-widest">생성 중</span>
                </div>
              ) : img?.url ? (
                <ZoomImage src={img.url} alt={pose.name} />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800">
                  <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">대기</span>
                </div>
              )}
              <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 z-10">
                <span className="text-[9px] font-bold text-white uppercase tracking-tighter">{pose.name}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
           <h4 className="font-bold flex items-center gap-2 text-slate-300 uppercase tracking-widest text-xs">도식화 스케치</h4>
           <div className="aspect-square bg-white p-6 rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center overflow-hidden">
              {store.techSketchUrl ? (
                <ZoomImage src={store.techSketchUrl} />
              ) : (
                <ImageIcon className="w-10 h-10 text-slate-200" />
              )}
           </div>
           <p className="text-[11px] text-slate-500 leading-relaxed">
             제품의 실루엣을 가장 객관적으로 보여주는 도식화입니다. 사이즈 정보와 결합되어 상세페이지 하단에 배치됩니다.
           </p>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
           <h4 className="font-bold flex items-center gap-2 text-slate-300 uppercase tracking-widest text-xs">기획 가이드</h4>
           <div className="space-y-3">
              {store.sections.length > 0 ? (
                store.sections.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold flex items-center justify-center border border-indigo-500/20">{idx+1}</span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{s.title}</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.keyMessage}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-700 opacity-30">
                  <LayoutList className="w-10 h-10 mb-2" />
                  <p className="text-xs font-bold">기획 생성 대기 중</p>
                </div>
              )}
           </div>

           {store.sections.length > 0 && store.lookbookImages.some(img => img.url) && (
              <button 
                onClick={() => store.setStep(3)}
                className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                최종 빌더로 이동
                <ChevronRight className="w-4 h-4" />
              </button>
           )}
        </div>
      </div>
    </div>
  );
};

export default Step2BatchStudio;