
import React, { useState, useRef } from 'react';
// Added missing Image as ImageIcon import
import { Sparkles, FileText, ShoppingBag, Plus, X, ArrowRight, Save, Download, RefreshCw, AlertCircle, Layout, ChevronRight, Check, Image as ImageIcon } from 'lucide-react';
import { planDetailPage, generateSectionImage } from '../services/geminiService';
import { ProductInfo, DetailImageSegment, PageLength, Resolution } from '../types';

const DetailPageBuilder: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Resolution>('2K');
  const [baseImages, setBaseImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [length, setLength] = useState<PageLength>('7');
  
  const [product, setProduct] = useState<ProductInfo>({
    name: '',
    originalPrice: '',
    salePrice: '',
    category: '상의',
    merchantInfo: '',
    features: '',
    targetGender: ['남성', '여성'],
    targetAge: ['20대', '30대'],
  });

  const [segments, setSegments] = useState<DetailImageSegment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleFiles = (files: File[]) => {
    const valid = files.filter(f => f.type.startsWith('image/'));
    const combined = [...baseImages, ...valid].slice(0, 5);
    setBaseImages(combined);
    setPreviewUrls(combined.map(f => URL.createObjectURL(f)));
  };

  const startPlanning = async () => {
    if (!product.name || !product.features || baseImages.length === 0) {
      setError("상품명, 특징, 이미지는 필수 항목입니다.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await planDetailPage(product, length);
      setSegments(plan);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAllImages = async () => {
    setStep(3);
    setSegments(prev => prev.map(s => ({ ...s, isGenerating: true })));
    
    // Process segments sequentially to maintain quality and avoid limits
    for (let i = 0; i < segments.length; i++) {
      try {
        const url = await generateSectionImage(segments[i], baseImages, resolution);
        setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, imageUrl: url, isGenerating: false } : s));
      } catch (err) {
        setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, isGenerating: false } : s));
      }
    }
  };

  const generateSingleSegment = async (index: number) => {
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, isGenerating: true } : s));
    try {
      const url = await generateSectionImage(segments[index], baseImages, resolution);
      setSegments(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: url, isGenerating: false } : s));
    } catch (err) {
      setSegments(prev => prev.map((s, i) => i === index ? { ...s, isGenerating: false } : s));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-4 max-w-xl mx-auto">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 ${step >= s ? 'text-indigo-400' : 'text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${step >= s ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800'}`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className="text-xs font-bold hidden md:inline">{s === 1 ? '정보 입력' : s === 2 ? '기획 확인' : '이미지 생성'}</span>
            </div>
            {s < 3 && <div className={`h-0.5 w-12 rounded-full ${step > s ? 'bg-indigo-500' : 'bg-slate-800'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-6 h-6 text-indigo-400" />
              <h3 className="text-xl font-bold">상품 기본 정보</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold ml-1">상품명</label>
                <input name="name" value={product.name} onChange={handleProductChange} placeholder="예: 시그니처 린넨 셔츠" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold ml-1">카테고리</label>
                <select name="category" value={product.category} onChange={handleProductChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none">
                  <option>상의</option><option>아우터</option><option>하의</option><option>잡화/슈즈</option><option>기타</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold ml-1">원가 (KRW)</label>
                <input name="originalPrice" value={product.originalPrice} onChange={handleProductChange} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-bold ml-1">판매가 (KRW)</label>
                <input name="salePrice" value={product.salePrice} onChange={handleProductChange} placeholder="0" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-500 font-bold ml-1">핵심 특징 & 셀링포인트 (USP)</label>
              <textarea name="features" value={product.features} onChange={handleProductChange} placeholder="통기성이 우수한 린넨 소재, 링클 프리 가공..." className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
               <span className="text-sm font-bold text-slate-400">상세페이지 길이</span>
               <div className="flex gap-1">
                 {['5', '7', '9', 'auto'].map(l => (
                   <button key={l} onClick={() => setLength(l as any)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${length === l ? 'bg-indigo-600' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}>
                     {l === 'auto' ? 'AI 추천' : `${l}장`}
                   </button>
                 ))}
               </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Layout className="w-6 h-6 text-indigo-400" />
                <h3 className="text-xl font-bold">제품 사진 업로드</h3>
              </div>
              <p className="text-sm text-slate-500">업로드하신 사진을 AI가 학습하여 실제 제품과 유사한 생성을 진행합니다. (최대 5장)</p>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer relative overflow-hidden"
              >
                <Plus className="w-10 h-10 text-slate-700 group-hover:text-indigo-400 transition-colors mb-4" />
                <span className="text-sm text-slate-500 group-hover:text-slate-300 font-medium">사진을 드래그하거나 클릭하여 추가</span>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))} />
              </div>

              <div className="grid grid-cols-5 gap-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group/img">
                    <img src={url} className="w-full h-full object-cover" />
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setBaseImages(prev => prev.filter((_, idx) => idx !== i));
                      setPreviewUrls(prev => prev.filter((_, idx) => idx !== i));
                    }} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-500/30 rounded-3xl p-6 flex items-center justify-between">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Sparkles className="w-6 h-6" /></div>
                <div>
                  <h4 className="font-bold text-indigo-200">기획 시작하기</h4>
                  <p className="text-xs text-indigo-400/80">AI가 상품 정보를 분석하여 판매 전략을 세웁니다.</p>
                </div>
              </div>
              <button 
                onClick={startPlanning}
                disabled={loading}
                className="bg-white text-indigo-950 h-12 px-6 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                {loading ? <div className="animate-spin w-4 h-4 border-2 border-indigo-950 border-t-transparent rounded-full" /> : <ArrowRight className="w-4 h-4" />}
                다음으로
              </button>
            </div>
            
            {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in zoom-in-95"><AlertCircle className="w-5 h-5 flex-shrink-0" />{error}</div>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">상세페이지 기획안</h3>
              <p className="text-slate-500 mt-1">각 섹션의 논리 구조와 카피를 확인하고 수정할 수 있습니다.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-5 py-3 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors text-sm font-bold">뒤로가기</button>
              <button onClick={generateAllImages} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 flex items-center gap-2"><Sparkles className="w-4 h-4" />일괄 이미지 생성</button>
            </div>
          </div>

          <div className="grid gap-4">
            {segments.map((s, i) => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/50 transition-colors group">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">#0{i+1}</span>
                      <h4 className="font-bold text-lg">{s.title}</h4>
                      <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">{s.logicalSection}</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 font-bold ml-1 uppercase">Key Copy (한글 전용)</label>
                      <input 
                        value={s.keyMessage} 
                        onChange={(e) => setSegments(prev => prev.map(seg => seg.id === s.id ? { ...seg, keyMessage: e.target.value } : seg))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none font-medium" 
                      />
                    </div>
                  </div>
                  <div className="md:w-1/3 bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Visual Description (AI Prompt)</label>
                    <textarea 
                      value={s.visualPrompt} 
                      onChange={(e) => setSegments(prev => prev.map(seg => seg.id === s.id ? { ...seg, visualPrompt: e.target.value } : seg))}
                      className="w-full h-24 bg-transparent border-none p-0 text-xs text-slate-400 focus:ring-0 outline-none resize-none leading-relaxed" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold">생성된 상세페이지</h3>
              <p className="text-slate-500 mt-1">9:16 세로형 통이미지 미리보기입니다.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-5 py-3 rounded-xl border border-slate-800 text-slate-400 text-sm font-bold">기획 수정</button>
              <div className="h-10 w-[1px] bg-slate-800 mx-2" />
              <button className="px-6 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center gap-2 hover:bg-slate-700 transition-colors"><Save className="w-4 h-4" />임시 저장</button>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-10">
            {/* Scrollable View Area */}
            <div className="lg:col-span-8 flex flex-col gap-0 items-center bg-slate-900 p-10 rounded-[40px] border border-slate-800 shadow-3xl max-h-[1200px] overflow-y-auto scrollbar-hide">
              {segments.map((s, i) => (
                <div key={s.id} className="w-full max-w-md relative group">
                  <div className="aspect-[9/16] bg-slate-950 border-x border-slate-800/30 flex items-center justify-center overflow-hidden">
                    {s.isGenerating ? (
                      <div className="flex flex-col items-center gap-4 text-slate-600">
                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold animate-pulse">이미지 생성 중...</span>
                      </div>
                    ) : s.imageUrl ? (
                      <img src={s.imageUrl} className="w-full h-full object-cover animate-in zoom-in-95 duration-700" alt={s.title} />
                    ) : (
                      <div className="text-slate-800 flex flex-col items-center gap-2">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-xs">대기 중</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Action Overlay */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generateSingleSegment(i)} className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-indigo-600 transition-all text-white shadow-xl"><RefreshCw className="w-4 h-4" /></button>
                    {s.imageUrl && <a href={s.imageUrl} download={`segment-${i+1}.png`} className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-slate-700 transition-all text-white shadow-xl"><Download className="w-4 h-4" /></a>}
                  </div>
                  
                  {/* Segment Label */}
                  <div className="absolute top-4 left-4 pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] font-bold text-white/80">{i+1}번 섹션</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Stats & Controls */}
            <div className="lg:col-span-4 space-y-6 sticky top-24 h-fit">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <h4 className="font-bold text-slate-200">내보내기 옵션</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">생성 완료율</span>
                    <span className="font-bold text-indigo-400">{Math.round((segments.filter(s => !!s.imageUrl).length / segments.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(segments.filter(s => !!s.imageUrl).length / segments.length) * 100}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <button className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3">
                    <Download className="w-5 h-5" />
                    전체 이미지 일괄 다운로드
                  </button>
                  <button className="w-full py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold text-sm hover:bg-slate-800 transition-colors">
                    상세페이지 통이미지로 합치기
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">주의사항</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  생성된 이미지는 AI가 렌더링한 가상 이미지이므로 실제 제품의 디테일과 다를 수 있습니다. 상업적 이용 시 반드시 최종 검수를 진행해 주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DetailPageBuilder;
