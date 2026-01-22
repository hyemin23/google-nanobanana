
import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Loader2, Download, Trophy, AlertTriangle, Eye, Star, Activity, User, X, CheckCircle, ShieldCheck, EyeOff } from 'lucide-react';
import { generateCommercialPose, analyzePoseQuality, parseGeminiError } from '../services/geminiService';
import { CommercialPoseResult, Resolution, AspectRatio, QCStatus } from '../types';

const CommercialPose: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<CommercialPoseResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [variationCount, setVariationCount] = useState<number>(4);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processGeneration = async () => {
    if (!baseImage) return;
    setIsGenerating(true);
    setError(null);

    // Initial placeholder slots
    const newBatch: CommercialPoseResult[] = Array.from({ length: variationCount }).map(() => ({
      id: Math.random().toString(36).substr(2, 9),
      url: '',
      qc: null,
      status: 'generating'
    }));
    setResults(newBatch);

    // Parallel Generation
    await Promise.all(newBatch.map(async (item) => {
      try {
        // Phase 1: Generation
        const url = await generateCommercialPose(baseImage, prompt);
        
        setResults(prev => prev.map(r => r.id === item.id ? { ...r, url, status: 'analyzing' } : r));

        // Phase 2: PoseQCGuard Analysis
        const qcAnalysis = await analyzePoseQuality(url);
        
        setResults(prev => prev.map(r => r.id === item.id ? { ...r, qc: qcAnalysis, status: 'success' } : r));

      } catch (err) {
        const parsed = parseGeminiError(err);
        setResults(prev => prev.map(r => r.id === item.id ? { ...r, status: 'failed', error: parsed.message } : r));
      }
    }));

    setIsGenerating(false);
  };

  const getStatusColor = (status: QCStatus) => {
    switch(status) {
      case 'RECOMMENDED': return 'text-green-400 border-green-500/50 bg-green-500/10';
      case 'USABLE': return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
      case 'NOT_RECOMMENDED': return 'text-red-400 border-red-500/50 bg-red-500/10';
      default: return 'text-slate-400 border-slate-500/50';
    }
  };

  // Helper to count results
  const validCount = results.filter(r => r.status === 'success' && r.qc?.status !== 'NOT_RECOMMENDED').length;
  const failCount = results.filter(r => r.status === 'failed' || (r.status === 'success' && r.qc?.status === 'NOT_RECOMMENDED')).length;

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-700">
      {/* Control Panel */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-white uppercase tracking-tight">PoseQCGuard™</h3>
               <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-0.5">품질 검수 & 자동 선별</p>
             </div>
          </div>

          <div 
            onClick={() => document.getElementById('cp-upload')?.click()}
            className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center ${
              baseImage ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-black/40'
            }`}
          >
            {baseImage ? (
              <img src={baseImage} className="w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <span className="text-[10px] text-slate-500 font-bold uppercase">모델 원본 업로드</span>
              </div>
            )}
            <input id="cp-upload" type="file" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">생성 컷 수</label>
             <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                {[2, 4].map(num => (
                  <button 
                    key={num}
                    onClick={() => setVariationCount(num)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${variationCount === num ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
                  >
                    {num}장 병렬 생성
                  </button>
                ))}
             </div>
          </div>

          {/* Stats & Circuit Breaker Info */}
          {results.length > 0 && !isGenerating && (
             <div className="p-4 bg-slate-950 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-500 uppercase">총 요청</span>
                   <span className="text-white">{results.length}장</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-500 uppercase">유효 컷 (과금)</span>
                   <span className="text-green-400">{validCount}장</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="text-slate-500 uppercase">자동 폐기</span>
                   <span className="text-red-400">{failCount}장</span>
                </div>
                {failCount > 0 && (
                   <div className="pt-2 border-t border-white/5">
                      <p className="text-[9px] text-slate-500 leading-tight">
                         * 기준 미달 컷은 자동으로 Hidden 처리되었습니다.<br/>
                         * 청구서에는 유효 컷만 반영됩니다.
                      </p>
                   </div>
                )}
             </div>
          )}

          <button 
            onClick={processGeneration}
            disabled={isGenerating || !baseImage}
            className={`w-full py-5 rounded-2xl font-bold text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all ${
              isGenerating ? 'bg-slate-800 text-indigo-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/20'
            }`}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isGenerating ? 'AI Scoring & Generating...' : '포즈 생성 및 검수 시작'}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="lg:col-span-8">
        <div className="space-y-6">
           {/* Active Results */}
           <div className="grid grid-cols-2 gap-6">
              {results.filter(r => r.status === 'generating' || r.status === 'analyzing' || (r.qc?.status !== 'NOT_RECOMMENDED' && r.status === 'success')).map((res) => (
                <ResultCard key={res.id} result={res} onPreview={setSelectedPreview} />
              ))}
           </div>

           {/* Hidden/Failed Results Toggle */}
           {failCount > 0 && (
              <div className="pt-6 border-t border-white/5">
                 <button 
                    onClick={() => setShowHidden(!showHidden)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white transition-colors mb-4"
                 >
                    {showHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showHidden ? '기준 미달 컷 숨기기' : `품질 기준 미달 컷 보기 (${failCount})`}
                 </button>
                 
                 {showHidden && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-70">
                       {results.filter(r => r.status === 'failed' || (r.status === 'success' && r.qc?.status === 'NOT_RECOMMENDED')).map((res) => (
                          <ResultCard key={res.id} result={res} onPreview={setSelectedPreview} isHidden={true} />
                       ))}
                    </div>
                 )}
              </div>
           )}
           
           {results.length === 0 && (
              <div className="h-[400px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600">
                 <User className="w-16 h-16 mb-4 opacity-20" />
                 <p className="text-xs font-bold uppercase tracking-widest opacity-50">Generate to see results</p>
              </div>
           )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setSelectedPreview(null)}>
          <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10">
            <X className="w-8 h-8" />
          </button>
          <img src={selectedPreview} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

const ResultCard: React.FC<{ result: CommercialPoseResult; onPreview: (url: string) => void; isHidden?: boolean }> = ({ result, onPreview, isHidden = false }) => {
   const qc = result.qc;
   
   return (
      <div className={`relative bg-slate-900 border rounded-3xl overflow-hidden group transition-all ${
         qc?.status === 'RECOMMENDED' ? 'border-green-500/50 shadow-2xl shadow-green-500/10 scale-[1.02]' : 
         isHidden ? 'border-red-500/20 grayscale hover:grayscale-0' : 'border-white/5 hover:border-white/20'
      }`}>
         {/* Image Area */}
         <div className="aspect-[9/16] relative bg-black/40 cursor-zoom-in" onClick={() => result.url && onPreview(result.url)}>
            {result.status === 'generating' && (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Generating...</span>
               </div>
            )}
            {result.status === 'analyzing' && (
               <>
                  <img src={result.url} className="w-full h-full object-cover opacity-50 blur-sm" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                     <Activity className="w-8 h-8 text-yellow-400 animate-pulse" />
                     <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">QC Inspection...</span>
                  </div>
               </>
            )}
            {(result.status === 'success' || result.status === 'failed') && result.url && (
               <img src={result.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            )}
            
            {/* Status Badge */}
            {result.status === 'success' && qc && (
               <div className={`absolute top-4 left-4 px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5 z-10 ${
                  qc.status === 'RECOMMENDED' ? 'bg-green-500 text-black' : 
                  qc.status === 'NOT_RECOMMENDED' ? 'bg-red-500 text-white' : 'bg-blue-500/80 text-white'
               }`}>
                  {qc.status === 'RECOMMENDED' && <Trophy className="w-3 h-3" />}
                  {qc.status === 'NOT_RECOMMENDED' && <AlertTriangle className="w-3 h-3" />}
                  {qc.status}
               </div>
            )}
         </div>

         {/* Score Panel */}
         {result.status === 'success' && qc && !isHidden && (
            <div className="p-5 border-t border-white/5 bg-slate-950/50 backdrop-blur-md">
               <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pose Integrity Score</span>
                     <div className={`text-2xl font-black ${qc.score >= 80 ? 'text-green-400' : qc.score >= 40 ? 'text-blue-400' : 'text-red-400'}`}>
                        {qc.score}<span className="text-sm text-slate-600 ml-1">/ 100</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <a href={result.url} download={`pose_${qc.status}_${result.id}.png`} onClick={(e) => e.stopPropagation()} className="p-2.5 bg-white text-black rounded-xl hover:bg-slate-200 transition-colors inline-flex">
                        <Download className="w-4 h-4" />
                     </a>
                  </div>
               </div>
               
               <div className="space-y-2">
                  <ScoreBar label="Face Conf." score={qc.details.faceConfidence || 0} max={40} />
                  <ScoreBar label="Body Ratio" score={qc.details.bodyRatio || 0} max={30} />
                  <ScoreBar label="Centering" score={qc.details.centering || 0} max={30} />
               </div>
            </div>
         )}
         
         {/* Fail Reason Overlay for Hidden Items */}
         {isHidden && qc && (
            <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none">
               <div className="text-red-400 font-bold text-xs mb-1">REJECTED</div>
               <div className="flex flex-wrap gap-1">
                  {qc.rejectReasons?.map((r, i) => (
                     <span key={i} className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-[8px] text-red-200">{r}</span>
                  ))}
                  {qc.score < 40 && <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-[8px] text-red-200">LOW_SCORE</span>}
               </div>
            </div>
         )}
      </div>
   );
};

const ScoreBar = ({ label, score, max }: { label: string, score: number, max: number }) => {
  const percentage = (score / max) * 100;
  return (
    <div className="flex items-center gap-3 text-[10px]">
       <span className="w-20 font-bold text-slate-400 uppercase truncate">{label}</span>
       <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${percentage > 80 ? 'bg-green-500' : percentage > 50 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
       </div>
       <span className="w-8 text-right font-bold text-slate-300">{score}</span>
    </div>
  );
};

export default CommercialPose;
