
import React, { useState } from 'react';
import { PresentationData, SlideData } from '../types.ts';
import { 
  X, Save, Sparkles, Plus, Trash2, 
  ChevronRight, ChevronLeft, Layout, 
  Type, List, Quote, Columns, Loader2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface PresentationEditorProps {
  data: PresentationData;
  onSave: (updatedData: PresentationData) => void;
  onClose: () => void;
}

const PresentationEditor: React.FC<PresentationEditorProps> = ({ data, onSave, onClose }) => {
  const [editedData, setEditedData] = useState<PresentationData>({ ...data });
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSlide = editedData.slides[activeSlideIdx];

  const updateSlide = (idx: number, updates: Partial<SlideData>) => {
    const newSlides = [...editedData.slides];
    newSlides[idx] = { ...newSlides[idx], ...updates };
    setEditedData({ ...editedData, slides: newSlides });
  };

  const addSlide = () => {
    const newSlide: SlideData = {
      title: 'שקף חדש',
      content: ['תוכן חדש'],
      layout: 'TITLE'
    };
    setEditedData({ ...editedData, slides: [...editedData.slides, newSlide] });
    setActiveSlideIdx(editedData.slides.length);
  };

  const removeSlide = (idx: number) => {
    if (editedData.slides.length <= 1) return;
    const newSlides = editedData.slides.filter((_, i) => i !== idx);
    setEditedData({ ...editedData, slides: newSlides });
    setActiveSlideIdx(Math.max(0, activeSlideIdx - 1));
  };

  const handleAiEdit = async () => {
    if (!aiInstruction.trim()) return;
    setIsGenerating(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      יש לי מצגת קיימת: ${JSON.stringify(editedData)}.
      הנחיית המשתמש לשינוי המצגת: "${aiInstruction}".
      
      עליך להחזיר אובייקט JSON מעודכן של המצגת (PresentationData) הכולל title ו-slides.
      כל שקף כולל title, content (מערך של מחרוזות) ו-layout (TITLE|BULLETS|SPLIT|QUOTE).
      
      החזר אך ורק את ה-JSON המעודכן.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || "{}");
      if (result && result.slides) {
        setEditedData(result);
        setAiInstruction('');
      }
    } catch (e) {
      alert("שגיאה בעדכון המצגת עם AI");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-900/90 backdrop-blur-xl flex flex-col animate-fade-in" dir="rtl">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white"><Layout size={24} /></div>
          <div>
            <input 
              value={editedData.title} 
              onChange={e => setEditedData({...editedData, title: e.target.value})}
              className="text-xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0"
            />
            <p className="text-xs text-gray-400 font-bold">עורך מצגות חכם</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => onSave(editedData)} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <Save size={20} />
            <span>שמור שינויים</span>
          </button>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Slide List */}
        <div className="w-72 bg-gray-50 border-l border-gray-200 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {editedData.slides.map((slide, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveSlideIdx(idx)}
                className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeSlideIdx === idx ? 'bg-white border-blue-500 shadow-md' : 'bg-transparent border-transparent hover:bg-white/50'}`}
              >
                <span className="absolute top-2 right-2 text-[10px] font-black text-gray-300">{idx + 1}</span>
                <h5 className="font-bold text-gray-800 text-sm truncate ml-6">{slide.title}</h5>
                <div className="mt-2 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex flex-col p-1 gap-1">
                  <div className="h-2 w-2/3 bg-gray-300 rounded-full"></div>
                  <div className="h-1 w-full bg-gray-200 rounded-full"></div>
                  <div className="h-1 w-full bg-gray-200 rounded-full"></div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                  className="absolute bottom-2 left-2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button onClick={addSlide} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all flex flex-col items-center gap-2 font-bold text-sm">
              <Plus size={20} />
              הוסף שקף
            </button>
          </div>

          {/* AI Instructions Panel */}
          <div className="p-4 bg-white border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
              <Sparkles size={14} />
              <span>עריכה עם AI</span>
            </div>
            <textarea 
              value={aiInstruction}
              onChange={e => setAiInstruction(e.target.value)}
              placeholder="למשל: 'הוסף שקף על...', 'שנה את הסגנון ל...', 'קצר את הטקסט ב...'"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium resize-none h-24 focus:border-blue-500 outline-none transition-all"
            />
            <button 
              onClick={handleAiEdit}
              disabled={isGenerating || !aiInstruction.trim()}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-xs shadow-lg hover:bg-black disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-400" />}
              <span>עדכן מצגת</span>
            </button>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 bg-gray-200/50 p-8 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl aspect-video flex flex-col overflow-hidden border border-white relative">
            {/* Slide Content */}
            <div className="flex-1 p-12 md:p-16 flex flex-col">
              <input 
                value={activeSlide.title}
                onChange={e => updateSlide(activeSlideIdx, { title: e.target.value })}
                className="text-4xl md:text-5xl font-black text-gray-900 bg-transparent border-none focus:ring-0 p-0 mb-8 w-full"
                placeholder="כותרת השקף"
              />
              
              <div className="flex-1">
                {activeSlide.layout === 'TITLE' && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-2xl text-gray-400 font-bold italic">שקף כותרת בלבד</p>
                  </div>
                )}
                
                {activeSlide.layout === 'BULLETS' && (
                  <div className="space-y-4">
                    {activeSlide.content.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-4 group/bullet">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mt-3 shrink-0"></div>
                        <textarea 
                          value={bullet}
                          onChange={e => {
                            const newContent = [...activeSlide.content];
                            newContent[bIdx] = e.target.value;
                            updateSlide(activeSlideIdx, { content: newContent });
                          }}
                          className="flex-1 text-xl font-medium text-gray-700 bg-transparent border-none focus:ring-0 p-0 resize-none min-h-[40px]"
                          rows={1}
                        />
                        <button 
                          onClick={() => {
                            const newContent = activeSlide.content.filter((_, i) => i !== bIdx);
                            updateSlide(activeSlideIdx, { content: newContent });
                          }}
                          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover/bullet:opacity-100 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => updateSlide(activeSlideIdx, { content: [...activeSlide.content, 'נקודה חדשה'] })}
                      className="flex items-center gap-2 text-blue-500 font-black text-sm hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                    >
                      <Plus size={18} />
                      הוסף נקודה
                    </button>
                  </div>
                )}

                {activeSlide.layout === 'QUOTE' && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-10">
                    <Quote size={48} className="text-blue-100 mb-6" />
                    <textarea 
                      value={activeSlide.content[0] || ''}
                      onChange={e => updateSlide(activeSlideIdx, { content: [e.target.value] })}
                      className="w-full text-3xl font-black text-gray-800 bg-transparent border-none focus:ring-0 p-0 text-center italic leading-relaxed"
                      placeholder="הכנס ציטוט או משפט מפתח..."
                    />
                  </div>
                )}

                {activeSlide.layout === 'SPLIT' && (
                  <div className="grid grid-cols-2 gap-12 h-full">
                    <div className="space-y-4 border-l border-gray-100 pl-6">
                       <textarea 
                          value={activeSlide.content[0] || ''}
                          onChange={e => {
                            const newContent = [...activeSlide.content];
                            newContent[0] = e.target.value;
                            updateSlide(activeSlideIdx, { content: newContent });
                          }}
                          className="w-full text-lg font-bold text-gray-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-full"
                          placeholder="טקסט צד ימין..."
                       />
                    </div>
                    <div className="space-y-4">
                       <textarea 
                          value={activeSlide.content[1] || ''}
                          onChange={e => {
                            const newContent = [...activeSlide.content];
                            newContent[1] = e.target.value;
                            updateSlide(activeSlideIdx, { content: newContent });
                          }}
                          className="w-full text-lg font-bold text-gray-700 bg-transparent border-none focus:ring-0 p-0 resize-none h-full"
                          placeholder="טקסט צד שמאל..."
                       />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Layout Switcher */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-6 shadow-2xl border border-white/10">
              <button 
                onClick={() => updateSlide(activeSlideIdx, { layout: 'TITLE' })}
                className={`flex flex-col items-center gap-1 transition-all ${activeSlide.layout === 'TITLE' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-white'}`}
              >
                <Type size={18} />
                <span className="text-[8px] font-black uppercase">כותרת</span>
              </button>
              <button 
                onClick={() => updateSlide(activeSlideIdx, { layout: 'BULLETS' })}
                className={`flex flex-col items-center gap-1 transition-all ${activeSlide.layout === 'BULLETS' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-white'}`}
              >
                <List size={18} />
                <span className="text-[8px] font-black uppercase">נקודות</span>
              </button>
              <button 
                onClick={() => updateSlide(activeSlideIdx, { layout: 'SPLIT' })}
                className={`flex flex-col items-center gap-1 transition-all ${activeSlide.layout === 'SPLIT' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-white'}`}
              >
                <Columns size={18} />
                <span className="text-[8px] font-black uppercase">פיצול</span>
              </button>
              <button 
                onClick={() => updateSlide(activeSlideIdx, { layout: 'QUOTE' })}
                className={`flex flex-col items-center gap-1 transition-all ${activeSlide.layout === 'QUOTE' ? 'text-blue-400 scale-110' : 'text-gray-400 hover:text-white'}`}
              >
                <Quote size={18} />
                <span className="text-[8px] font-black uppercase">ציטוט</span>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center gap-6">
            <button 
              disabled={activeSlideIdx === 0}
              onClick={() => setActiveSlideIdx(activeSlideIdx - 1)}
              className="p-4 bg-white rounded-2xl shadow-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={24} />
            </button>
            <span className="font-black text-gray-500 bg-white px-6 py-2 rounded-full shadow-inner border border-gray-100">
              {activeSlideIdx + 1} / {editedData.slides.length}
            </span>
            <button 
              disabled={activeSlideIdx === editedData.slides.length - 1}
              onClick={() => setActiveSlideIdx(activeSlideIdx + 1)}
              className="p-4 bg-white rounded-2xl shadow-lg text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationEditor;
