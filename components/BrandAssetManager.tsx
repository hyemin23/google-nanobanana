
import React from 'react';
import { useStore } from '../store';
import { Image, Upload, CheckCircle2, Circle } from 'lucide-react';

const BrandAssetManager: React.FC = () => {
  const { brandAssets, toggleBrandAsset, updateBrandAsset } = useStore();

  const handleFileUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBrandAsset(id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-500/20 p-2 rounded-xl">
          <Image className="w-5 h-5 text-indigo-400" />
        </div>
        <h3 className="font-bold text-lg">브랜드 고정 에셋</h3>
      </div>
      
      <p className="text-xs text-slate-500 leading-relaxed">
        상세페이지의 시작과 끝에 항상 고정되는 브랜드만의 에셋을 관리하세요. 
        사이즈 가이드, 세탁 방법, 배송 공지 등을 등록해두면 모든 프로젝트에 자동으로 적용됩니다.
      </p>

      <div className="space-y-3">
        {brandAssets.map((asset) => (
          <div 
            key={asset.id} 
            className={`p-4 rounded-2xl border transition-all ${
              asset.isEnabled ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-950 border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleBrandAsset(asset.id)}>
                  {asset.isEnabled ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-700" />
                  )}
                </button>
                <span className="text-sm font-bold text-slate-200">{asset.name}</span>
              </div>
              <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                업로드
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(asset.id, e)} />
              </label>
            </div>
            
            {asset.imageUrl ? (
              <div className="aspect-[16/5] bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                <img src={asset.imageUrl} className="w-full h-full object-cover" alt={asset.name} />
              </div>
            ) : (
              <div className="aspect-[16/5] bg-slate-900 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-600 italic">
                이미지가 등록되지 않았습니다
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandAssetManager;
