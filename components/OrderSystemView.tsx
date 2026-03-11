import React, { useState } from 'react';
import { Check, Zap, Star, Crown, ArrowRight, ShieldCheck, Globe, Layout, Database, Loader2, Sparkles, Info, Mail, Users, BookOpen, Presentation, FileText, Image, Brain, Library, ClipboardCheck } from 'lucide-react';
import { User } from '../types';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";


const PayPalErrorWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ isResolved, isRejected }] = usePayPalScriptReducer();


  if (isRejected) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-100 rounded-3xl text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <Info size={32} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900">שגיאה בטעינת PayPal</h3>
          <p className="text-gray-600 text-sm">לא הצלחנו לטעון את רכיב התשלומים. וודא שקוד ה-Client ID תקין ושהחיבור לאינטרנט יציב.</p>
        </div>
      </div>
    );
  }


  if (!isResolved) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-gray-500 font-medium">טוען אפשרויות תשלום...</p>
      </div>
    );
  }


  return <>{children}</>;
};


const OrderSystemView = () => {
  const [role, setRole] = useState<'STUDENT' | 'TEACHER' | 'SCHOOL'>('STUDENT');
  const [showPaypal, setShowPaypal] = useState(false);


  const rawPaypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const teacherPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID_TEACHER;
  const studentPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID_STUDENT;
  const classPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID_CLASS; // Assuming this might exist or will be added
  const paypalCurrency = import.meta.env.VITE_PAYPAL_CURRENCY || "ILS";
 
  const paypalClientId = rawPaypalClientId || "";


  const teacherBenefits = [
    { title: 'כיתות', free: 'עד 3 כיתות', pro: 'ללא הגבלה', icon: Globe, color: 'text-blue-500' },
    { title: 'בקשות AI יומיות', free: 'עד 10 בקשות ביום', pro: 'ללא הגבלה', icon: Zap, color: 'text-yellow-500' },
    { title: 'מחולל מערכי שיעור', free: 'אינפוגרפיקה בלבד', pro: 'אינפוגרפיקה + מצגות', icon: Layout, color: 'text-purple-500' },
    { title: 'מאגר חומרים', free: 'עד 5 תכנים למקצוע', pro: 'ללא הגבלה', icon: Database, color: 'text-green-500' }
  ];


  const studentBenefits = [
    { title: 'תרגולים יומיים', free: 'עד 5 תרגולים ביום', pro: 'ללא הגבלה', icon: Layout, color: 'text-blue-500' },
    { title: 'סיכומי שיעור', free: 'סיכום 1 ביום', pro: 'ללא הגבלה', icon: Database, color: 'text-green-500' },
    { title: 'הודעות ל-AI', free: 'עד 15 הודעות ביום', pro: 'ללא הגבלה', icon: Zap, color: 'text-yellow-500' },
    { title: 'הכנות למבחן', free: 'תוכנית 1 בשבוע', pro: 'ללא הגבלה', icon: Star, color: 'text-purple-500' }
  ];


  const classBenefits = [
    { title: 'מספר תלמידים', free: 'עד 5 תלמידים', pro: 'עד 40 תלמידים', icon: Users, color: 'text-blue-500' },
    { title: 'ניהול מורה', free: 'בסיסי', pro: 'מתקדם + אבחון', icon: ShieldCheck, color: 'text-green-500' },
    { title: 'דוחות התקדמות', free: 'שבועי', pro: 'זמן אמת', icon: Database, color: 'text-purple-500' },
    { title: 'תמיכה טכנית', free: 'מייל', pro: 'וואטסאפ VIP', icon: Zap, color: 'text-yellow-500' }
  ];


  const schoolBenefits = [
    { title: "כיתות דיגיטליות", desc: "יצירת כיתות, שיתוף חומרים וצ'אט כיתתי לניהול למידה שיתופי.", icon: Users, color: "text-blue-500" },
    { title: "מערכי שיעור ב-AI", desc: "יצירת מערכי שיעור מפורטים ומותאמים אישית בדקות ספורות.", icon: Presentation, color: "text-purple-500" },
    { title: "מטלות והגשות", desc: "שיתוף מטלות בקלות ובדיקה אוטומטית וחכמה עם AI.", icon: FileText, color: "text-green-500" },
    { title: "מצגות ואינפוגרפיקות", desc: "יצירת תוכן ויזואלי מרהיב ומקצועי בלחיצה אחת.", icon: Image, color: "text-orange-500" },
    { title: "תרגול חכם", desc: "תרגול מותאם אישית לכל תלמיד לפי רמתו וקצב התקדמותו.", icon: Brain, color: "text-indigo-500" },
    { title: "בודק מבחנים AI", desc: "סריקה ובדיקה אוטומטית של מבחנים פיזיים עם משוב מפורט לכל שאלה.", icon: ClipboardCheck, color: "text-red-500" },
    { title: "ספריית חומרים", desc: "ניהול ספריית חומרים מרכזית, מסודרת ונגישה לכלל הצוות.", icon: Library, color: "text-yellow-500" }
  ];


  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
 
  const benefits = isTeacher ? teacherBenefits : studentBenefits;
  const price = isTeacher ? '49' : '24';
  const roleName = isTeacher ? 'מורים' : 'תלמידים';
  const proDescription = isTeacher
    ? 'למורים מקצועיים שרוצים להצליח'
    : 'לתלמידים שרוצים להגיע להישגים הכי גבוהים';
   
  const mainDescription = isTeacher
    ? 'קבלו את כל הכלים שאתם צריכים כדי ללמד טוב יותר, לנהל כיתות ביעילות ולהכין חומרים בצורה חכמה יותר.'
    : 'קבלו את כל הכלים שאתם צריכים כדי ללמוד טוב יותר, מהר יותר ובצורה חכמה יותר.';


  return (
    <PayPalScriptProvider options={{
      clientId: paypalClientId || "sb",
      currency: paypalCurrency,
      vault: true,
      intent: "subscription",
      locale: "he_IL"
    }}>
      <div className="p-8 md:p-16 text-right space-y-16 animate-fade-in bg-slate-50/50" dir="rtl">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-black mb-4">
            <Sparkles size={16} />
            <span>הצטרפו למהפכת החינוך</span>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-tight">מחירון Lumdim <span className="text-primary">תשפ"ו</span></h1>
          <p className="text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed">{mainDescription}</p>
         
          {/* Filter */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {(['STUDENT', 'TEACHER', 'SCHOOL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setShowPaypal(false);
                }}
                className={`px-10 py-5 rounded-[2rem] font-black transition-all duration-300 flex items-center gap-3 ${
                  role === r
                    ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-105'
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {r === 'STUDENT' && <BookOpen size={20} />}
                {r === 'TEACHER' && <Presentation size={20} />}
                {r === 'SCHOOL' && <Globe size={20} />}
                {r === 'STUDENT' ? 'תלמיד' : r === 'TEACHER' ? 'מורה' : 'בית ספר'}
              </button>
            ))}
          </div>
        </div>


        {role !== 'SCHOOL' ? (
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl group-hover:bg-slate-100 transition-colors" />
             
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-slate-900">התוכנית החינמית</h2>
                  <p className="text-slate-400 font-bold">ל{roleName} בתחילת הדרך</p>
                </div>
               
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-slate-900">₪0</span>
                  <span className="text-xl font-bold text-slate-400">/ חודש</span>
                </div>
               
                <div className="h-px bg-slate-100 w-full" />


                <ul className="grid gap-6">
                  {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <benefit.icon size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-700">{benefit.title}</p>
                        <p className="text-sm text-slate-400 font-bold">{benefit.free}</p>
                      </div>
                    </li>
                  ))}
                </ul>


                <button
                  className="w-full py-6 rounded-2xl font-black bg-slate-100 text-slate-400 cursor-default text-lg"
                >
                  התוכנית הבסיסית
                </button>
              </div>
            </div>


            {/* Pro Plan */}
            <div className="bg-slate-900 rounded-[3rem] p-12 border-4 border-primary shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 left-0 bg-primary text-white px-8 py-3 rounded-br-[2rem] font-black flex items-center gap-2 z-20 shadow-lg">
                <Crown size={20} />
                מומלץ ביותר
              </div>
             
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
             
              <div className="relative z-10 space-y-10">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white">Lumdim Pro</h2>
                  <p className="text-slate-400 font-bold">{proDescription}</p>
                </div>


                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-white">₪{price}</span>
                    <span className="text-xl font-bold text-slate-400">/ חודש</span>
                  </div>
                  <div className="bg-primary/20 text-primary text-sm font-black px-5 py-2.5 rounded-2xl inline-flex items-center gap-2 border border-primary/30">
                    <Sparkles size={16} />
                    <span>14 ימי ניסיון חינם - התחילו עכשיו ובטלו בכל עת</span>
                  </div>
                </div>


                <div className="h-px bg-white/10 w-full" />
               
                <ul className="grid gap-6">
                  {benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary">
                        <benefit.icon size={20} />
                      </div>
                      <div>
                        <p className="font-black text-white">{benefit.title}</p>
                        <p className="text-sm text-primary font-black">{benefit.pro}</p>
                      </div>
                    </li>
                  ))}
                </ul>


                {showPaypal && paypalClientId ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <PayPalErrorWrapper>
                      <PayPalButtons
                        style={{
                          layout: "vertical",
                          shape: "rect",
                          label: "subscribe",
                          color: "gold"
                        }}
                        createSubscription={(data, actions) => {
                          const planId = isTeacher ? teacherPlanId : studentPlanId;
                          return actions.subscription.create({
                            plan_id: planId || ""
                          });
                        }}
                        onApprove={async (data, actions) => {
                          alert(`המינוי בוצע בהצלחה! התחבר למערכת כדי להפעיל את הגישה. מזהה מינוי: ${data.subscriptionID}`);
                        }}
                      />
                    </PayPalErrorWrapper>
                    <button
                      onClick={() => setShowPaypal(false)}
                      className="w-full mt-4 text-sm text-slate-500 hover:text-white font-black transition-colors"
                    >
                      ביטול וחזרה
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (paypalClientId) {
                        setShowPaypal(true);
                      } else {
                        alert('אנא התחבר למערכת כדי לשדרג ל-Pro');
                      }
                    }}
                    className="w-full py-6 rounded-2xl font-black shadow-2xl shadow-primary/40 transition-all flex items-center justify-center gap-3 bg-primary text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] text-xl"
                  >
                    <Zap size={24} />
                    <span>שדרג ל-Pro עכשיו</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 max-w-6xl mx-auto">
            <div id="contact" className="bg-white p-12 md:p-16 rounded-[4rem] border border-slate-100 text-center space-y-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center shadow-sm border border-primary/5">
                  <Globe size={48} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-black text-slate-900 leading-tight">Lumdim לבתי ספר וארגונים</h2>
                  <div className="text-xl font-bold text-primary max-w-2xl mx-auto leading-relaxed">
                    Lumdim נמצאת כרגע בהטמעה בבתי ספר נבחרים בלבד. פנו אלינו כדי להיות הראשונים שיוכלו להצטרף ברגע שנפתח את הרישום הרשמי דרך גפ"ן
                  </div>
                  <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                    הפתרון המקיף לניהול למידה חכמה בבית הספר. אנו מציעים חבילות מותאמות אישית למוסדות חינוך הכוללות ליווי פדגוגי צמוד וכלים מתקדמים לצוות ההוראה.
                  </p>
                </div>
              </div>


              {/* School Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
                {schoolBenefits.map((benefit, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                    <div className={`w-12 h-12 ${benefit.color} bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                      <benefit.icon size={24} />
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-1">{benefit.title}</h4>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">{benefit.desc}</p>
                  </div>
                ))}
              </div>


              <div className="flex flex-col items-center gap-6 pt-8 border-t border-slate-100">
                <div className="text-slate-400 font-bold text-lg">מעוניינים בפרטים נוספים והצטרפות?</div>
                <a href="mailto:info@lumdim.app" className="inline-flex items-center gap-4 text-3xl font-black text-primary hover:text-blue-700 bg-slate-50 px-12 py-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:scale-105 group">
                  <Mail size={32} className="group-hover:rotate-12 transition-transform" />
                  info@lumdim.app
                </a>
                <p className="text-slate-400 font-bold">נחזור אליכם תוך פחות מ-24 שעות</p>
              </div>
            </div>




          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};


export default OrderSystemView;
