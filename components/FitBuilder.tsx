
import React, { useState } from 'react';
import { Layers, RefreshCw, Zap, PlusSquare, ImagePlus, Scissors, Palette, Shirt, Activity, RefreshCcw } from 'lucide-react';
import PoseChange from './PoseChange';
import DetailExtra from './DetailExtra';
import FittingVariation from './FittingVariation';
import PartialEdit from './PartialEdit';
import GarmentColorChange from './GarmentColorChange';
import TopDesignReplacement from './TopDesignReplacement';
import CommercialPose from './CommercialPose';
import SmartPoseReference from './SmartPoseReference';
import { FitSubMode } from '../types';

const FitBuilder: React.FC = () => {
  const [subMode, setSubMode] = useState<FitSubMode>('commercial-pose');

  const modes = [
    { id: 'commercial-pose', name: 'CTR 포즈 & 스코어링', icon: <Activity className="w-4 h-4" />, desc: '매출 최적화 포즈' },
    { id: 'smart-pose-ref', name: '스마트 포즈 레퍼런스', icon: <RefreshCcw className="w-4 h-4" />, desc: '안전 보정 & Fallback' },
    { id: 'fitting-variation', name: '피팅 엔진', icon: <ImagePlus className="w-4 h-4" />, desc: '포즈/앵글 수정' },
    { id: 'top-design-replace', name: '상의 디자인 교체', icon: <Shirt className="w-4 h-4" />, desc: '디자인 스왑' },
    { id: 'partial-edit', name: '부분 편집', icon: <Scissors className="w-4 h-4" />, desc: '상의/하의 개별 교체' },
    { id: 'paint-garment-color', name: '의류 색상 변경', icon: <Palette className="w-4 h-4" />, desc: '색상 SKU 확장' },
    { id: 'pose-change', name: '동작 변경', icon: <RefreshCw className="w-4 h-4" />, desc: '포즈 전환' },
    { id: 'detail-extra', name: '디테일 생성', icon: <PlusSquare className="w-4 h-4" />, desc: '근접 컷' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-full mx-auto animate-in fade-in duration-700">
      
      {/* 서브 네비게이션 */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
           <h2 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">FIT <span className="text-indigo-500">CHANGER</span></h2>
           <p className="text-slate-500 font-bold tracking-widest uppercase text-[9px]">정밀 편집 및 렌더링 엔진</p>
        </div>
        
        <div className="flex flex-wrap gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-xl">
          {modes.map((mode) => (
            <button 
              key={mode.id}
              onClick={() => setSubMode(mode.id as FitSubMode)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2.5 transition-all ${
                subMode === mode.id 
                  ? 'bg-white text-black shadow-md scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {mode.icon}
              {mode.name}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {subMode === 'commercial-pose' && <CommercialPose />}
          {subMode === 'smart-pose-ref' && <SmartPoseReference />}
          {subMode === 'pose-change' && <PoseChange />}
          {subMode === 'fitting-variation' && <FittingVariation />}
          {subMode === 'detail-extra' && <DetailExtra />}
          {subMode === 'partial-edit' && <PartialEdit />}
          {subMode === 'paint-garment-color' && <GarmentColorChange />}
          {subMode === 'top-design-replace' && <TopDesignReplacement />}
      </div>

      {/* 하단 정보 바 */}
      <div className="grid md:grid-cols-3 gap-3 pt-2">
        <div className="p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/10 flex items-center gap-3">
           <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0" />
           <p className="text-[9px] text-slate-500 leading-relaxed font-bold">포즈 변경 시 원단의 질감을 유지합니다.</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
           <RefreshCw className="w-4 h-4 text-slate-400 flex-shrink-0" />
           <p className="text-[9px] text-slate-500 leading-relaxed font-bold">다양한 앵글의 컷을 동시에 생성합니다.</p>
        </div>
        <div className="p-4 rounded-xl bg-indigo-600/5 border border-indigo-500/10 flex items-center gap-3">
           <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
           <p className="text-[9px] text-slate-500 leading-relaxed font-bold">디테일 컷으로 제품의 특징을 강조하세요.</p>
        </div>
      </div>
    </div>
  );
};

export default FitBuilder;
