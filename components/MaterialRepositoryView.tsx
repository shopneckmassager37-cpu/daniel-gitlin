
import React, { useMemo, useState } from 'react';
import { HistoryItem, Subject } from '../types.ts';
import { Trash2, FolderOpen, ArrowRight, ChevronLeft, FileText, ClipboardCheck, Sparkles, LayoutTemplate, Clock, Search, BookOpen, GraduationCap, Plus } from 'lucide-react';
import LatexRenderer from './LatexRenderer.tsx';

interface MaterialRepositoryViewProps {
  history: HistoryItem[];
  onBack: () => void;
  onOpenItem: (item: HistoryItem) => void;
  onCreateNew: () => void;
  onDeleteItem?: (id: string) => void;
}

const MaterialRepositoryView: React.FC<MaterialRepositoryViewProps> = ({ history, onBack, onOpenItem, onCreateNew, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');

  const filteredHistory = useMemo(() => {
    const baseSubjects = [
      Subject.MATH, Subject.HEBREW, Subject.ENGLISH, Subject.SCIENCE,
      Subject.HISTORY, Subject.GEOGRAPHY, Subject.BIBLE, Subject.CIVICS
    ];
    return history.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesSubject = selectedSubject === 'ALL';
      if (!matchesSubject) {
        if (selectedSubject === Subject.OTHER) {
          // Match if item subject is not in base subjects
          matchesSubject = !baseSubjects.includes(item.subject as Subject);
        } else {
          matchesSubject = item.subject === selectedSubject;
        }
      }
      
      return matchesSearch && matchesSubject;
    });
  }, [history, searchTerm, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {};
    filteredHistory.forEach(item => {
      if (!groups[item.subject]) groups[item.subject] = [];
      groups[item.subject].push(item);
    });
    return groups;
  }, [filteredHistory]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LESSON_PLAN': return <LayoutTemplate size={20} className="text-indigo-500" />;
      case 'EXAM_CHECK': return <ClipboardCheck size={20} className="text-emerald-500" />;
      case 'SUMMARY': return <FileText size={20} className="text-blue-500" />;
      case 'PRACTICE': return <Sparkles size={20} className="text-purple-500" />;
      default: return <BookOpen size={20} className="text-gray-400" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'LESSON_PLAN': return 'מערך שיעור';
      case 'EXAM_CHECK': return 'בדיקת מבחן';
      case 'SUMMARY': return 'סיכום לימודי';
      case 'PRACTICE': return 'תרגול כיתתי';
      default: return 'חומר למידה';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in pb-20 text-right" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 md:mb-12">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onBack}
            className="p-2 md:p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
          >
            <ArrowRight className="text-gray-600 w-4 h-4 md:w-5 md:h-5" />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">מאגר חומרים פדגוגי</h2>
            <p className="text-sm md:text-base text-gray-500 font-bold">כל החומרים שייצרת מאורגנים לפי מקצוע</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 flex-1 max-w-2xl">
           <div className="relative flex-1 w-full">
             <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="חיפוש חומרים..." 
              className="w-full p-3 md:p-4 pr-10 md:pr-12 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 ring-primary/20 transition-all font-bold text-sm md:text-base"
             />
             <Search className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4.5 h-4.5 md:w-5 md:h-5" />
           </div>
           <div className="flex gap-2 w-full sm:w-auto">
             <select 
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value as any)}
              className="p-3 md:p-4 bg-white border border-gray-200 rounded-2xl shadow-sm font-black text-gray-700 outline-none cursor-pointer flex-1 sm:w-40 text-sm"
             >
               <option value="ALL">כל המקצועות</option>
               {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <button 
               onClick={onCreateNew}
               className="bg-primary text-white p-3 md:p-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2 whitespace-nowrap font-black text-sm"
             >
               <Plus size={18} />
               <span className="hidden xs:inline">העלאת תוכן</span>
               <span className="xs:hidden">העלאה</span>
             </button>
           </div>
        </div>
      </div>

      {Object.keys(groupedBySubject).length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center flex flex-col items-center">
            <FolderOpen size={64} className="text-gray-200 mb-6" />
            <h3 className="text-2xl font-black text-gray-800 mb-2">המאגר ריק כרגע</h3>
            <p className="text-gray-400 font-bold max-w-sm">התחל לייצר מערכי שיעור, לבדוק מבחנים או להעלות חומרים לכיתות - והם יופיעו כאן אוטומטית.</p>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Added explicit comparator to sort() to ensure stable behavior and resolve potential parameter issues */}
          {(Object.entries(groupedBySubject) as [string, HistoryItem[]][]).sort((entryA, entryB) => entryA[0].localeCompare(entryB[0])).map(([subject, items]) => (
            <section key={subject} className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 px-4">
                <div className="bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 border-b-4 border-blue-100 pb-1">{subject}</h3>
                <span className="text-xs font-black text-gray-400 mr-2 bg-gray-100 px-2 py-0.5 rounded-full">{items.length} פריטים</span>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Changed parameter names from 'a,b' to 'itemA,itemB' and added types to resolve reported scope/not-found issues */}
                {items.slice().sort((itemA: HistoryItem, itemB: HistoryItem) => itemB.timestamp - itemA.timestamp).map((item) => (
                  <div 
                    key={item.id}
                    className="group bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-50 hover:shadow-xl hover:-translate-y-1 transition-all text-right flex flex-col h-full relative"
                  >
                    <div className="flex justify-between items-start mb-4 md:mb-6">
                       <div className="bg-gray-50 p-3 md:p-4 rounded-xl md:rounded-2xl group-hover:bg-blue-50 transition-all">
                         {getTypeIcon(item.type)}
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">{getTypeName(item.type)}</span>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             if (onDeleteItem) onDeleteItem(item.id);
                           }}
                           className="p-1.5 md:p-2 text-gray-300 hover:text-red-500 transition-colors"
                           title="מחק"
                         >
                           <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                         </button>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => onOpenItem(item)}
                      className="flex-1 text-right"
                    >
                      <h4 className="text-lg md:text-xl font-black text-gray-800 mb-2 md:mb-3 group-hover:text-primary transition-colors line-clamp-2">{item.title}</h4>
                    </button>
                    
                    <div className="mt-auto pt-4 md:pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] md:text-xs font-bold text-gray-400">
                       <div className="flex items-center gap-3 md:gap-4">
                         <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                           <span>{new Date(item.timestamp).toLocaleDateString('he-IL')}</span>
                         </div>
                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 md:py-1 rounded-lg text-gray-400 group-hover:text-indigo-500 transition-colors">
                            <GraduationCap className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            <span>{item.grade}</span>
                         </div>
                       </div>
                       <button 
                         onClick={() => onOpenItem(item)}
                         className="flex items-center gap-1 text-primary opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <span>צפייה</span>
                         <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialRepositoryView;
