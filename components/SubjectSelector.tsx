
import React, { useState } from 'react';
import { Subject, Grade } from '../types.ts';
import { Calculator, Book, Globe, FlaskConical, ScrollText, Map, Library, Scale, School, ChevronLeft, Plus, Sparkles, X, Languages, Palette, Music, Microscope, Atom, Cpu, Dumbbell, Theater, Landmark, HelpCircle, PenTool } from 'lucide-react';

interface SubjectSelectorProps {
  mode: 'GRADE_SELECTION' | 'SUBJECT_SELECTION';
  selectedSubject: Subject | string | null;
  selectedGrade: Grade | null;
  userName?: string | null;
  onSelectSubject: (s: Subject | string) => void;
  onSelectGrade: (g: Grade) => void;
  isPro?: boolean;
  onProClick?: () => void;
  isTeacher?: boolean;
  userSubjects: (Subject | string)[];
  onAddSubject?: (s: string) => void;
  aiRequestsToday?: number;
}

const getSubjectIcon = (subjectName: string) => {
  const name = subjectName.toLowerCase();
  
  // Hardcoded defaults
  if (subjectName === Subject.MATH) return <Calculator className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.HEBREW) return <Book className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.ENGLISH) return <Globe className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.SCIENCE) return <FlaskConical className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.HISTORY) return <ScrollText className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.GEOGRAPHY) return <Map className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.BIBLE) return <Library className="w-8 h-8 md:w-10 md:h-10" />;
  if (subjectName === Subject.CIVICS) return <Scale className="w-8 h-8 md:w-10 md:h-10" />;

  // Dynamic Matching for Custom Subjects
  if (name.includes('ערבית') || name.includes('צרפתית') || name.includes('שפה') || name.includes('arabic')) return <Languages className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('אמנות') || name.includes('ציור') || name.includes('art')) return <Palette className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('מוזיקה') || name.includes('נגינה') || name.includes('music')) return <Music className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('ביולוגיה') || name.includes('biology')) return <Microscope className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('פיזיקה') || name.includes('physics')) return <Atom className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('מחשב') || name.includes('תכנות') || name.includes('cs') || name.includes('code')) return <Cpu className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('ספורט') || name.includes('חינוך גופני') || name.includes('sport')) return <Dumbbell className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('תיאטרון') || name.includes('משחק') || name.includes('theater')) return <Theater className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('פילוסופיה') || name.includes('philosophy')) return <HelpCircle className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('כלכלה') || name.includes('economics')) return <Landmark className="w-8 h-8 md:w-10 md:h-10" />;
  if (name.includes('ספרות') || name.includes('literature')) return <PenTool className="w-8 h-8 md:w-10 md:h-10" />;

  return <Sparkles className="w-8 h-8 md:w-10 md:h-10" />;
};

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  mode,
  selectedSubject,
  selectedGrade,
  userName,
  onSelectSubject,
  onSelectGrade,
  isPro,
  onProClick,
  isTeacher,
  userSubjects,
  onAddSubject,
  aiRequestsToday = 0
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const handleAdd = () => {
    if (newSubjectName.trim() && onAddSubject) {
      onAddSubject(newSubjectName.trim());
      setNewSubjectName('');
      setIsAdding(false);
    }
  };
  
  if (mode === 'GRADE_SELECTION' && !isTeacher) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in text-center">
        <div className="mb-10">
           <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <School className="text-primary w-10 h-10" />
           </div>
           <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">שלום {userName || 'תלמיד/ה'}!</h2>
           <p className="text-xl md:text-2xl text-gray-500 font-light">בחר כיתה כדי להתחיל</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
          {Object.values(Grade).filter(grade => grade !== Grade.NOT_DEFINED).map((grade) => (
            <button
              key={grade}
              onClick={() => onSelectGrade(grade)}
              className="group p-6 md:p-8 bg-white border-2 border-gray-100 rounded-[2rem] hover:border-primary hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              <span className="text-lg md:text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">{grade}</span>
              <div className="w-8 h-1 bg-gray-100 rounded-full group-hover:bg-primary transition-all group-hover:w-12" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">
          {isTeacher ? `מרחב העבודה של ${userName || 'המורה'} 📚` : (userName ? `היי ${userName} 👋` : `שלום כיתה ${selectedGrade}! 👋`)}
        </h2>
        <p className="text-xl text-gray-600 font-light mb-8">{isTeacher ? 'בחר מקצוע להכנת חומרים או תרגול' : 'איזה מקצוע נלמד עכשיו?'}</p>
        
        {/* AI Usage Status removed as per request */}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 lg:gap-12">
        {userSubjects.map((subject) => (
          <button
            key={subject}
            onClick={() => onSelectSubject(subject)}
            className="group relative bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-6 text-center overflow-hidden aspect-square"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50/60 to-transparent rounded-bl-[4rem] group-hover:scale-125 transition-transform" />
            
            <div className={`relative z-10 p-5 md:p-7 rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm shrink-0`}>
              {getSubjectIcon(subject)}
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xl md:text-2xl font-black text-gray-800 group-hover:text-primary transition-colors line-clamp-1">{subject}</h3>
            </div>
          </button>
        ))}

        {!isTeacher && (
           <div className="relative aspect-square">
            {isAdding ? (
              <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-2xl border-2 border-primary p-6 flex flex-col items-center justify-center gap-4 z-20 animate-fade-in">
                 <button onClick={() => setIsAdding(false)} className="absolute top-4 left-4 text-gray-400 hover:text-red-500"><X size={20}/></button>
                 <h4 className="font-black text-gray-900 text-lg">הוספת מקצוע</h4>
                 <input 
                   type="text" 
                   value={newSubjectName} 
                   onChange={(e) => setNewSubjectName(e.target.value)} 
                   placeholder="שם המקצוע..." 
                   className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary outline-none text-right font-bold"
                   onKeyDown={(e) => { if(e.key === 'Enter') handleAdd(); }}
                 />
                 <button 
                  onClick={handleAdd}
                  disabled={!newSubjectName.trim()}
                  className="w-full bg-primary text-white py-3 rounded-xl font-black shadow-lg hover:bg-blue-600 transition-all disabled:opacity-30"
                 >
                   הוסף מקצוע
                 </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full h-full group relative bg-gray-50 border-4 border-dashed border-gray-200 rounded-[2.5rem] hover:bg-white hover:border-primary hover:text-primary transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center overflow-hidden"
              >
                <div className="p-5 rounded-2xl bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-primary transition-all shadow-inner">
                  <Plus size={40} />
                </div>
                <span className="text-xl font-black text-gray-400 group-hover:text-primary">הוסף מקצוע</span>
              </button>
            )}
           </div>
        )}
      </div>
    </div>
  );
};

export default SubjectSelector;
