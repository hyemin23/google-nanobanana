import React, { useState, useRef, useCallback } from 'react';
import { Image as ImageIcon, Sparkles, AlertCircle, Download, MonitorPlay, X, LayoutGrid, Layers, Square, Paperclip, User, UserSquare, UserCircle, Copy } from 'lucide-react';
import { generateImages } from '../services/geminiService';
import { Resolution, ViewMode } from '../types';

const ThumbnailGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [layoutMode, setLayoutMode] = useState<'single' | 'collage'>('single');
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [imageCount, setImageCount] = useState<number>(1);
  const [baseImages, setBaseImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: File[]) => {
    const validImages = files.filter(file => file.type.startsWith('image/'));
    setBaseImages(prev => {
      const combined = [...prev, ...validImages].slice(0, 5);
      setPreviewUrls(combined.map(file => URL.createObjectURL(file)));
      return combined;
    });
  }, []);

  const handleGenerate = async () => {
    if (baseImages.length === 0 || !prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await generateImages(prompt, baseImages, resolution, layoutMode, viewMode, imageCount);
      setGeneratedImages(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-8 shadow-2xl">
          <h2 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="w-5 h-5 text-indigo-400" /> 썸네일 설정</h2>
          
          <div>
            <label className="text-sm font-medium text-slate-400 mb-3 block">프레이밍</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setViewMode('full')} className={`py-3 rounded-xl border text-xs transition-all ${viewMode === 'full' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>전신</button>
              <button onClick={() => setViewMode('top')} className={`py-3 rounded-xl border text-xs transition-all ${viewMode === 'top' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>상의</button>
              <button onClick={() => setViewMode('bottom')} className={`py-3 rounded-xl border text-xs transition-all ${viewMode === 'bottom' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>하의</button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-400 mb-3 block">생성 개수</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setImageCount(n)} className={`py-2 rounded-xl border text-sm font-bold ${imageCount === n ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>{n}</button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400 block">프롬프트 & 이미지 (최대 5장)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="썸네일 컨셉을 입력하세요..."
              className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700">
                  <img src={url} className="w-full h-full object-cover" />
                  <button onClick={() => {
                    setBaseImages(prev => prev.filter((_, idx) => idx !== i));
                    setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
                  }} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {previewUrls.length < 5 && (
                <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 border border-dashed border-slate-700 rounded-lg flex items-center justify-center hover:border-indigo-500 transition-colors">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt || baseImages.length === 0}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}
          >
            {isLoading ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" /> : <Sparkles className="w-5 h-5" />}
            {isLoading ? '생성 중...' : '썸네일 생성하기'}
          </button>
          
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[600px] flex flex-col shadow-2xl">
          <h2 className="text-xl font-bold mb-6">결과 미리보기</h2>
          <div className={`flex-1 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 border-dashed ${generatedImages.length > 0 ? '' : 'text-slate-700'}`}>
            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full p-4">
                {generatedImages.map((url, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
                    <img src={url} className="w-full h-full object-contain aspect-square" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={url} download={`thumb-${i}.png`} className="p-3 bg-indigo-600 rounded-full hover:scale-110 transition-transform"><Download className="w-6 h-6" /></a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>설정을 마친 후 생성 버튼을 눌러주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThumbnailGenerator;