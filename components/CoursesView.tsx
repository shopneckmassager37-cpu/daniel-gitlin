
import React, { useEffect, useState } from 'react';
import { Subject, Grade, StudyTopic, EnrolledCourse, DailyLesson } from '../types';
import { getCourseTopics, generateLessonContent } from '../services/geminiService';
import LatexRenderer from './LatexRenderer';
import { Loader2, Calendar, GraduationCap, Play, CheckCircle, BookOpen, Youtube, Lightbulb, ArrowRight, Trophy, Clock, ArrowLeft } from 'lucide-react';

interface CoursesViewProps {
  subject: Subject;
  grade: Grade;
}

const CoursesView: React.FC<CoursesViewProps> = ({ subject, grade }) => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'MY_COURSES'>('CATALOG');
  const [catalog, setCatalog] = useState<StudyTopic[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeLessonDay, setActiveLessonDay] = useState<number | null>(null);
  const [lessonContent, setLessonContent] = useState<DailyLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [lessonQuizAnswered, setLessonQuizAnswered] = useState<number | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      const data = await getCourseTopics(subject, grade);
      setCatalog(data);
    };
    fetchCatalog();
  }, [subject, grade]);

  useEffect(() => {
    const saved = localStorage.getItem('enrolled_courses');
    if (saved) {
      try {
        setEnrolledCourses(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveEnrollment = (courses: EnrolledCourse[]) => {
    setEnrolledCourses(courses);
    localStorage.setItem('enrolled_courses', JSON.stringify(courses));
  };

  const handleEnroll = (topic: StudyTopic) => {
    const existing = enrolledCourses.find(c => c.title === topic.title && c.subject === subject);
    if (existing) { setActiveCourseId(existing.id); setActiveTab('MY_COURSES'); return; }
    const newCourse: EnrolledCourse = { id: Date.now().toString(), title: topic.title, description: topic.description, subject: subject, totalDays: 5, completedDays: [], currentDay: 1, lastAccessed: Date.now() };
    const updated = [...enrolledCourses, newCourse];
    saveEnrollment(updated);
    setActiveCourseId(newCourse.id);
    setActiveTab('MY_COURSES');
  };

  const handleOpenLesson = async (courseId: string, day: number) => {
    setActiveCourseId(courseId);
    setActiveLessonDay(day);
    setLessonContent(null);
    setLessonQuizAnswered(null);
    setLoadingLesson(true);
    const course = enrolledCourses.find(c => c.id === courseId);
    if (course) {
        const content = await generateLessonContent(subject, grade, course.title, day);
        setLessonContent(content);
    }
    setLoadingLesson(false);
  };

  const handleCompleteLesson = () => {
    if (!activeCourseId || !activeLessonDay) return;
    const updatedCourses = enrolledCourses.map(c => {
      if (c.id === activeCourseId) {
        const isNewDay = !c.completedDays.includes(activeLessonDay);
        const newCompleted = isNewDay ? [...c.completedDays, activeLessonDay] : c.completedDays;
        let nextDay = c.currentDay;
        if (activeLessonDay === c.currentDay && activeLessonDay < c.totalDays) nextDay = activeLessonDay + 1;
        return { ...c, completedDays: newCompleted, currentDay: nextDay, lastAccessed: Date.now() };
      }
      return c;
    });
    saveEnrollment(updatedCourses);
    setActiveLessonDay(null);
  };

  if (activeCourseId && activeLessonDay && (loadingLesson || lessonContent)) {
    const course = enrolledCourses.find(c => c.id === activeCourseId);
    return (
      <div className="bg-white min-h-[calc(100vh-140px)] rounded-3xl shadow-xl overflow-hidden flex flex-col animate-fade-in relative">
        <div className="bg-gray-900 text-white p-6 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setActiveLessonDay(null)} className="p-2 hover:bg-white/10 rounded-full"><ArrowRight size={24} /></button>
                <div><h2 className="font-bold text-lg md:text-xl line-clamp-1">{course?.title}</h2><p className="text-yellow-400 text-sm font-medium">יום {activeLessonDay}</p></div>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-full text-xs font-bold">{Math.round(((activeLessonDay - 1) / 5) * 100)}</div>
        </div>
        {loadingLesson ? <div className="flex-1 flex flex-col items-center justify-center p-12"><Loader2 className="animate-spin text-primary mb-4" size={48} /><h3 className="text-xl font-bold text-gray-800">מכין את השיעור...</h3></div> : (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 bg-gray-50">
                <div className="text-center max-w-3xl mx-auto"><div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-full mb-4"><BookOpen size={32} /></div><h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{lessonContent?.title}</h1></div>
                <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-lg text-gray-800"><LatexRenderer text={lessonContent?.content || ""} /></div>
                <div className="max-w-3xl mx-auto bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-2xl border border-yellow-100 flex items-start gap-4"><Lightbulb className="text-yellow-500 shrink-0 mt-1" size={24} /><div><h4 className="font-bold text-yellow-800 mb-1">הידעת?</h4><p className="text-yellow-700">{lessonContent?.funFact}</p></div></div>
                <div className="max-w-3xl mx-auto"><h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">בדיקת הבנה מהירה</h3><div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200"><h4 className="text-xl font-medium mb-6"><LatexRenderer text={lessonContent?.quiz.question || ""} /></h4><div className="space-y-3">{lessonContent?.quiz.options.map((option, idx) => {
                                const isCorrect = idx === lessonContent?.quiz.correctIndex;
                                const isSelected = idx === lessonQuizAnswered;
                                let btnClass = "border-gray-200 hover:bg-gray-50";
                                if (lessonQuizAnswered !== null) { if (isCorrect) btnClass = "bg-green-100 border-green-300 text-green-800"; else if (isSelected) btnClass = "bg-red-100 border-red-300 text-red-800"; else btnClass = "opacity-50"; }
                                return ( <button key={idx} onClick={() => setLessonQuizAnswered(idx)} disabled={lessonQuizAnswered !== null} className={`w-full p-4 rounded-xl border-2 text-right transition-all font-medium flex justify-between items-center ${btnClass}`}><LatexRenderer text={option} />{lessonQuizAnswered !== null && isCorrect && <CheckCircle size={20} className="text-green-600" />}</button> )
                            })}</div></div></div>
                <div className="max-w-3xl mx-auto pb-10"><button onClick={handleCompleteLesson} disabled={lessonQuizAnswered === null} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-xl shadow-lg transition-all flex items-center justify-center gap-3"><span>סיימתי את השיעור!</span><Trophy size={24} className={lessonQuizAnswered !== null ? 'text-yellow-400 animate-bounce' : 'text-gray-400'} /></button></div>
            </div>
        )}
      </div>
    );
  }

  if (activeCourseId) {
    const course = enrolledCourses.find(c => c.id === activeCourseId);
    if (!course) return <div>Course not found</div>;
    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-20"><button onClick={() => setActiveCourseId(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"><ArrowRight size={20} />חזרה לקורסים שלי</button>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"><div><h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1><p className="text-gray-500 max-w-xl">{course.description}</p><div className="mt-4 flex items-center gap-4"><div className="w-full max-w-[200px] h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{ width: `${(course.completedDays.length / course.totalDays) * 100}%` }}></div></div><span className="text-sm font-bold text-gray-600">{course.completedDays.length}/5</span></div></div><div className="bg-yellow-100 p-4 rounded-2xl text-yellow-700"><Trophy size={40} /></div></div>
            <div className="space-y-4">{[1, 2, 3, 4, 5].map((day) => {
                    const isCompleted = course.completedDays.includes(day);
                    const isLocked = day > course.currentDay && !isCompleted;
                    const isCurrent = day === course.currentDay;
                    return ( <div key={day} className={`relative flex items-center gap-6 p-6 rounded-2xl border-2 transition-all ${isLocked ? 'bg-gray-50 border-gray-100 opacity-70' : isCurrent ? 'bg-white border-blue-500 shadow-md transform scale-[1.02]' : 'bg-white border-gray-200'}`}><div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${isCompleted ? 'bg-green-100 text-green-700' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{isCompleted ? <CheckCircle size={32} /> : day}</div><div className="flex-1"><h3 className={`text-lg font-bold ${isLocked ? 'text-gray-400' : 'text-gray-900'}`}>יום {day}: {getDayTitle(day, course.title)}</h3><p className="text-sm text-gray-500">{getDayDescription(day)}</p></div><button onClick={() => !isLocked && handleOpenLesson(course.id, day)} disabled={isLocked} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${isLocked ? 'bg-gray-100 text-gray-400' : isCompleted ? 'bg-green-50 text-green-700' : 'bg-blue-600 text-white shadow-lg'}`}>{isCompleted ? 'חזור' : <Play size={18} />}{isLocked ? 'נעול' : isCompleted ? 'בוצע' : 'התחל'}</button></div> );
                })}</div>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20"><div className="flex justify-center mb-8"><div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 inline-flex"><button onClick={() => setActiveTab('CATALOG')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'CATALOG' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>קטלוג קורסים</button><button onClick={() => setActiveTab('MY_COURSES')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'MY_COURSES' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>הלמידה שלי{enrolledCourses.length > 0 && <span className="bg-yellow-400 text-black text-[10px] px-1.5 py-0.5 rounded-full">{enrolledCourses.length}</span>}</button></div></div>
      {activeTab === 'MY_COURSES' ? ( enrolledCourses.length === 0 ? <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300"><div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><BookOpen size={40} /></div><h3 className="text-xl font-bold text-gray-800 mb-2">לא נרשמת לקורסים עדיין</h3><button onClick={() => setActiveTab('CATALOG')} className="text-primary font-bold hover:underline">עבור לקטלוג</button></div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{enrolledCourses.map((course) => ( <button key={course.id} onClick={() => setActiveCourseId(course.id)} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all text-right group relative overflow-hidden"><div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform origin-top-right"></div><div className="relative z-10"><div className="flex justify-between items-start mb-4"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{course.subject}</span>{course.completedDays.length === course.totalDays && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> הושלם</span>}</div><h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{course.title}</h3><div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4"><div className="bg-blue-500 h-full transition-all" style={{ width: `${(course.completedDays.length / course.totalDays) * 100}%` }}></div></div><div className="flex justify-between items-center mt-2"><span className="text-xs text-gray-400">{new Date(course.lastAccessed).toLocaleDateString('he-IL')}</span><span className="text-sm font-bold text-primary flex items-center gap-1">המשך <ArrowLeft size={16} /></span></div></div></button> ))}</div> ) : ( <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{catalog.map((course, idx) => ( <button key={idx} onClick={() => handleEnroll(course)} className={`group text-right relative rounded-3xl p-1 transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 shadow-sm hover:shadow-xl border border-gray-100`}><div className="bg-white rounded-[20px] p-6 h-full flex flex-col relative overflow-hidden"><div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-2xl bg-blue-50 text-blue-600`}><GraduationCap size={24} /></div></div><h3 className={`text-xl font-bold mb-2 line-clamp-2 text-gray-900`}>{course.title}</h3><p className="text-sm text-gray-500 mb-6 line-clamp-3">{course.description}</p><div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between"><span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock size={12} />5 ימים</span><span className={`text-sm font-bold flex items-center gap-1 text-primary`}>הרשם לקורס<ArrowLeft size={16} /></span></div></div></button> ))}</div> )}
    </div>
  );
};

function getDayTitle(day: number, courseTitle: string): string { const titles = ["יסודות ומבוא", "מעמיקים בחומר", "יישום מעשי", "חשיבה ביקורתית", "סיכום ומבחן"]; return titles[day - 1] || `שיעור ${day}`; }
function getDayDescription(day: number): string { const descs = ["נכיר את המושגים הבסיסיים.", "נצלול לעומק התיאוריה.", "נראה דוגמאות מהעולם האמיתי.", "נאתגר את עצמנו.", "נחזור על הכל."]; return descs[day - 1] || ""; }

export default CoursesView;
