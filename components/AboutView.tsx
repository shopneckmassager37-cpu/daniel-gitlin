import React from 'react';
import { Brain, Target, Users, Zap, BookOpen, Sparkles, ShieldCheck, Globe, Presentation, FileText, Image, Library, ClipboardCheck } from 'lucide-react';


const AboutView = () => (
  <div className="p-12 text-right space-y-16 animate-fade-in" dir="rtl">
    {/* Hero Section */}
    <div className="text-center space-y-6 max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-black mb-4">
        <Sparkles size={16} />
        <span>העתיד של הלמידה כבר כאן</span>
      </div>
      <h1 className="text-6xl font-black text-slate-900 leading-tight">
        לכל תלמיד מגיעה הזכות <span className="text-primary">להצליח</span>
      </h1>
      <p className="text-2xl text-slate-600 font-medium leading-relaxed">
        Lumdim היא פלטפורמה חכמה ופורצת דרך ללימוד, תרגול ואבחון, המבוססת על בינה מלאכותית מתקדמת.
      </p>
    </div>


    {/* AI-Focused Features Section */}
    <div className="grid md:grid-cols-3 gap-8">
      {[
        {
          title: "כיתות דיגיטליות",
          desc: "יצירת כיתות, שיתוף חומרים וצ'אט כיתתי לניהול למידה שיתופי.",
          icon: Users,
          bg: "bg-blue-50",
          text: "text-blue-600"
        },
        {
          title: "מערכי שיעור ב-AI",
          desc: "יצירת מערכי שיעור מפורטים ומותאמים אישית בדקות ספורות.",
          icon: Presentation,
          bg: "bg-purple-50",
          text: "text-purple-600"
        },
        {
          title: "מטלות והגשות",
          desc: "שיתוף מטלות בקלות ובדיקה אוטומטית וחכמה עם AI.",
          icon: FileText,
          bg: "bg-green-50",
          text: "text-green-600"
        },
        {
          title: "מצגות ואינפוגרפיקות",
          desc: "יצירת תוכן ויזואלי מרהיב ומקצועי בלחיצה אחת.",
          icon: Image,
          bg: "bg-orange-50",
          text: "text-orange-600"
        },
        {
          title: "בודק מבחנים AI",
          desc: "סריקה ובדיקה אוטומטית של מבחנים פיזיים עם משוב מפורט לכל שאלה.",
          icon: ClipboardCheck,
          bg: "bg-red-50",
          text: "text-red-600"
        },
        {
          title: "תרגול חכם",
          desc: "תרגול מותאם אישית לכל תלמיד לפי רמתו וקצב התקדמותו.",
          icon: Brain,
          bg: "bg-indigo-50",
          text: "text-indigo-600"
        },
        {
          title: "ספריית חומרים",
          desc: "ניהול ספריית חומרים מרכזית, מסודרת ונגישה לכלל הצוות.",
          icon: Library,
          bg: "bg-yellow-50",
          text: "text-yellow-600"
        }
      ].map((item, i) => (
        <div key={i} className={`${item.bg} p-8 rounded-[2.5rem] space-y-4 transition-all hover:scale-[1.02] border border-white shadow-sm`}>
          <div className={`w-16 h-16 bg-white ${item.text} rounded-3xl flex items-center justify-center shadow-md`}>
            <item.icon size={32} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{item.title}</h3>
          <p className="text-slate-600 leading-relaxed font-medium text-lg">{item.desc}</p>
        </div>
      ))}
    </div>


    {/* Detailed Sections */}
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-900">מה המורה מקבל?</h2>
          <p className="text-lg text-slate-600 font-medium">הכלי העוצמתי ביותר לניהול למידה בכיתה המודרנית.</p>
        </div>
        <div className="grid gap-4">
          {[
            'יצירת שאלות תרגול מקוריות על ידי AI',
            'בדיקת מבחנים אוטומטית עם סורק חכם',
            'מעקב אחר התקדמות וביצועי תלמידים',
            'יצירת מערכי שיעור ומצגות בלחיצת כפתור',
            'צ\'אט בוט פדגוגי לליווי המורה והתלמיד'
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} />
              </div>
              <span className="font-bold text-slate-700">{text}</span>
            </div>
          ))}
        </div>
      </div>
     
      <div className="bg-slate-900 rounded-[3rem] p-12 text-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-black">מה התלמיד מקבל?</h2>
            <p className="text-lg text-slate-400 font-medium">חווית למידה שמרגישה כמו משחק, אבל מלמדת באמת.</p>
          </div>
          <div className="grid gap-6">
            {[
              { title: 'מערכת חכמה', desc: 'שמכירה את נקודות החוזק והחולשה שלך', icon: Globe },
              { title: 'משוב אישי', desc: 'הסברים מפורטים לאחר כל טעות', icon: Sparkles },
              { title: 'קביעת יעדים', desc: 'מסלול התקדמות אישי להצלחה במבחנים', icon: Target },
              { title: 'שיפור מיומנויות', desc: 'פיתוח חשיבה עצמאית וביטחון עצמי', icon: Brain }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon size={24} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-black text-lg">{item.title}</h4>
                  <p className="text-slate-400 text-sm font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>


    {/* Quote Section */}
    <div className="bg-primary/5 rounded-[3rem] p-16 text-center space-y-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 p-8 opacity-10">
        <BookOpen size={120} />
      </div>
      <p className="text-3xl font-black text-slate-900 italic leading-tight max-w-4xl mx-auto">
        "לכל תלמיד מגיעה הזכות לטעות מבלי לחשוש, והזכות להצליח מתוך ביטחון."
      </p>
      <div className="w-20 h-1 bg-primary mx-auto rounded-full" />
      <p className="text-xl text-slate-600 font-bold">החזון של Lumdim</p>
    </div>
  </div>
);


export default AboutView;
