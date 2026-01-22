
import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Download, ImageIcon, RefreshCw, X, Maximize2, Monitor, Clipboard, Layers, Eye, CheckSquare, Square } from 'lucide-react';
import { generateDetailExtra } from '../services/geminiService';
import { Resolution, AspectRatio } from '../types';

const STYLE_PRESETS = [
  {
    id: 'single-flat',
    name: '단일 누끼컷',
    prompt: `[NanoBanana PRO MODE]
Analyze the uploaded product image carefully.
Create a clean flat cutout product image showing ONLY the main product itself.
The background must be pure white (#FFFFFF).
Maintain the exact colors, textures, materials, and silhouettes of the product.
No model, no mannequin, no shadows.
Professional e-commerce catalog look.`
  },
  {
    id: 'collage-detail',
    name: '디테일 콜라주',
    prompt: `[NanoBanana PRO MODE]
Create a sophisticated collage showing multiple close-up detail views of the product.
Focus on stitching, fabric texture, buttons, and unique design elements.
Maintain high color accuracy.
Arrange the views in a clean, modern grid or balanced composition.
High-end fashion editorial style.`
  },
  {
    id: 'lifestyle-context',
    name: '라이프스타일 배경',
    prompt: `[NanoBanana PRO MODE]
Place the product in a minimalist high-end lifestyle setting.
Soft natural shadows, professional studio lighting.
The background should be clean but have depth (e.g., stone, wood, or modern architecture).
Focus on the product as the center of attention.
Maintain realistic proportions and textures.`
  }
];

const ZoomImage = ({ src, onClick, alt }: { src: string, onClick?: () => void, alt?: string }) => {
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
      className="relative w-full h-full overflow-hidden cursor-zoom-in"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-contain transition-transform duration-300 ease-out"
        style={{
          transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
          transform: isHovered ? 'scale(2.2)' : 'scale(1)'
        }}
      />
    </div>
  );
};

const DetailExtra: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(STYLE_PRESETS[0].prompt);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].id);
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageCount, setImageCount] = useState<number>(1);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (!baseImage) setBaseImage(result);
            else if (!refImage) setRefImage(result);
            else setBaseImage(result);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, [baseImage, refImage]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleImageUpload = (type: 'base' | 'ref', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("파일 용량이 너무 큽니다. 10MB 이하의 이미지를 사용해주세요.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'base') setBaseImage(reader.result as string);
        else setRefImage(reader.result as string);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    const preset = STYLE_PRESETS.find(s => s.id === styleId);
    if (preset) setPrompt(preset.prompt);
  };

  const handleGenerate = async () => {
    if (!baseImage) return;
    setIsLoading(true);
    setResultImages([]);
    
    try {
      const tasks = Array.from({ length: imageCount }).map(() => 
        generateDetailExtra(baseImage, refImage, prompt, resolution, aspectRatio)
      );
      const results = await Promise.all(tasks);
      setResultImages(results);
    } catch (error) {
      console.error(error);
      alert("이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < resultImages.length; i++) {
      const link = document.createElement('a');
      link.href = resultImages[i];
      link.download = `detail_${i + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 text-indigo-400" />
              <h3 className="text-xl font-bold uppercase tracking-tight">Detail Extra</h3>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
              <Clipboard className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Ctrl+V 붙여넣기 활성</span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">상품 원본 사진 (필수)</label>
                <div 
                  onClick={() => document.getElementById('de-base-upload')?.click()}
                  className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                    baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                  }`}
                >
                  {baseImage ? (
                    <>
                      <img src={baseImage} className="w-full h-full object-contain" />
                      <button onClick={(e) => { e.stopPropagation(); setBaseImage(null); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500 transition-colors z-10"><X className="w-3 h-3 text-white" /></button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                      <span className="text-[9px] text-slate-500 font-bold uppercase">업로드 또는 붙여넣기</span>
                    </div>
                  )}
                  <input id="de-base-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('base', e)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">참고 디테일컷 (선택)</label>
                <div 
                  onClick={() => document.getElementById('de-ref-upload')?.click()}
                  className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
                    refImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                  }`}
                >
                  {refImage ? (
                    <>
                      <img src={refImage} className="w-full h-full object-contain" />
                      <button onClick={(e) => { e.stopPropagation(); setRefImage(null); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500 transition-colors z-10"><X className="w-3 h-3 text-white" /></button>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <ImageIcon className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                      <span className="text-[9px] text-slate-500 font-bold uppercase">업로드 또는 붙여넣기</span>
                    </div>
                  )}
                  <input id="de-ref-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload('ref', e)} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">스타일 프리셋</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      selectedStyle === style.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    {selectedStyle === style.id ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">프롬프트</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[11px] focus:border-indigo-400 outline-none transition-all resize-none leading-relaxed text-slate-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">해상도</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-[11px] focus:border-indigo-400 outline-none">
                  <option value="1K">1K</option><option value="2K">2K</option><option value="4K">4K</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">비율</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-[11px] focus:border-indigo-400 outline-none">
                  <option value="1:1">1:1</option><option value="9:16">9:16</option><option value="4:3">4:3</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">생성 수</label>
                <select value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-[11px] focus:border-indigo-400 outline-none">
                  <option value={1}>1</option><option value={2}>2</option><option value={4}>4</option>
                </select>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isLoading || !baseImage}
              className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 disabled:opacity-50 transition-all hover:scale-[1.01] flex items-center justify-center gap-3"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              디테일 컷 생성하기 ({imageCount}장)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col min-h-[500px]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Monitor className="w-6 h-6 text-indigo-400" />
            <h3 className="text-xl font-bold uppercase tracking-tight">Detail Results</h3>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">Zoom Enabled</span>
            {resultImages.length > 0 && !isLoading && (
              <button 
                onClick={handleDownloadAll}
                className="px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black flex items-center gap-2 uppercase tracking-widest transition-all"
              >
                <Download className="w-3 h-3" /> 일괄 저장
              </button>
            )}
          </div>
        </div>

        <div className={`flex-1 grid gap-4 ${resultImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-hidden relative`}>
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500 bg-slate-950/80 z-10">
              <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Processing Detailed View...</p>
            </div>
          ) : resultImages.length > 0 ? (
            resultImages.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-indigo-500 transition-all">
                <ZoomImage src={url} onClick={() => setSelectedImage(url)} />
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button onClick={() => setSelectedImage(url)} className="p-2 bg-indigo-600 rounded-lg text-white hover:scale-110 transition-transform"><Eye className="w-4 h-4" /></button>
                  <a href={url} download={`detail_${i}.png`} className="p-2 bg-slate-800 rounded-lg text-white hover:scale-110 transition-transform"><Download className="w-4 h-4" /></a>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-20 h-full">
              <Layers className="w-16 h-16 mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">결과물이 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10" onClick={() => setSelectedImage(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={selectedImage} className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default DetailExtra;
