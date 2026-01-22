
import React from 'react';
import { useStore } from '../store';
import { Download, LayoutList, ChevronUp, ChevronDown, Check } from 'lucide-react';

const LayoutBuilder: React.FC = () => {
  const { brandName, lookbookImages, brandAssets } = useStore();

  const enabledAssets = brandAssets.filter(a => a.isEnabled && a.imageUrl);
  const headers = enabledAssets.filter(a => a.type === 'header');
  const footers = enabledAssets.filter(a => a.type !== 'header');

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">{brandName} 상세페이지 빌더</h3>
          <p className="text-slate-500 text-sm mt-1">버티컬 커머스 최적화 레이아웃 (세로형 통이미지)</p>
        </div>
        <button className="bg-white text-slate-950 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all shadow-xl shadow-white/10">
          <Download className="w-4 h-4" />
          통이미지로 저장
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Real-time Preview Area */}
        <div className="lg:col-span-8 flex flex-col items-center bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-3xl">
          <div className="w-full max-w-[400px] bg-white text-black min-h-[1000px] flex flex-col shadow-2xl rounded-sm overflow-hidden">
            
            {/* 1. Brand Header Section */}
            {headers.map(asset => (
              <img key={asset.id} src={asset.imageUrl} className="w-full h-auto" />
            ))}
            
            {!headers.length && (
              <div className="py-10 flex flex-col items-center justify-center bg-slate-50 border-b border-slate-100">
                <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">Brand Intro Section</span>
              </div>
            )}

            {/* 2. Main Lookbook Section */}
            <div className="flex flex-col gap-0">
              {lookbookImages.filter(img => !img.isGenerating && img.url).map((img, i) => (
                <img key={img.id} src={img.url} className="w-full h-auto" />
              ))}
              {lookbookImages.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center bg-white border-b border-slate-100">
                  <LayoutList className="w-10 h-10 text-slate-100 mb-4" />
                  <span className="text-xs font-bold text-slate-200">LOOKBOOK SLOTS EMPTY</span>
                </div>
              )}
            </div>

            {/* 3. Footer Sections (Size, Notice, etc) */}
            {footers.map(asset => (
              <img key={asset.id} src={asset.imageUrl} className="w-full h-auto" />
            ))}
          </div>
        </div>

        {/* Builder Sidebar / Sidebar Controls */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
             <h4 className="font-bold mb-4 flex items-center gap-2">
               <Check className="w-4 h-4 text-indigo-400" />
               활성 섹션 관리
             </h4>
             <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">브랜드 인트로</span>
                  <span className={`text-[8px] font-bold px-2 py-1 rounded-md ${headers.length ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                    {headers.length ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">메인 룩북 ({lookbookImages.length})</span>
                  <div className="flex gap-1">
                    <button className="p-1 hover:text-indigo-400 transition-colors"><ChevronUp className="w-3 h-3" /></button>
                    <button className="p-1 hover:text-indigo-400 transition-colors"><ChevronDown className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400">공지/가이드 ({footers.length})</span>
                  <span className={`text-[8px] font-bold px-2 py-1 rounded-md ${footers.length ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                    {footers.length ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
             </div>
           </div>

           <div className="p-6 bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-500/20 rounded-3xl">
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">Vertical Tips</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                지그재그와 에이블리 유저들은 첫 3초 안에 스크롤 여부를 결정합니다. **브랜드 인트로**에는 옷의 감성을 가장 잘 보여주는 AI 룩북 컷을 배치하고, 하단에는 **사이즈 가이드**를 필수로 포함하여 반품률을 낮추세요.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutBuilder;
