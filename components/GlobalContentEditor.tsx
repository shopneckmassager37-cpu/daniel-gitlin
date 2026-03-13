import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Classroom, ClassroomMaterial, Subject, Grade, User, Question, MaterialType, HistoryItem, GameType, BlockType } from '../types.ts';
import { generateSummary, generateAssignment, generateQuestions, detectSubjectAI, detectGradeAI, generateTeacherMaterial, generateGameContent } from '../services/geminiService.ts';
import { 
  X, Send, FileText, ListChecks, ClipboardList, Upload, BellRing, Bot, Sparkles, Loader2, 
  Trash2, Plus, CheckCircle2, Search, School, Maximize2, Minimize2, FolderOpen, Library, Settings2, GraduationCap, BookmarkPlus, ArrowLeft, ChevronDown,
  Gamepad2, Brain, Target, HelpCircle, Dices, Image, Video, Code, Calculator, Link, Type as TypeIcon, Bell, GripVertical
} from 'lucide-react';
import RichEditor from './RichEditor.tsx';
import TestPrepView from './TestPrepView.tsx';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const LIBRARY_KEY = 'lumdim_library_v1';

interface ExpandableFieldProps {
  value: string;
  onChange: (v: string) => void;
  onToggle?: (expanded: boolean) => void;
  placeholder?: string;
  label?: string;
  isTextarea?: boolean;
  subject?: string;
}

