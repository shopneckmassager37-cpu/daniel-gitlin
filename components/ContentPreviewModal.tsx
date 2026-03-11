import React, { useEffect, useRef } from 'react';
import { HistoryItem, LessonPlan, Question } from '../types.ts';
import LatexRenderer from './LatexRenderer.tsx';
import {
  X, FileText, ClipboardCheck, Sparkles, LayoutTemplate, BookOpen, Calendar,
  GraduationCap, PenTool, CheckCircle, HelpCircle, Clock, ExternalLink, Printer
} from 'lucide-react';

interface ContentPreviewModalProps {
  item: HistoryItem;
  onClose: () => void;
  onOpenForEditing?: (item: HistoryItem) => void;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'LESSON_PLAN': return <LayoutTemplate size={22} className="text-indigo-500" />;
    case 'EXAM_CHECK': return <ClipboardCheck size={22} className="text-emerald-500" />;
    case 'SUMMARY': return <FileText size={22} className="text-blue-500" />;
    case 'PRACTICE': return <Sparkles size={22} className="text-purple-500" />;
    case 'TEST': return <HelpCircle size={22} className="text-orange-500" />;
    case 'ASSIGNMENT': return <PenTool size={22} className="text-rose-500" />;
    default: return <BookOpen size={22} className="text-gray-400" />;
  }
};

const getTypeName = (type: string) => {
  switch (type) {
    case 'LESSON_PLAN': return 'מערך שיעור';
    case 'EXAM_CHECK': return 'בדיקת מבחן';
    case 'SUMMARY': return 'סיכום לימודי';
    case 'PRACTICE': return 'תרגול כיתתי';
    case 'TEST': return 'מבחן';
    case 'ASSIGNMENT': return 'מטלה';
    case 'GAME': return 'משחק לימוד';
    case 'UPCOMING_TEST': return 'מבחן קרוב';
    default: return 'חומר למידה';
  }
};

const getTypeGradient = (type: string) => {
  switch (type) {
    case 'LESSON_PLAN': return 'from-indigo-50 to-violet-50 border-indigo-100';
    case 'EXAM_CHECK': return 'from-emerald-50 to-teal-50 border-emerald-100';
    case 'SUMMARY': return 'from-blue-50 to-sky-50 border-blue-100';
    case 'PRACTICE': return 'from-purple-50 to-fuchsia-50 border-purple-100';
    case 'TEST': return 'from-orange-50 to-amber-50 border-orange-100';
    case 'ASSIGNMENT': return 'from-rose-50 to-pink-50 border-rose-100';
    default: return 'from-gray-50 to-slate-50 border-gray-100';
  }
};

