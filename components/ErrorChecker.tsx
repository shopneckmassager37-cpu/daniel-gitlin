
import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon, Scan, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { checkWorkForErrors } from '../services/geminiService.ts';

interface ErrorCheckerProps {
  onBack: () => void;
}

const LOADING_MESSAGES = [
  "סורק את הדף...",
  "מנתח כתב יד...",
  "בודק שגיאות כתיב...",
  "מחשב מחדש תרגילים...",
  "מכין דוח טעויות...",
  "כמעט מוכן..."
];

const ErrorChecker: React.FC<ErrorCheckerProps> = ({ onBack }) => {
  const [image, setImage] = useState<{ preview: string; data: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [results, setResults] = useState<{
    spellingErrors: Array<{ original: string; corrected: string; explanation: string }>;
    mathErrors: Array<{ problem: string; error: string; correction: string }>;
    generalFeedback: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        const data = preview.split(',')[1];
        setImage({ preview, data, mimeType: file.type });
        setResults(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheck = async () => {
    if (!image) return;
    setLoading(true);
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    try {
      const res = await checkWorkForErrors(image.data, image.mimeType);
      setResults(res);
    } catch (err) {
      alert("מצטערים, אירעה שגיאה בניתוח הדף.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900">סורק טעויות חכם</h2>
          <p className="text-gray-500 font-bold">סרוק דף מהמחברת ונבדוק אם יש טעויות כתיב או חשבון</p>
        </div>
      </div>

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-4 border-dashed border-gray-100 rounded-[3rem] p-12 md:p-20 flex flex-col items-center justify-center text-center cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all group"
        >
          <div className="bg-orange-100 p-8 rounded-full text-orange-500 mb-8 group-hover:scale-110 transition-transform shadow-sm">
            <Camera size={64} />
          </div>
          <h3 className="text-3xl font-black text-gray-800 mb-4">העלו צילום של הדף</h3>
          <p className="text-gray-400 font-bold text-lg max-w-sm mx-auto">צלימו את שיעורי הבית או את המבחן שלכם, וה-AI שלנו יסרוק אותו ויחפש טעויות.</p>
          <button className="mt-10 bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-black transition-all">בחירת תמונה</button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Preview Section */}
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-100 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-black text-gray-700">הצילום שלך</span>
              <button onClick={reset} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all flex items-center gap-2 font-bold text-sm">
                <RotateCcw size={16} />
                <span>החלף תמונה</span>
              </button>
            </div>
            <div className="relative aspect-[3/4] bg-gray-200 flex items-center justify-center">
              <img src={image.preview} alt="Work preview" className="w-full h-full object-contain" />
              {loading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <div className="relative p-6 bg-white rounded-full text-orange-500 shadow-xl">
                      <Scan size={48} className="animate-pulse" />
                    </div>
                  </div>
                  <p className="text-2xl font-black">{LOADING_MESSAGES[loadingMsgIdx]}</p>
                </div>
              )}
            </div>
            {!loading && !results && (
              <div className="p-6">
                <button onClick={handleCheck} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 rounded-2xl font-black text-xl shadow-lg transition-all flex items-center justify-center gap-3">
                  <Sparkles size={24} />
                  <span>בדוק טעויות עכשיו</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {results ? (
              <div className="animate-slide-up space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100">
                  <div className="flex items-center gap-3 mb-6 text-orange-600">
                    <CheckCircle2 size={28} />
                    <h3 className="text-2xl font-black">סיכום הבדיקה</h3>
                  </div>
                  <p className="text-gray-700 font-medium text-lg leading-relaxed">{results.generalFeedback}</p>
                </div>

                {results.spellingErrors.length > 0 && (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100">
                    <h4 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-6 pr-2">טעויות כתיב שנמצאו</h4>
                    <div className="space-y-4">
                      {results.spellingErrors.map((err, i) => (
                        <div key={i} className="bg-red-50/50 p-5 rounded-2xl border border-red-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-red-500 font-black line-through">{err.original}</span>
                            <ArrowRight size={16} className="text-gray-300" />
                            <span className="text-green-600 font-black">{err.corrected}</span>
                          </div>
                          <p className="text-sm text-gray-500 font-bold">{err.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.mathErrors.length > 0 && (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100">
                    <h4 className="text-lg font-black text-gray-400 uppercase tracking-widest mb-6 pr-2">טעויות בחשבון</h4>
                    <div className="space-y-4">
                      {results.mathErrors.map((err, i) => (
                        <div key={i} className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                          <div className="font-black text-gray-800 mb-2">{err.problem}</div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
                              <AlertCircle size={14} />
                              <span>הטעות: {err.error}</span>
                            </div>
                            <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                              <CheckCircle2 size={14} />
                              <span>התיקון: {err.correction}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.spellingErrors.length === 0 && results.mathErrors.length === 0 && (
                  <div className="bg-green-50 p-12 rounded-[2.5rem] border-2 border-dashed border-green-200 text-center">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 shadow-sm">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-green-800 mb-2">עבודה מושלמת!</h3>
                    <p className="text-green-600 font-bold">לא מצאנו טעויות בדף הזה. כל הכבוד על הדיוק!</p>
                  </div>
                )}

                <button onClick={reset} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all">סרוק דף נוסף</button>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center text-gray-300">
                <Scan size={48} className="opacity-20 mb-4" />
                <p className="font-bold text-lg">לחץ על הכפתור מתחת לתמונה כדי להתחיל את הבדיקה</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorChecker;
