import React, { useState } from 'react';
import { GraduationCap, BookOpen, Presentation, LogIn, Mail, ArrowRight, Sparkles, Zap, Bot, ChevronLeft, UserPlus, X, Check } from 'lucide-react';
import { User as UserType, UserRole } from '../types';
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import PrivacyView from './PrivacyView';
import TermsOfUseView from './TermsOfUseView';


interface LoginViewProps {
  onLogin: (user: UserType) => void;
  onSchoolLogin: (code: string) => void;
  onShowPrivacy: () => void;
  onShowTerms: () => void;
  onOrderClick: () => void;
}


const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSchoolLogin, onShowPrivacy, onShowTerms, onOrderClick }) => {
  const { login, register } = useKindeAuth();
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [isSchoolMode, setIsSchoolMode] = useState(false);
  const [isValidatingSchool, setIsValidatingSchool] = useState(false);
  const [validatedSchool, setValidatedSchool] = useState<{code: string, name: string} | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isOver13, setIsOver13] = useState(false);
  const [showSchoolInfo, setShowSchoolInfo] = useState(false);


  const handleGuestLogin = (guestRole: UserRole) => {
    if (!agreedToTerms) {
      alert('יש לאשר את מדיניות הפרטיות ותנאי השימוש כדי להמשיך');
      return;
    }
    const guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
    const guestUser: UserType = {
      id: guestId,
      name: guestRole === 'TEACHER' ? 'מורה אורח' : 'תלמיד אורח',
      email: `guest_${guestRole.toLowerCase()}_${guestId}@lumdim.ai`,
      role: guestRole,
      provider: 'guest',
      isOver13: isOver13
    };
    onLogin(guestUser);
  };


  const handleRegister = () => {
    localStorage.setItem('pending_role', selectedRole);
    localStorage.setItem('pending_over_13', String(isOver13));
    register();
  };


  const handleLogin = () => {
    localStorage.setItem('pending_role', selectedRole);
    localStorage.setItem('pending_over_13', String(isOver13));
    login();
  };


  const handleSchoolLogin = async () => {
    if (!schoolCode.trim()) return;
    setIsValidatingSchool(true);
   
    try {
      const response = await fetch('/api/auth/validate-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: schoolCode.trim() })
      });


      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'קוד בית ספר לא תקין');
        return;
      }


      const { schoolName, schoolCode: validatedCode } = await response.json();
      setValidatedSchool({ code: validatedCode, name: schoolName });
    } catch (e) {
      console.error("School Validation Error:", e);
      alert("אירעה שגיאה באימות בית הספר. אנא נסה שוב מאוחר יותר.");
    } finally {
      setIsValidatingSchool(false);
    }
  };


  const handleSchoolAuth = (type: 'login' | 'register') => {
    if (!validatedSchool) return;
   
    // Store pending school info
    localStorage.setItem('pending_org_code', validatedSchool.code);
    localStorage.setItem('pending_org_name', validatedSchool.name);
    localStorage.setItem('pending_role', selectedRole);


    const authOptions: Record<string, string> = {
      org_code: validatedSchool.code
    };


    if (type === 'login') {
      login(authOptions);
    } else {
      register(authOptions);
    }
  };


  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans" dir="rtl">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[120px] opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>


      <div className="max-w-7xl w-full grid lg:grid-cols-[1.1fr_1fr] gap-16 lg:gap-24 items-center relative z-10">
        <div className="text-right space-y-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 text-primary rounded-2xl text-sm font-black shadow-sm border border-blue-100/50">
            <Sparkles size={20} className="text-blue-400" />
            <span>הפלטפורמה המובילה ללמידה חכמה</span>
          </div>
         
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                <GraduationCap size={36} />
              </div>
              <span className="text-4xl font-black text-primary tracking-tight">Lumdim</span>
            </div>
            <h1 className="text-7xl md:text-8xl font-black text-gray-900 leading-[1.1] tracking-tighter">
              הדרך שלך <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-blue-400 whitespace-nowrap">להוביל בחינוך</span>
            </h1>
            <p className="text-2xl text-gray-500 leading-relaxed max-w-xl font-medium">
              פלטפורמת למידה וניהול תוכן חכמה המבוססת על בינה מלאכותית. פתרונות מתקדמים למורים ולתלמידים: יצירת מערכי שיעור, תרגול מותאם אישית וסיכומים אוטומטיים.
            </p>
          </div>


          {/* School Banner */}
          <button
            onClick={onOrderClick}
            className="w-full max-w-xl p-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] text-white text-right relative overflow-hidden group hover:scale-[1.02] transition-all shadow-xl shadow-blue-200"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div className="space-y-1 flex-1">
                <h3 className="text-xl font-black">רוצים את Lumdim בבית הספר שלכם?</h3>
                <p className="text-blue-100 font-bold text-sm">הצטרפו לעשרות בתי ספר שכבר נהנים מהמערכת המתקדמת ביותר</p>
              </div>
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
                <Sparkles size={28} />
              </div>
            </div>
          </button>


          <div className="grid grid-cols-2 gap-6 max-w-lg">
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center mb-4">
                <Zap size={24} />
              </div>
              <h3 className="font-black text-gray-900 mb-1">ניהול תוכן חכם</h3>
              <p className="text-sm text-gray-500">יצירת חומרים ומערכי שיעור בשניות</p>
            </div>
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Bot size={24} />
              </div>
              <h3 className="font-black text-gray-900 mb-1">עוזר AI אישי</h3>
              <p className="text-sm text-gray-500">ליווי אישי ומענה על שאלות 24/7</p>
            </div>
          </div>
        </div>


        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-[3.5rem] blur-2xl opacity-30"></div>
          <div className="relative bg-white rounded-[3rem] shadow-2xl shadow-blue-200/50 p-12 border border-gray-100 flex flex-col items-center text-center space-y-10">
           
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-gray-900">בואו נתחיל</h2>
              <p className="text-xl text-gray-400 font-medium">הצטרפו למהפכת הלמידה החכמה</p>
            </div>


              <div className="w-full space-y-4">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setSelectedRole('STUDENT')}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${selectedRole === 'STUDENT' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <BookOpen size={18} />
                  <span>אני תלמיד</span>
                </button>
                <button
                  onClick={() => setSelectedRole('TEACHER')}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${selectedRole === 'TEACHER' ? 'bg-white text-primary shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Presentation size={18} />
                  <span>אני מורה</span>
                </button>
              </div>


              {!isSchoolMode ? (
                <>
                  <button
                    onClick={handleLogin}
                    className="group w-full py-5 px-8 bg-primary text-white rounded-[1.5rem] font-black text-xl hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-4"
                  >
                    <LogIn size={24} className="rotate-180" />
                    <span>התחברות למערכת</span>
                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                  </button>


                  <button
                    onClick={handleRegister}
                    disabled={!agreedToTerms}
                    className="w-full py-5 px-8 bg-white border-2 border-gray-100 text-gray-900 rounded-[1.5rem] font-black text-xl hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus size={24} />
                    <span>יצירת חשבון חדש</span>
                  </button>


                  <button
                    onClick={() => setIsSchoolMode(true)}
                    className="w-full py-3 text-primary font-bold hover:underline flex items-center justify-center gap-2"
                  >
                    <span>יש לי קוד בית ספר</span>
                    <ChevronLeft size={18} />
                  </button>
                </>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  {!validatedSchool ? (
                    <>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={schoolCode}
                          onChange={(e) => setSchoolCode(e.target.value)}
                          placeholder="הכנס קוד בית ספר (למשל org_...)"
                          className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-right outline-none focus:border-primary transition-all"
                        />
                        <p className="text-xs text-gray-400 font-medium">הזן את הקוד שקיבלת מהנהלת בית הספר</p>
                      </div>
                     
                      <button
                        onClick={handleSchoolLogin}
                        disabled={!schoolCode.trim() || isValidatingSchool || !agreedToTerms}
                        className="w-full py-5 px-8 bg-primary text-white rounded-[1.5rem] font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-4 disabled:opacity-50"
                      >
                        {isValidatingSchool ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <LogIn size={24} className="rotate-180" />
                            <span>אמת קוד בית ספר</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-6 py-4 animate-in zoom-in-95 duration-300">
                      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <p className="text-primary font-black text-lg">בית ספר זוהה:</p>
                        <p className="text-gray-900 font-bold text-2xl">{validatedSchool.name}</p>
                      </div>


                      <div className="space-y-3">
                        <p className="text-gray-500 font-bold">האם זו הפעם הראשונה שלך כאן?</p>
                        <div className="grid gap-3">
                          <button
                            onClick={() => handleSchoolAuth('register')}
                            disabled={!agreedToTerms}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            כן, אני רוצה להירשם
                          </button>
                          <button
                            onClick={() => handleSchoolAuth('login')}
                            disabled={!agreedToTerms}
                            className="w-full py-4 bg-white border-2 border-primary text-primary rounded-2xl font-black text-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            לא, כבר נרשמתי בעבר
                          </button>
                        </div>
                      </div>


                      <button
                        onClick={() => {
                          setValidatedSchool(null);
                          setSchoolCode('');
                        }}
                        className="text-gray-400 text-sm font-bold hover:underline"
                      >
                        זה לא בית הספר שלי / החלף קוד
                      </button>
                    </div>
                  )}


                  <button
                    onClick={() => {
                      setIsSchoolMode(false);
                      setValidatedSchool(null);
                    }}
                    className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-all"
                  >
                    חזור להתחברות רגילה
                  </button>
                </div>
              )}
             
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
              </div>


              <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-50">
                <label className="flex items-center gap-3 cursor-pointer group w-full">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={isOver13}
                      onChange={(e) => setIsOver13(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-lg bg-white peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                      <Check size={14} strokeWidth={4} className={`text-white transition-opacity ${isOver13 ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors text-right">
                    אני מעל גיל 13 <span className="text-[10px] text-gray-400 font-medium">(אם אתה מתחת לגיל זה ישלח מייל אישור להוריך על השימוש באפליקציה)</span>
                  </span>
                </label>


                <label className="flex items-center gap-3 cursor-pointer group w-full">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-lg bg-white peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                      <Check size={14} strokeWidth={4} className={`text-white transition-opacity ${agreedToTerms ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors text-right">
                    אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות
                  </span>
                </label>
              </div>
            </div>
          </div>


          </div>
        </div>


        {/* School Info Modal */}
        {showSchoolInfo && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full p-8 md:p-10 text-center space-y-6 relative overflow-hidden">
              <button
                onClick={() => setShowSchoolInfo(false)}
                className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
             
              <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <Presentation size={32} />
              </div>
             
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">Lumdim לבתי ספר וארגונים</h2>
                <p className="text-base md:text-lg text-gray-500 font-medium leading-relaxed">
                  המערכת שלנו מציעה פתרון מקיף לניהול למידה, מעקב אחר התקדמות תלמידים, יצירת חומרים אוטומטית וחיסכון אדיר בזמן למורים.
                </p>
              </div>


              <div className="grid md:grid-cols-2 gap-3 text-right">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-black text-gray-900 mb-1">ניהול כיתות חכם</h4>
                  <p className="text-xs text-gray-500">מעקב בזמן אמת אחר ביצועי התלמידים וזיהוי קשיים</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <h4 className="font-black text-gray-900 mb-1">התאמה אישית</h4>
                  <p className="text-xs text-gray-500">תוכן לימודי המותאם בדיוק לסילבוס של בית הספר</p>
                </div>
              </div>


              <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/10 space-y-3">
                <p className="text-base font-bold text-gray-700">לפרטים נוספים ותיאום דמו, פנו אלינו:</p>
                <div className="flex flex-col items-center gap-1">
                  <a href="mailto:info@lumdim.app" className="text-2xl font-black text-primary hover:underline">info@lumdim.app</a>
                  <p className="text-xs text-gray-400 font-medium">נחזור אליכם תוך 24 שעות</p>
                </div>
              </div>


              <button
                onClick={() => setShowSchoolInfo(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-black text-lg hover:bg-gray-800 transition-all"
              >
                הבנתי, תודה!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };


export default LoginView;