const SortablePage = ({ page, index, activePageIndex, setActivePageIndex, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative group flex items-center">
      <button
        {...attributes} 
        {...listeners}
        onClick={() => setActivePageIndex(index)}
        onPointerDown={(e) => {
          setActivePageIndex(index);
          if (listeners?.onPointerDown) {
            listeners.onPointerDown(e);
          }
        }}
        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all cursor-grab ${activePageIndex === index ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
      >
        עמוד {index + 1}
      </button>
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
          title="מחק עמוד"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};

const ExpandableField: React.FC<ExpandableFieldProps> = ({ value, onChange, onToggle, placeholder, label, isTextarea = false, subject }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    const newVal = !isExpanded;
    setIsExpanded(newVal);
    if (onToggle) onToggle(newVal);
  };

  return (
    <div className={`space-y-2 relative group ${isExpanded ? 'z-50' : 'z-0'}`}>
      {label && <label className="text-[10px] font-black text-gray-400 uppercase block pr-1">{label}</label>}
      <div className="relative">
        <button 
            onClick={toggleExpand}
            className={`${isExpanded ? 'sticky top-3 left-3 z-[100] bg-white/80 shadow-sm' : 'absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100'} p-2 rounded-lg transition-all flex items-center justify-center w-8 h-8 text-primary hover:text-primary-dark`}
            title={isExpanded ? "סגור הרחבה" : "הרחבה לעיצוב עשיר ומתמטיקה"}
        >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={16} />}
        </button>

        {isExpanded ? (
          <div className="animate-in fade-in zoom-in duration-200">
             <RichEditor 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder} 
                minHeight="200px" 
                minimalMode={false}
                subject={subject}
                stickyOffset="top-0"
             />
          </div>
        ) : (
          <div className="relative">
             {isTextarea ? (
               <textarea 
                value={value.replace(/<[^>]*>/g, '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-primary transition-all text-right font-medium min-h-[100px] resize-none"
               />
             ) : (
               <input 
                type="text" 
                value={value.replace(/<[^>]*>/g, '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-primary transition-all text-right font-medium"
               />
             )}
          </div>
        )}
      </div>
    </div>
  );
};

interface GlobalContentEditorProps {
  user: User;
  onClose: () => void;
  onPublish: (material: ClassroomMaterial, targetClassIds: string[]) => void;
  onSaveDraft?: (material: ClassroomMaterial) => void;
  classrooms: Classroom[];
  initialMaterial?: ClassroomMaterial | null;
  onUpdateUser?: (u: User) => void;
  isPro?: boolean;
  checkAndIncrementAiLimit?: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  title?: string;
  initialSelectedClassIds?: string[];
  skipLibrarySave?: boolean;
}

const getHebrewBlockType = (type: string) => {
  switch (type) {
    case 'TEXT': return 'סיכום';
    case 'SUMMARY': return 'סיכום';
    case 'TEST': return 'שאלות תרגול';
    case 'GAME': return 'משחק למידה';
    case 'UPCOMING_TEST': return 'התראה על מבחן';
    case 'FILE': return 'קובץ';
    default: return type;
  }
}

const SortableBlock = ({ 
  block, bIndex, isAdvancedMode, activePageIndex, draftMaterial, setDraftMaterial, getHebrewBlockType, addBlock, 
  currentContextSubject, expandedOptionMap, setExpandedOptionMap,
  gameType, setGameType, gameContent, setGameContent, userGenerationPrompt, setUserGenerationPrompt, loading, setLoading,
  detectSubjectAI, generateGameContent, currentContextGrade
}: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const changeBlockType = (newType: BlockType) => {
    const newPages = [...(draftMaterial.pages || [])];
    const oldBlock = newPages[activePageIndex].blocks[bIndex];
    
    // Reset content if switching to/from types that use specific JSON formats
    let newContent = oldBlock.content;
    if ((oldBlock.type === 'FILE' || newType === 'FILE') && oldBlock.type !== newType) {
      newContent = '';
    }
    
    newPages[activePageIndex].blocks[bIndex] = { ...oldBlock, type: newType, content: newContent };
    setDraftMaterial((prev: any) => ({ ...prev, pages: newPages }));
    setShowTypeMenu(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative ${showTypeMenu ? 'z-[130]' : ''}`}>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
        {isAdvancedMode && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-gray-100 rounded text-gray-400">
                <GripVertical size={16} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase">בלוק {bIndex + 1} ({getHebrewBlockType(block.type)})</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`relative ${showTypeMenu ? 'z-[130]' : 'z-10'}`}>
                <button 
                  onClick={() => setShowTypeMenu(!showTypeMenu)}
                  className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  <Settings2 size={14} />
                  שנה סוג
                </button>
                {showTypeMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-[130] p-2 animate-in fade-in zoom-in duration-200">
                    {[
                      { id: 'TEXT', label: 'סיכום', icon: FileText },
                      { id: 'TEST', label: 'מבחן/תרגול', icon: ListChecks },
                      { id: 'UPCOMING_TEST', label: 'התראה על מבחן', icon: BellRing },
                      { id: 'GAME', label: 'משחק למידה', icon: Gamepad2 },
                      { id: 'ASSIGNMENT', label: 'מטלה', icon: ClipboardList },
                      { id: 'FILE', label: 'קובץ', icon: Upload }
                    ].map(t => (
                      <button 
                        key={t.id}
                        onClick={() => changeBlockType(t.id as BlockType)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-right transition-colors"
                      >
                        <t.icon size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => {
                  const newPages = [...(draftMaterial.pages || [])];
                  newPages[activePageIndex].blocks = newPages[activePageIndex].blocks.filter((_: any, i: number) => i !== bIndex);
                  setDraftMaterial((prev: any) => ({...prev, pages: newPages}));
                }}
                className="text-red-500 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Trash2 size={14} />
                מחק בלוק
              </button>
            </div>
          </div>
        )}
        {block.type === 'FILE' ? (
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col items-center justify-center py-10">
            <div className="bg-blue-100 p-4 rounded-full text-blue-500 mb-4"><Upload size={32}/></div>
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const newPages = [...(draftMaterial.pages || [])];
                      newPages[activePageIndex].blocks[bIndex] = { 
                        ...newPages[activePageIndex].blocks[bIndex], 
                        content: JSON.stringify({ name: file.name, mimeType: file.type, data: event.target?.result }) 
                      };
                      setDraftMaterial((prev: any) => ({...prev, pages: newPages}));
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              בחר קובץ
            </button>
            {block.content && (() => {
              try {
                const fileData = JSON.parse(block.content);
                return (
                  <p className="mt-4 text-sm font-bold text-blue-900">
                    קובץ נבחר: {fileData.name}
                  </p>
                );
              } catch (e) {
                return null;
              }
            })()}
          </div>
        ) : block.type === 'GAME' ? (
          <div className="p-8 bg-purple-50 rounded-[2.5rem] border border-purple-100 animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg">
                <Gamepad2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-purple-900">הגדרות משחק למידה</h3>
                <p className="text-purple-600 text-xs font-bold">בחר סוג משחק וייצר תוכן בעזרת AI</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
              {[
                { id: 'MEMORY', label: 'משחק זיכרון', icon: Brain },
                { id: 'WHEEL', label: 'גלגל מזל', icon: Target },
                { id: 'TRIVIA', label: 'שעשעון טלוויזיה', icon: HelpCircle },
                { id: 'WORD_SEARCH', label: 'תפזורת', icon: Search },
                { id: 'HANGMAN', label: 'איש תלוי', icon: Dices },
                { id: 'CROSSWORD', label: 'תשבץ', icon: Plus },
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setGameType(t.id as GameType)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${gameType === t.id ? 'border-purple-500 bg-white text-purple-700 shadow-md' : 'border-transparent bg-white/50 text-gray-400 hover:border-purple-200'}`}
                >
                  <t.icon size={20} />
                  <span className="font-black text-[10px]">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-purple-100">
                <span className="font-black text-purple-900 text-sm">טבלת מובילים:</span>
                <select className="p-2 rounded-xl border border-gray-100 font-bold text-xs outline-none focus:border-purple-500 transition-all" value={draftMaterial.leaderboardVisibility || 'ALL'} onChange={(e) => {
                  const value = e.target.value as 'ALL' | 'TEACHER' | 'NONE';
                  setDraftMaterial((prev: any) => ({...prev, leaderboardVisibility: value}));
                }}>
                  <option value="ALL">גלוי לכולם</option>
                  <option value="TEACHER">רק למורה</option>
                  <option value="NONE">ללא טבלה</option>
                </select>
              </div>
              {gameType === 'TRIVIA' && (
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-purple-100">
                  <span className="font-black text-purple-900 text-sm">שיטת ניקוד:</span>
                  <select className="p-2 rounded-xl border border-gray-100 font-bold text-xs outline-none focus:border-purple-500 transition-all" value={draftMaterial.scoringMethod || 'FINAL'} onChange={(e) => setDraftMaterial((prev: any) => ({...prev, scoringMethod: e.target.value as 'FINAL' | 'PER_QUESTION'}))}>
                    <option value="FINAL">ציון בסוף</option>
                    <option value="PER_QUESTION">נכון/לא נכון אחרי כל שאלה</option>
                  </select>
                </div>
              )}
              
              <div className="bg-white p-4 rounded-2xl border border-purple-100">
                <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">הנחיות נוספות ל-AI (אופציונלי)</label>
                <textarea 
                  value={userGenerationPrompt}
                  onChange={(e) => setUserGenerationPrompt(e.target.value)}
                  placeholder="למשל: התמקד במושגים של המהפכה הצרפתית, השתמש בשפה פשוטה..."
                  className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium outline-none focus:border-purple-500 transition-all min-h-[80px]"
                />
              </div>
            </div>
            
            <button 
              onClick={async () => {
                if (!draftMaterial.title) {
                  alert("נא להזין כותרת לפני ייצור תוכן המשחק");
                  return;
                }
                setLoading(true);
                try {
                  const detectedSub = currentContextSubject || await detectSubjectAI(draftMaterial.title);
                  const effectiveGrade = (currentContextGrade as Grade) || Grade.GRADE_10;
                  const content = await generateGameContent(detectedSub, effectiveGrade, gameType, draftMaterial.title, userGenerationPrompt);
                  setGameContent(content);
                } catch (e) {
                  alert("שגיאה בייצור תוכן המשחק");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full p-4 bg-purple-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-purple-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
              <span>ייצר תוכן למשחק עם AI</span>
            </button>

            {gameContent && (
              <div className="mt-8 bg-white p-6 rounded-2xl border border-purple-100 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-gray-800 text-sm">תוכן המשחק שנוצר</h4>
                  <button onClick={() => setGameContent(null)} className="text-red-500 text-[10px] font-black hover:underline">נקה תוכן</button>
                </div>
                <div className="bg-gray-900 p-4 rounded-xl text-left font-mono text-[10px] overflow-x-auto text-green-400 max-h-40" dir="ltr">
                  <pre>{JSON.stringify(gameContent, null, 2)}</pre>
                </div>
                <p className="mt-3 text-[10px] text-gray-400 font-bold">התוכן נוצר ומוכן! התלמידים יראו את המשחק כשיפתחו את החומר.</p>
              </div>
            )}
          </div>
        ) : block.type === 'TEST' ? (
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-green-900 uppercase tracking-widest text-xs flex items-center gap-2"><ListChecks size={16}/> שאלות המבחן/תרגול</h3>
              <div className="flex gap-2">
                <button onClick={() => setDraftMaterial((prev: any) => ({...prev, questions: [...(prev.questions || []), { id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', type: 'MCQ' }]}))} className="text-primary font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-white rounded-lg shadow-sm"><Plus size={14}/> שאלה אמריקאית</button>
                <button onClick={() => setDraftMaterial((prev: any) => ({...prev, questions: [...(prev.questions || []), { id: `q-${Date.now()}`, text: '', options: [], correctIndex: 0, explanation: '', type: 'OPEN', modelAnswer: '' }]}))} className="text-purple-600 font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-white rounded-lg shadow-sm"><Plus size={14}/> שאלה פתוחה</button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 p-3 bg-white rounded-xl border border-green-200">
              <span className="font-bold text-green-800 text-xs">שיטת ניקוד:</span>
              <select className="p-1 rounded-lg border border-gray-200 font-bold text-xs" value={draftMaterial.scoringMethod || 'FINAL'} onChange={(e) => {
                const value = e.target.value as 'FINAL' | 'PER_QUESTION';
                setDraftMaterial(prev => ({...prev, scoringMethod: value}));
              }}>
                <option value="FINAL">ציון בסוף</option>
                <option value="PER_QUESTION">נכון/לא נכון אחרי כל שאלה</option>
              </select>
            </div>

            <div className="space-y-6">
              {draftMaterial.questions && draftMaterial.questions.map((q: any, i: number) => {
                const anyOptionExpanded = q.options?.some((_: any, oi: number) => expandedOptionMap[`${q.id}-${oi}`]);
                return (
                  <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 relative group/q">
                    <button onClick={() => setDraftMaterial((prev: any) => ({...prev, questions: prev.questions?.filter((item: any) => item.id !== q.id)}))} className="absolute top-4 left-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/q:opacity-100 z-10 bg-white rounded-full p-1"><Trash2 size={16}/></button>
                    <div className="mb-6">
                      <ExpandableField 
                        label={`שאלה ${i+1}`}
                        value={q.text} 
                        onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].text = text; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} 
                        placeholder="כתוב את השאלה כאן..." 
                        isTextarea
                        subject={currentContextSubject}
                      />
                    </div>
                    {q.type === 'OPEN' ? (
                      <div className="space-y-4">
                         {draftMaterial.autoGradeByAI && (
                           <ExpandableField 
                            label="תשובת מודל"
                            value={q.modelAnswer || ''} 
                            onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].modelAnswer = text; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} 
                            isTextarea
                            subject={currentContextSubject}
                          />
                         )}
                         {!draftMaterial.autoGradeByAI && (
                           <ExpandableField 
                            label="הסבר פתרון (אופציונלי)"
                            value={q.explanation || ''} 
                            onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].explanation = text; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} 
                            isTextarea
                            subject={currentContextSubject}
                          />
                         )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className={`grid gap-4 transition-all duration-300 ${anyOptionExpanded ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                          {q.options && q.options.map((opt: any, oi: number) => (
                            <div key={oi} className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all ${q.correctIndex === oi ? 'border-green-500 bg-green-50' : 'border-gray-50'} ${expandedOptionMap[`${q.id}-${oi}`] ? 'col-span-full' : ''}`}>
                              <input type="radio" className="mt-4" checked={q.correctIndex === oi} onChange={() => { const newQs = [...draftMaterial.questions!]; newQs[i].correctIndex = oi; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} />
                              <div className="flex-1">
                                <ExpandableField 
                                  value={opt} 
                                  onToggle={(expanded) => setExpandedOptionMap((prev: any) => ({...prev, [`${q.id}-${oi}`]: expanded}))}
                                  onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].options[oi] = text; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} 
                                  placeholder={`אופציה ${oi+1}`} 
                                  subject={currentContextSubject}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <ExpandableField 
                          label="הסבר פתרון (אופציונלי)"
                          value={q.explanation || ''} 
                          onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].explanation = text; setDraftMaterial((prev: any) => ({...prev, questions: newQs})); }} 
                          isTextarea
                          subject={currentContextSubject}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <RichEditor 
            value={block.content || ''} 
            onChange={content => {
              const newPages = [...(draftMaterial.pages || [])];
              newPages[activePageIndex].blocks[bIndex] = { ...newPages[activePageIndex].blocks[bIndex], content };
              setDraftMaterial((prev: any) => ({...prev, pages: newPages}));
            }} 
            placeholder={block.type === 'ASSIGNMENT' ? "כתוב כאן את הוראות המטלה והמשימות לתלמידים..." : "כתוב כאן את תוכן התוכן שיוצג לתלמידים..."} 
            showGuide={true}
            subject={currentContextSubject}
            stickyOffset="top-0"
          />
        )}
      </div>
      {isAdvancedMode && (
        <button onClick={() => addBlock(bIndex)}
          className="w-full py-2 flex items-center justify-center text-gray-300 hover:text-primary transition-all"
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  );
};

const GlobalContentEditor: React.FC<GlobalContentEditorProps> = ({ 
  user, onClose, onPublish, onSaveDraft, classrooms, initialMaterial, onUpdateUser, isPro, checkAndIncrementAiLimit, title, initialSelectedClassIds, skipLibrarySave
}) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(() => {
    if (initialMaterial) {
      return (initialMaterial.pages && initialMaterial.pages.length > 1) || 
             (initialMaterial.pages && initialMaterial.pages[0] && initialMaterial.pages[0].blocks && initialMaterial.pages[0].blocks.length > 1);
    }
    return false;
  });
  const [loading, setLoading] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialSelectedClassIds || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImportModal, setShowImportModal] = useState<'REPO' | 'LIBRARY' | null>(null);
  
  const [addToLibrary, setAddToLibrary] = useState(user.settings?.defaultAddToLibrary ?? true);
  const [manualGrade, setManualGrade] = useState<Grade | 'AUTO'>('AUTO');
  const [gameType, setGameType] = useState<GameType>('MEMORY');
  const [gameContent, setGameContent] = useState<any>(null);

  // AI Generation enhancements
  const [userGenerationPrompt, setUserGenerationPrompt] = useState('');

  // Track which option in which question is expanded to change layout
  const [expandedOptionMap, setExpandedOptionMap] = useState<Record<string, boolean>>({});

  const [draftMaterial, setDraftMaterial] = useState<Partial<ClassroomMaterial>>({
    type: 'SUMMARY',
    title: '',
    content: '',
    questions: [],
    dueDate: '',
    teacherAttachments: [],
    autoGradeByAI: true
  });

  const isPublishedRef = useRef(false);
  const draftRef = useRef(draftMaterial);
  useEffect(() => { draftRef.current = draftMaterial; }, [draftMaterial]);

  const onSaveDraftRef = useRef(onSaveDraft);
  useEffect(() => { onSaveDraftRef.current = onSaveDraft; }, [onSaveDraft]);

  // Auto-save drafts periodically
  useEffect(() => {
    if (!user.settings?.autoSaveDrafts) return;

    const interval = setInterval(() => {
      if (!isPublishedRef.current && onSaveDraftRef.current) {
        const d = draftRef.current;
        if (d.title || d.content || (d.questions && d.questions.length > 0)) {
          const mat: ClassroomMaterial = {
            id: d.id || `draft-${Date.now()}`,
            title: d.title || 'טיוטה ללא כותרת',
            type: d.type as MaterialType || 'SUMMARY',
            content: d.content || '',
            questions: d.questions || [],
            dueDate: d.dueDate,
            timestamp: Date.now(),
            isPublished: false,
            teacherAttachments: d.teacherAttachments || [],
            submissions: [],
            autoGradeByAI: d.autoGradeByAI,
            authorName: user.name,
            subject: Subject.OTHER,
            grade: Grade.NOT_DEFINED
          };
          onSaveDraftRef.current(mat);
        }
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [user.name, user.settings?.autoSaveDrafts]);

  useEffect(() => {
    return () => {
      if (!isPublishedRef.current && onSaveDraftRef.current) {
        const d = draftRef.current;
        if (d.title || d.content || (d.questions && d.questions.length > 0)) {
          const mat: ClassroomMaterial = {
            id: `draft-${Date.now()}`,
            title: d.title || 'טיוטה ללא כותרת',
            type: d.type as MaterialType || 'SUMMARY',
            content: d.content || '',
            questions: d.questions || [],
            dueDate: d.dueDate,
            timestamp: Date.now(),
            isPublished: false,
            teacherAttachments: d.teacherAttachments || [],
            submissions: [],
            autoGradeByAI: d.autoGradeByAI,
            authorName: user.name,
            subject: Subject.OTHER,
            grade: Grade.NOT_DEFINED
          };
          onSaveDraftRef.current(mat);
        }
      }
    };
  }, [user.name]);

  useEffect(() => {
    if (initialMaterial) {
      setDraftMaterial({
        ...initialMaterial,
        id: initialMaterial.id || Date.now().toString()
      });
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const defaultDueDate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);

      setDraftMaterial({
        type: 'SUMMARY',
        title: '',
        content: '',
        pages: [{ id: 'page-1', blocks: [{ id: 'block-1', type: 'TEXT', content: '' }] }],
        questions: [],
        dueDate: defaultDueDate,
        teacherAttachments: [],
        autoGradeByAI: true
      });
    }
  }, [initialMaterial]);

  const [aiMcqCount, setAiMcqCount] = useState(3);
  const [aiOpenCount, setAiOpenCount] = useState(2);
  const [aiGenType, setAiGenType] = useState<'SUMMARY' | 'TEST' | 'ASSIGNMENT'>('SUMMARY');
  const [aiTargetBlockType, setAiTargetBlockType] = useState<BlockType | 'TEST' | null>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePageIndex]);

  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [activePageIndexForBlock, setActivePageIndexForBlock] = useState(0);
  const [showBlockTypeMenu, setShowBlockTypeMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addBlock = (index: number) => {
    const newPages = [...(draftMaterial.pages || [])];
    const blockTypeMap: Record<string, BlockType> = {
      'SUMMARY': 'TEXT',
      'TEST': 'TEST',
      'GAME': 'GAME',
      'ASSIGNMENT': 'TEST',
      'UPLOADED_FILE': 'FILE',
      'UPCOMING_TEST': 'TEXT'
    };
    const newBlockType = blockTypeMap[draftMaterial.type || ''] || 'TEXT';
    const newBlock = { id: `block-${Date.now()}`, type: newBlockType, content: '' };
    const insertIndex = index + 1;
    newPages[activePageIndex].blocks.splice(insertIndex, 0, newBlock);
    setDraftMaterial(prev => ({...prev, pages: newPages}));
  };

  const currentContextSubject = useMemo(() => {
    if (selectedClassIds.length > 0) {
      return classrooms.find(c => c.id === selectedClassIds[0])?.subject;
    }
    return undefined;
  }, [selectedClassIds, classrooms]);

  const currentContextGrade = useMemo(() => {
    if (selectedClassIds.length > 0) {
      return classrooms.find(c => c.id === selectedClassIds[0])?.grade;
    }
    return undefined;
  }, [selectedClassIds, classrooms]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setDraftMaterial(prev => ({
            ...prev,
            teacherAttachments: [{ name: file.name, data: base64Data, mimeType: file.type }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isFileOnly = draftMaterial.type === 'UPLOADED_FILE';
  const isTest = draftMaterial.type === 'TEST';
  const isUpcoming = draftMaterial.type === 'UPCOMING_TEST';
  const isAssignment = draftMaterial.type === 'ASSIGNMENT';
  const isSummary = draftMaterial.type === 'SUMMARY';
  const isGame = draftMaterial.type === 'GAME';

  const handleImportMaterial = (mat: ClassroomMaterial) => {
    const hasMultiplePages = (mat.pages && mat.pages.length > 1) || 
                             (mat.pages && mat.pages[0] && mat.pages[0].blocks && mat.pages[0].blocks.length > 1);
    setIsAdvancedMode(hasMultiplePages);
    setActivePageIndex(0);
    setDraftMaterial({
      ...mat,
      id: mat.id || Date.now().toString(),
      isPublished: false,
      submissions: []
    });
    setShowImportModal(null);
  };

  const createFinalMaterial = async (): Promise<ClassroomMaterial> => {
    setLoading(true);
    try {
      const finalTitle = draftMaterial.title || (draftMaterial.teacherAttachments?.[0]?.name || 'קובץ חדש');
      
      const needsDueDate = ['TEST', 'ASSIGNMENT', 'UPCOMING_TEST'].includes(draftMaterial.type || '');
      const finalDueDate = needsDueDate ? draftMaterial.dueDate : undefined;

      // Grade logic:
      // 1. If manually selected in the editor UI -> use that.
      // 2. Else if selectedClassIds.length > 0:
      //    Check if all selected classes have the same grade.
      //    If yes -> use that grade.
      //    Else -> Grade.NOT_DEFINED.
      // 3. Else -> Grade.NOT_DEFINED.
      
      let finalGrade: Grade = Grade.NOT_DEFINED;
      
      if (manualGrade !== 'AUTO') {
        finalGrade = manualGrade;
      } else if (selectedClassIds.length > 0) {
        const targetClasses = classrooms.filter(c => selectedClassIds.includes(c.id));
        const firstGrade = targetClasses[0]?.grade;
        const allSame = targetClasses.every(c => c.grade === firstGrade);
        if (allSame) {
          finalGrade = firstGrade;
        }
      }

      // AI Detection for Subject if not in context
      const aiSubject = (currentContextSubject as Subject) || await detectSubjectAI(finalTitle);

      const mat: ClassroomMaterial = {
        id: draftMaterial.id || Date.now().toString(),
        title: finalTitle,
        type: draftMaterial.type as MaterialType,
        content: draftMaterial.content || '',
        pages: draftMaterial.pages || [],
        questions: draftMaterial.questions || [],
        dueDate: finalDueDate,
        timestamp: Date.now(),
        isPublished: true,
        teacherAttachments: draftMaterial.teacherAttachments || [],
        submissions: draftMaterial.submissions || [],
        autoGradeByAI: draftMaterial.autoGradeByAI,
        authorName: user.name,
        authorId: user.id,
        subject: aiSubject,
        grade: finalGrade,
        gameType: draftMaterial.type === 'GAME' ? gameType : undefined,
        gameContent: draftMaterial.type === 'GAME' ? gameContent : undefined,
        scoringMethod: draftMaterial.scoringMethod,
        leaderboardVisibility: draftMaterial.leaderboardVisibility
      };

      if (!skipLibrarySave) {
          const library = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
          const existingIndex = library.findIndex((m: any) => m.id === mat.id);
          
          if (initialMaterial) {
              // Edit mode: only update if already in library
              if (existingIndex !== -1) {
                  library[existingIndex] = mat;
                  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
              }
          } else if (addToLibrary) {
              // New material mode: add if addToLibrary is true
              if (existingIndex !== -1) {
                  library[existingIndex] = mat;
              } else {
                  library.unshift(mat);
              }
              localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
          }
      }

      if (onUpdateUser) {
          onUpdateUser({
              ...user,
              settings: {
                  ...(user.settings || {
                    darkMode: false,
                    notificationsEnabled: true,
                    autoSaveDrafts: true,
                    dataSaverMode: false
                  }),
                  defaultAddToLibrary: addToLibrary
              }
          });
      }

      return mat;
    } finally {
      setLoading(false);
    }
  };

  const handlePrePublish = () => {
    if (!draftMaterial.title && !isFileOnly) {
      alert("נא להזין כותרת לתוכן");
      return;
    }
    if (initialMaterial) {
      handleFinalPublish();
    } else {
      setShowClassSelector(true);
    }
  };

  const handleFinalPublish = async () => {
    if (selectedClassIds.length === 0 && !initialMaterial) {
        alert("נא לבחור לפחות כיתה אחת לפרסום");
        return;
    }
    const mat = await createFinalMaterial();
    isPublishedRef.current = true;
    onPublish(mat, selectedClassIds);
    setDraftMaterial({
      type: 'SUMMARY',
      title: '',
      content: '',
      questions: [],
      dueDate: '',
      teacherAttachments: [],
      autoGradeByAI: true
    });
    setUserGenerationPrompt('');
  };

  const handleSaveToRepositoryOnly = async () => {
    const mat = await createFinalMaterial();
    isPublishedRef.current = true;
    onPublish(mat, []);
    setDraftMaterial({
      type: 'SUMMARY',
      title: '',
      content: '',
      questions: [],
      dueDate: '',
      teacherAttachments: [],
      autoGradeByAI: true
    });
    setUserGenerationPrompt('');
  };

  const filteredClassrooms = classrooms.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectMatch = c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || subjectMatch;
  });

  return (
    <div className="fixed inset-0 z-[110] bg-gray-50 flex flex-col animate-slide-up overflow-hidden text-right" dir="rtl">
      <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
          <div className="h-8 w-px bg-gray-200" />
          <h2 className="font-black text-xl text-gray-900 leading-none">{title || 'מרחב יצירת תוכן גלובלי'}</h2>
          
          <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 mr-4">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">מצב עריכה מתקדמת</span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${!isAdvancedMode ? 'text-primary' : 'text-gray-400'}`}>כבוי</span>
              <button 
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${isAdvancedMode ? 'bg-primary shadow-inner' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${isAdvancedMode ? 'left-1' : 'left-7'}`} />
              </button>
              <span className={`text-[10px] font-bold ${isAdvancedMode ? 'text-primary' : 'text-gray-400'}`}>מופעל</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSaveToRepositoryOnly}
            className="text-gray-500 hover:text-primary px-4 py-2 rounded-xl font-bold text-xs transition-all"
          >
            שמור למאגר
          </button>
          <button 
            onClick={handlePrePublish}
            disabled={(!draftMaterial.title && !isFileOnly) || loading}
            className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-600 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {initialMaterial ? 'שמור שינויים' : (initialSelectedClassIds && initialSelectedClassIds.length > 0 ? 'שמור ופרסם' : 'בחר כיתות לפרסום')}
          </button>
        </div>

      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">ייבוא מהמאגר</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowImportModal('REPO')} className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-50 hover:border-primary hover:bg-blue-50 text-gray-600 hover:text-primary transition-all">
                    <FolderOpen size={20} />
                    <span className="font-bold text-[10px]">המאגר שלי</span>
                </button>
                <button onClick={() => setShowImportModal('LIBRARY')} className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-50 hover:border-indigo-500 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 transition-all">
                    <Library size={20} />
                    <span className="font-bold text-[10px]">הספרייה</span>
                </button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">סוג התוכן</label>
            <div className="grid gap-2">
              {[
                { id: 'SUMMARY', label: 'סיכום לימודי', icon: FileText, color: 'blue' },
                { id: 'TEST', label: 'מבחן/תרגול', icon: ListChecks, color: 'indigo' },
                { id: 'ASSIGNMENT', label: 'מטלה להגשה', icon: ClipboardList, color: 'emerald' },
                { id: 'GAME', label: 'משחק למידה', icon: Gamepad2, color: 'purple' },
                { id: 'UPCOMING_TEST', label: 'התראה על מבחן', icon: BellRing, color: 'orange' },
                { id: 'UPLOADED_FILE', label: 'קובץ', icon: Upload, color: 'blue' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => {
                    const newType = t.id as MaterialType;
                    let newDueDate = draftMaterial.dueDate;
                    if (newType !== 'UPCOMING_TEST' && !newDueDate) {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        newDueDate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                    } else if (newType === 'UPCOMING_TEST') {
                        newDueDate = '';
                    }
                    setDraftMaterial(prev => {
                      const newState = { ...prev, type: newType, dueDate: newDueDate };
                      let blockType: any = 'TEXT';
                      if (newType === 'TEST' || newType === 'ASSIGNMENT') blockType = 'TEST';
                      if (newType === 'UPLOADED_FILE') blockType = 'FILE';
                      if (newType === 'GAME') blockType = 'GAME';
                      if (newType === 'UPCOMING_TEST') blockType = 'UPCOMING_TEST';
                      
                      const newPages = [...(prev.pages || [])];
                      if (newPages.length === 0) {
                        newPages.push({ id: `page-${Date.now()}`, blocks: [] });
                      }
                      
                      // Update the type of the first block if it exists, otherwise add it
                      if (newPages[0].blocks.length === 0) {
                        newPages[0].blocks.push({ id: `block-${Date.now()}`, type: blockType, content: '' });
                      } else {
                        // Update the type of the CURRENT block if we are in advanced mode, 
                        // or the first block if not.
                        const targetPageIndex = isAdvancedMode ? activePageIndex : 0;
                        const targetBlockIndex = isAdvancedMode ? (activeBlockIndex !== null ? activeBlockIndex : 0) : 0;
                        
                        if (newPages[targetPageIndex] && newPages[targetPageIndex].blocks[targetBlockIndex]) {
                          newPages[targetPageIndex].blocks[targetBlockIndex] = { 
                            ...newPages[targetPageIndex].blocks[targetBlockIndex], 
                            type: blockType 
                          };
                        } else {
                          newPages[0].blocks[0] = { ...newPages[0].blocks[0], type: blockType };
                        }
                      }
                      newState.pages = newPages;
                      return newState;
                    })
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-right ${draftMaterial.type === t.id ? `border-${t.color}-500 bg-${t.color}-50 text-${t.color}-700 shadow-sm` : 'border-gray-50 hover:border-gray-200 text-gray-500'}`}
                >
                  <t.icon size={20} className={draftMaterial.type === t.id ? `text-${t.color}-500` : 'text-gray-300'} />
                  <span className="font-bold text-sm">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(isTest || isAssignment || isUpcoming || (draftMaterial.pages?.some(p => p.blocks.some(b => b.type === 'UPCOMING_TEST')))) && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">
                    {isUpcoming || draftMaterial.pages?.some(p => p.blocks.some(b => b.type === 'UPCOMING_TEST')) ? 'תאריך המבחן' : 'תאריך יעד'}
                </label>
                <input 
                  type="date" 
                  value={draftMaterial.dueDate || ''} 
                  onChange={(e) => setDraftMaterial(prev => ({...prev, dueDate: e.target.value}))} 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all"
                />
            </div>
          )}

          {!isFileOnly && (
             <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2 flex items-center gap-2"><Bot size={12}/> סוג תוכן לייצור</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'SUMMARY', label: 'סיכום', icon: FileText },
                      { id: 'TEST', label: 'שאלות', icon: ListChecks },
                      { id: 'ASSIGNMENT', label: 'מטלה', icon: ClipboardList }
                    ].map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setAiGenType(t.id as any)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${aiGenType === t.id ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 text-gray-400 hover:border-gray-100'}`}
                      >
                        <t.icon size={16} />
                        <span className="text-[8px] font-black">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {aiGenType === 'TEST' && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">כמות שאלות לייצור</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                        <span className="text-[10px] font-black text-gray-400 block mb-1">אמריקאיות</span>
                        <input type="number" min="0" max="10" value={aiMcqCount} onChange={(e) => setAiMcqCount(parseInt(e.target.value) || 0)} className="w-full bg-transparent font-black text-lg text-indigo-600 outline-none text-center" />
                      </div>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
                        <span className="text-[10px] font-black text-gray-400 block mb-1">פתוחות</span>
                        <input type="number" min="0" max="10" value={aiOpenCount} onChange={(e) => setAiOpenCount(parseInt(e.target.value) || 0)} className="w-full bg-transparent font-black text-lg text-purple-600 outline-none text-center" />
                      </div>
                    </div>
                  </div>
                )}

                {(!initialSelectedClassIds || initialSelectedClassIds.length === 0) && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">התאמת רמת התוכן (כיתה)</label>
                    <div className="relative group/grade">
                      <select 
                        value={manualGrade}
                        onChange={(e) => setManualGrade(e.target.value as Grade | 'AUTO')}
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                      >
                        <option value="AUTO">זיהוי אוטומטי</option>
                        {Object.values(Grade).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/grade:text-primary transition-colors" />
                    </div>
                  </div>
                )}

                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2 flex items-center gap-2 mt-4"><Settings2 size={12}/> הנחיות ל-AI (פרומפט)</label>
                 <textarea 
                  value={userGenerationPrompt} 
                  onChange={e => setUserGenerationPrompt(e.target.value)} 
                  placeholder="הוסף הנחיות מיוחדות ל-AI (אופציונלי)..." 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-medium outline-none focus:border-primary transition-all resize-none h-24 mb-4"
                />

                <button 
                 onClick={async () => {
                   if (!draftMaterial.title) return;
                   
                   // Check AI limit
                   if (checkAndIncrementAiLimit && !checkAndIncrementAiLimit('PRACTICE')) {
                     alert("הגעת למכסת 10 בקשות ה-AI היומיות שלך בתוכנית החינמית. שדרג לפרו כדי להמשיך ללא הגבלה!");
                     return;
                   }

                   setLoading(true);
                   try {
                     const detectedSub = currentContextSubject || await detectSubjectAI(draftMaterial.title);
                     const detectedGrade = currentContextGrade || await detectGradeAI(draftMaterial.title, activeBlock.content || '');
                     
                     const result = await generateTeacherMaterial(
                       detectedSub,
                       detectedGrade,
                       aiGenType as MaterialType,
                       draftMaterial.title,
                       userGenerationPrompt,
                       aiGenType === 'TEST' ? { mcqCount: aiMcqCount, openCount: aiOpenCount } : undefined
                     );
                     
                     // Update block content or add new block
                     const newPages = [...(draftMaterial.pages || [])];
                     if (newPages.length === 0) {
                       newPages.push({ id: `page-${Date.now()}`, blocks: [] });
                     }
                     
                     const targetBlockType = aiGenType === 'TEST' ? 'TEST' : (aiGenType === 'ASSIGNMENT' ? 'TEST' : 'TEXT');
                     
                     // If active block is empty or same type, update it. Otherwise add new.
                     let blockToUpdate = newPages[activePageIndexForBlock]?.blocks[activeBlockIndex ?? 0];
                     if (!blockToUpdate || (blockToUpdate.content === '' && (blockToUpdate.questions?.length || 0) === 0)) {
                       if (!blockToUpdate) {
                         blockToUpdate = { id: `block-${Date.now()}`, type: targetBlockType, content: '' };
                         newPages[activePageIndexForBlock].blocks.push(blockToUpdate);
                       } else {
                         blockToUpdate.type = targetBlockType;
                       }
                     } else {
                       // Add new block
                       blockToUpdate = { id: `block-${Date.now()}`, type: targetBlockType, content: '' };
                       newPages[activePageIndexForBlock].blocks.push(blockToUpdate);
                     }

                     if (result.content) {
                       blockToUpdate.content = result.content;
                     }
                     if (result.questions) {
                       blockToUpdate.questions = [...(blockToUpdate.questions || []), ...result.questions!];
                     }
                     setDraftMaterial(prev => ({...prev, pages: newPages}));
                     
                   } catch (e) {
                     console.error(e);
                     alert("שגיאה בייצור תוכן.");
                   } finally {
                     setLoading(false);
                   }
                 }}
                 disabled={loading || !draftMaterial.title}
                 className="w-full p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 transition-all disabled:opacity-20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-400" />}
                  <span>ייצר תוכן עם AI</span>
                </button>
             </div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 bg-gray-50 overflow-y-auto px-4 md:px-10 pb-32 relative no-scrollbar">
          <div className="w-full space-y-12 pt-10 pb-32">
            <input 
              type="text" 
              value={draftMaterial.title}
              onChange={e => setDraftMaterial(prev => ({...prev, title: e.target.value}))}
              placeholder={isFileOnly ? "כותרת לקובץ (אופציונלי)..." : "כותרת התוכן..."}
              className="w-full bg-transparent border-none text-5xl font-black text-gray-900 placeholder:text-gray-200 outline-none"
            />

            {isAdvancedMode && (
              <div className="flex gap-2 mt-4 mb-8 items-center flex-wrap justify-start bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                  const { active, over } = event;
                  if (active.id !== over?.id) {
                    const oldIndex = draftMaterial.pages!.findIndex(p => p.id === active.id);
                    const newIndex = draftMaterial.pages!.findIndex(p => p.id === over!.id);
                    
                    setDraftMaterial(prev => ({
                      ...prev,
                      pages: arrayMove(prev.pages!, oldIndex, newIndex)
                    }));
                    
                    // If the active page was moved, follow it
                    if (activePageIndex === oldIndex) {
                      setActivePageIndex(newIndex);
                    } else if (activePageIndex > oldIndex && activePageIndex <= newIndex) {
                      setActivePageIndex(activePageIndex - 1);
                    } else if (activePageIndex < oldIndex && activePageIndex >= newIndex) {
                      setActivePageIndex(activePageIndex + 1);
                    }
                  }
                }}>
                  <SortableContext items={draftMaterial.pages ? draftMaterial.pages.map(p => p.id) : []} strategy={horizontalListSortingStrategy}>
                    {draftMaterial.pages?.map((page, index) => (
                      <SortablePage 
                        key={page.id} 
                        page={page} 
                        index={index} 
                        activePageIndex={activePageIndex} 
                        setActivePageIndex={setActivePageIndex} 
                        onDelete={(idx: number) => {
                          const newPages = draftMaterial.pages!.filter((_, i) => i !== idx);
                          setDraftMaterial(prev => ({ ...prev, pages: newPages }));
                          if (activePageIndex >= newPages.length) setActivePageIndex(newPages.length - 1);
                        }} 
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                <button
                  onClick={() => {
                    setDraftMaterial(prev => ({
                      ...prev,
                      pages: [...(prev.pages || []), { id: `page-${Date.now()}-${Math.random()}`, blocks: [{ id: `block-${Date.now()}-${Math.random()}`, type: 'TEXT', content: '' }] }]
                    }));
                    setActivePageIndex((draftMaterial.pages?.length || 0));
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  + הוסף עמוד
                </button>
              </div>
            )}

            <div className="space-y-6">
              {isAdvancedMode && (
                <button onClick={() => addBlock(-1)}
                  className="w-full py-2 flex items-center justify-center text-gray-300 hover:text-primary transition-all"
                >
                  <Plus size={20} />
                </button>
              )}
              
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => {
                const { active, over } = event;
                if (active.id !== over?.id) {
                  const newPages = [...(draftMaterial.pages || [])];
                  const blocks = newPages[activePageIndex].blocks;
                  const oldIndex = blocks.findIndex(b => b.id === active.id);
                  const newIndex = blocks.findIndex(b => b.id === over!.id);
                  newPages[activePageIndex].blocks = arrayMove(blocks, oldIndex, newIndex);
                  setDraftMaterial(prev => ({ ...prev, pages: newPages }));
                }
              }}>
                <SortableContext items={draftMaterial.pages && draftMaterial.pages[activePageIndex] ? draftMaterial.pages[activePageIndex].blocks.map(b => b.id) : []} strategy={horizontalListSortingStrategy}>
                  {draftMaterial.pages && draftMaterial.pages[isAdvancedMode ? activePageIndex : 0] && (isAdvancedMode ? draftMaterial.pages[activePageIndex].blocks : draftMaterial.pages[0].blocks).filter(b => !!b).map((block, bIndex) => (
                    <SortableBlock 
                      key={block.id}
                      block={block}
                      bIndex={bIndex}
                      isAdvancedMode={isAdvancedMode}
                      activePageIndex={isAdvancedMode ? activePageIndex : 0}
                      draftMaterial={draftMaterial}
                      setDraftMaterial={setDraftMaterial}
                      getHebrewBlockType={getHebrewBlockType}
                      addBlock={addBlock}
                      currentContextSubject={currentContextSubject}
                      expandedOptionMap={expandedOptionMap}
                      setExpandedOptionMap={setExpandedOptionMap}
                      gameType={gameType}
                      setGameType={setGameType}
                      gameContent={gameContent}
                      setGameContent={setGameContent}
                      userGenerationPrompt={userGenerationPrompt}
                      setUserGenerationPrompt={setUserGenerationPrompt}
                      loading={loading}
                      setLoading={setLoading}
                      detectSubjectAI={detectSubjectAI}
                      generateGameContent={generateGameContent}
                      currentContextGrade={currentContextGrade}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </div>
      </div>

      {showClassSelector && 
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="text-2xl font-black text-gray-900">פרסום לכיתות</h3>
               </div>
               <button onClick={() => setShowClassSelector(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={24}/></button>
            </div>
            
            <div className="p-6 bg-white border-b border-gray-100">
               <div className="relative">
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="חפש כיתה..." 
                    className="w-full p-4 pr-12 bg-gray-100 border-none rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold"
                  />
                  <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
               {classrooms && classrooms.length === 0 ? (
                 <div className="text-center py-20 flex flex-col items-center gap-4">
                   <School size={48} className="text-gray-200" />
                   <p className="text-gray-400 font-bold">לא נמצאו כיתות המשויכות אליך.</p>
                 </div>
               ) : filteredClassrooms.map(c => {
                   const isSelected = selectedClassIds.includes(c.id);
                   return (
                     <button 
                       key={c.id} 
                       onClick={() => setSelectedClassIds(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                       className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-right ${isSelected ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-50 hover:border-gray-100 bg-white'}`}
                     >
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                             <School size={20} />
                          </div>
                          <div>
                             <h4 className="font-black text-gray-900">{c.name}</h4>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.subject} • {c.grade}</p>
                          </div>
                       </div>
                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                          {isSelected && <CheckCircle2 size={16} />}
                       </div>
                     </button>
                   );
                 })}
            </div>

            <div className="p-8 border-t border-gray-100 bg-blue-50/30 space-y-6">
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-gray-100 group hover:border-primary transition-all cursor-pointer mb-2" onClick={() => setAddToLibrary(!addToLibrary)}>
                    <div className="flex items-center gap-3">
                        <BookmarkPlus size={20} className={addToLibrary ? 'text-primary' : 'text-gray-300'} />
                        <span className="font-black text-sm text-gray-700">פרסם גם לספריית הקהילה הציבורית</span>
                    </div>
                    <input type="checkbox" checked={addToLibrary} onChange={() => {}} className="w-5 h-5 accent-primary" />
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                   <button 
                    onClick={handleFinalPublish} 
                    disabled={selectedClassIds.length === 0 || loading}
                    className="flex-[2] bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-600 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                   >
                     {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={20}/>}
                     <span>פרסם ל-{selectedClassIds.length} כיתות</span>
                   </button>
                   
                   <button 
                    onClick={handleSaveToRepositoryOnly}
                    disabled={loading}
                    className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                   >
                     {loading ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
                     <span>שמירה במאגר בלבד</span>
                   </button>
                </div>
            </div>
          </div>
        </div>
      }

      {showImportModal && (
        <div className="fixed inset-0 z-[170] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-2xl font-black">{showImportModal === 'REPO' ? 'ייבוא מהמאגר שלי' : 'ייבוא מספריית הקהילה'}</h3>
                    <button onClick={() => setShowImportModal(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                    {showImportModal === 'REPO' ? (
                        JSON.parse(localStorage.getItem(`study_history_${user.id}`) || '[]')
                        .filter((h: any) => h.type === 'SUMMARY' || h.type === 'PRACTICE' || h.type === 'LESSON_PLAN')
                        .length === 0 ? <p className="text-center py-20 text-gray-400">המאגר שלך ריק...</p> :
                        JSON.parse(localStorage.getItem(`study_history_${user.id}`) || '[]')
                        .filter((h: any) => h.type === 'SUMMARY' || h.type === 'PRACTICE' || h.type === 'LESSON_PLAN')
                        .map((item: any) => (
                            <button key={item.id} onClick={() => handleImportMaterial(item.details || item)} className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-primary hover:shadow-md transition-all text-right group flex justify-between items-center">
                                <div>
                                    <h4 className="font-black text-gray-800">{item.title}</h4>
                                    <p className="text-[10px] font-bold text-gray-400">{item.subject} • {new Date(item.timestamp).toLocaleDateString('he-IL')}</p>
                                </div>
                                <ArrowLeft size={20} className="text-gray-300 group-hover:text-primary transition-all"/>
                            </button>
                        ))
                    ) : (
                        JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]').length === 0 ? <p className="text-center py-20 text-gray-400">הספרייה ריקה...</p> :
                        JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]').map((item: any) => (
                            <button key={item.id} onClick={() => handleImportMaterial(item)} className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-indigo-500 hover:shadow-md transition-all text-right group flex justify-between items-center">
                                <div>
                                    <h4 className="font-black text-gray-800">{item.title}</h4>
                                    <p className="text-[10px] font-bold text-gray-400">{item.subject} • מאת: {item.authorName}</p>
                                </div>
                                <ArrowLeft size={20} className="text-gray-300 group-hover:text-indigo-500 transition-all"/>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GlobalContentEditor;