const LessonPlanPreview: React.FC<{ plan: LessonPlan }> = ({ plan }) => (
  <div className="space-y-6">
    {plan.objectives && plan.objectives.length > 0 && (
      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
        <h4 className="font-black text-indigo-900 mb-3 text-base flex items-center gap-2">
          <CheckCircle size={16} className="text-indigo-500" /> מטרות השיעור
        </h4>
        <ul className="space-y-1.5 pr-4">
          {plan.objectives.map((obj, i) => (
            <li key={i} className="text-indigo-700 font-medium text-sm flex items-start gap-2">
              <span className="text-indigo-400 font-black shrink-0 mt-0.5">{i + 1}.</span>
              <span>{obj}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
    {plan.introduction && (
      <div>
        <h4 className="font-black text-gray-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full inline-block"></span> פתיחה
        </h4>
        <LatexRenderer text={plan.introduction} />
      </div>
    )}
    {plan.mainContent && (
      <div>
        <h4 className="font-black text-gray-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full inline-block"></span> תוכן עיקרי
        </h4>
        <LatexRenderer text={plan.mainContent} />
      </div>
    )}
    {plan.activity && (
      <div>
        <h4 className="font-black text-gray-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-500 rounded-full inline-block"></span> פעילות
        </h4>
        <LatexRenderer text={plan.activity} />
      </div>
    )}
    {plan.summary && (
      <div>
        <h4 className="font-black text-gray-700 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
          <span className="w-1 h-5 bg-emerald-500 rounded-full inline-block"></span> סיכום
        </h4>
        <LatexRenderer text={plan.summary} />
      </div>
    )}
    {plan.homework && (
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
        <h4 className="font-black text-amber-900 mb-2 text-sm flex items-center gap-2">
          <PenTool size={14} className="text-amber-500" /> שיעורי בית
        </h4>
        <p className="text-amber-800 font-medium text-sm">{plan.homework}</p>
      </div>
    )}
    {plan.resourcesNeeded && plan.resourcesNeeded.length > 0 && (
      <div>
        <h4 className="font-black text-gray-600 text-xs uppercase tracking-wider mb-2">משאבים נדרשים</h4>
        <div className="flex flex-wrap gap-2">
          {plan.resourcesNeeded.map((r, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">{r}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const QuestionsPreview: React.FC<{ questions: Question[] }> = ({ questions }) => (
  <div className="space-y-4">
    {questions.map((q, i) => (
      <div key={q.id || i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <span className="shrink-0 w-7 h-7 bg-primary text-white rounded-xl flex items-center justify-center font-black text-sm">{i + 1}</span>
          <div className="flex-1">
            <LatexRenderer text={q.text} className="text-gray-800 font-medium" />
          </div>
        </div>
        {q.type !== 'OPEN' && q.options && q.options.length > 0 && (
          <div className="grid gap-2 pr-10">
            {q.options.map((opt, oi) => (
              <div
                key={oi}
                className={`p-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  oi === q.correctIndex
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-gray-50 border-transparent text-gray-600'
                }`}
              >
                <span className="font-black ml-2 text-xs">{String.fromCharCode(65 + oi)}.</span>
                {opt}
                {oi === q.correctIndex && (
                  <CheckCircle size={14} className="inline mr-1 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        )}
        {q.modelAnswer && (
          <div className="mt-3 pr-10 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <span className="text-xs font-black text-emerald-600 block mb-1">תשובה מודל</span>
            <p className="text-sm text-emerald-800 font-medium">{q.modelAnswer}</p>
          </div>
        )}
      </div>
    ))}
  </div>
);

const ContentPreviewModal: React.FC<ContentPreviewModalProps> = ({ item, onClose, onOpenForEditing }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const renderContent = () => {
    const details = item.details;

    if (item.type === 'LESSON_PLAN' && details && typeof details === 'object' && details.objectives) {
      return <LessonPlanPreview plan={details as LessonPlan} />;
    }

    const questions: Question[] | null =
      (details?.questions && details.questions.length > 0) ? details.questions :
      (Array.isArray(details) && details.length > 0 && details[0]?.text) ? details :
      null;

    if ((item.type === 'PRACTICE' || item.type === 'TEST') && questions) {
      return <QuestionsPreview questions={questions} />;
    }

    const textContent: string =
      (typeof details === 'string' && details.trim()) ? details :
      (details?.content && typeof details.content === 'string') ? details.content :
      item.content || '';

    if (textContent) {
      return <LatexRenderer text={textContent} />;
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen size={48} className="text-gray-200 mb-4" />
        <p className="text-gray-400 font-bold">אין תצוגה מקדימה זמינה לחומר זה.</p>
        {onOpenForEditing && (
          <button
            onClick={() => onOpenForEditing(item)}
            className="mt-4 text-primary font-black text-sm underline"
          >
            פתח לעריכה לצפייה מלאה
          </button>
        )}
      </div>
    );
  };

  const gradient = getTypeGradient(item.type);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-[2rem] shadow-2xl shadow-black/20 animate-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className={`shrink-0 bg-gradient-to-l ${gradient} border-b px-6 py-5`}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm shrink-0">
              {getTypeIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {getTypeName(item.type)}
                </span>
              </div>
              <h2 className="text-xl font-black text-gray-900 leading-snug line-clamp-2">{item.title}</h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-bold text-gray-500">
                <span className="flex items-center gap-1">
                  <BookOpen size={11} /> {item.subject}
                </span>
                <span className="flex items-center gap-1">
                  <GraduationCap size={11} /> {item.grade}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {new Date(item.timestamp).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-xl transition-all"
              title="סגור"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 bg-gray-50/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-black text-sm hover:bg-white transition-all"
          >
            סגור
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 transition-all"
              title="הדפסה"
            >
              <Printer size={16} />
            </button>
            {onOpenForEditing && (
              <button
                onClick={() => { onClose(); onOpenForEditing(item); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-sm"
              >
                <ExternalLink size={15} />
                פתח לעריכה
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentPreviewModal;
