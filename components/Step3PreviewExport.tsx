import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { FileDown, ArrowLeft, Loader2, Ruler, Layout, Heart, Package, ShieldCheck, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

const Step3PreviewExport: React.FC = () => {
  const store = useStore();
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `[AI_DETAIL]_${store.name}_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllImages = async () => {
    const urls = store.lookbookImages.map(img => img.url).filter(url => !!url);
    for (let i = 0; i < urls.length; i++) {
      const link = document.createElement('a');
      link.href = urls[i];
      link.download = `lookbook_${i + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const sizeLabels = Object.entries(store.sizeData).filter(([_, v]) => !!v);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => store.setStep(2)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>이전 단계로</span>
        </button>
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-2xl hover:bg-indigo-500 transition-all disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
          상세페이지 통이미지 저장
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="bg-slate-900 p-10 rounded-[48px] border border-slate-800 shadow-3xl w-full max-w-[480px]">
             <div ref={exportRef} id="export-container" className="bg-white text-slate-950 w-full flex flex-col overflow-hidden">
                <div className="py-24 px-10 text-center bg-slate-50">
                   <span className="text-[10px] font-bold tracking-[0.5em] uppercase text-indigo-600 block mb-4">QUALITY ESSENTIAL</span>
                   <h1 className="text-3xl font-black tracking-tight mb-4 uppercase leading-tight">{store.name}</h1>
                   <div className="h-0.5 w-16 bg-slate-950 mx-auto mb-8" />
                   <div className="flex justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>{store.analysis?.category}</span>
                      <span className="opacity-20">|</span>
                      <span>{store.analysis?.fit} 핏</span>
                      <span className="opacity-20">|</span>
                      <span>{store.analysis?.materialType}</span>
                   </div>
                </div>
                <div className="flex flex-col gap-0 bg-white">
                   {store.lookbookImages.filter(img => img.url).map((img) => (
                      <img key={img.id} src={img.url} className="w-full h-auto" alt={img.pose} />
                   ))}
                </div>
                {store.sections.map((section, idx) => (
                   <div key={idx} className="py-24 px-10 text-center bg-white border-t border-slate-50">
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-[0.3em] block mb-4">{section.title}</span>
                      <h2 className="text-xl font-black mb-0 leading-tight whitespace-pre-wrap">{section.keyMessage}</h2>
                   </div>
                ))}
                <div className="py-24 px-10 bg-white border-t border-slate-100">
                   <div className="flex items-center gap-3 justify-center mb-16">
                      <Ruler className="w-4 h-4 text-slate-300" />
                      <h2 className="text-sm font-black uppercase tracking-[0.3em]">실측 사이즈 가이드</h2>
                   </div>
                   <div className="grid gap-12">
                      {store.techSketchUrl && (
                        <div className="bg-slate-50 p-12 rounded-[32px] border border-slate-100 flex items-center justify-center">
                           <img src={store.techSketchUrl} className="w-full max-w-[300px] h-auto mix-blend-multiply" />
                        </div>
                      )}
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
                         <table className="w-full text-center text-[11px]">
                            <thead>
                               <tr className="bg-slate-50">
                                  {sizeLabels.map(([k]) => (
                                     <th key={k} className="py-5 font-black border-b border-slate-100 uppercase text-slate-400 tracking-tighter">{k}</th>
                                  ))}
                               </tr>
                            </thead>
                            <tbody>
                               <tr>
                                  {sizeLabels.map(([k, v]) => (
                                     <th key={k} className="py-8 font-black text-slate-950 border-b border-slate-100 text-sm">{(v as any)}</th>
                                  ))}
                               </tr>
                            </tbody>
                         </table>
                         <div className="p-6 bg-slate-50/50">
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                               * 모든 실측은 단면(cm) 기준이며 측정 방식에 따라 1-3cm 오차가 있을 수 있습니다.<br/>
                               * 모델 피팅 시 사이즈 및 체형에 따른 개인차가 발생할 수 있습니다.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="py-20 px-10 text-center bg-slate-950 text-white">
                   <div className="flex items-center justify-center gap-3 mb-10">
                      <Package className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase">배송 및 신뢰</span>
                   </div>
                   <div className="space-y-4 text-[11px] text-slate-400 font-medium leading-relaxed">
                      <div className="flex items-center justify-center gap-2 text-white font-bold mb-4">
                        <ShieldCheck className="w-4 h-4 text-green-500" />
                        <span>품질 보증 및 당일 출고 원칙</span>
                      </div>
                      <p>오후 2시 이전 결제 완료 시 당일 출고됩니다 (영업일 기준).</p>
                      <p>단순 변심에 의한 교환/반품은 왕복 배송비가 발생합니다.</p>
                      <div className="pt-12 border-t border-slate-900 mt-10">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">© 2024 CREATOR PRO AI LABS. ALL RIGHTS RESERVED.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 sticky top-24">
              <div className="flex items-center gap-3">
                 <Layout className="w-5 h-5 text-indigo-400" />
                 <h4 className="font-bold">빌더 콘솔</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                현재 상세페이지는 모바일 최적화 가이드를 준수합니다. 
                9:16 비율의 룩북과 클린한 사이즈표는 구매 전환율을 높이는 핵심 요소입니다.
              </p>
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                 <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold tracking-widest">활성 섹션</span>
                    <span className="font-bold text-white">{store.sections.length + 2}개 섹션</span>
                 </div>
                 <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 uppercase font-bold tracking-widest">생성된 룩북</span>
                    <span className="font-bold text-indigo-400">{store.lookbookImages.filter(i => i.url).length} / 6</span>
                 </div>
              </div>
              <div className="pt-4 space-y-3">
                  <button 
                    onClick={handleDownloadAllImages}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    전체 이미지 일괄 다운로드
                  </button>
                  <button className="w-full py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-800 transition-colors">
                    기획 데이터 내보내기
                  </button>
              </div>
              <div className="pt-6 border-t border-slate-800">
                 <div className="flex items-center gap-3 mb-4">
                   <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
                   <span className="text-xs font-bold uppercase text-slate-300">수익 극대화 팁</span>
                 </div>
                 <p className="text-[11px] text-slate-500 leading-relaxed">
                    실측 불안은 이커머스 반품의 40% 이상을 차지합니다. 
                    AI 도식화와 명확한 수치 표기를 통해 고객의 불안을 제거하고 빠른 결정을 유도하세요.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Step3PreviewExport;