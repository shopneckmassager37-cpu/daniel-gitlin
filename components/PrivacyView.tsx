
import React from 'react';
import { Shield, ArrowRight, Lock, Eye, FileText, UserCheck, HelpCircle, Settings } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  const openCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
      >
        <div className="p-2 bg-white rounded-full border border-gray-200 group-hover:border-primary transition-all">
            <ArrowRight size={20} />
        </div>
        <span className="font-bold">חזרה</span>
      </button>

      <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 p-10 md:p-16 text-center text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <div className="bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                    <Shield size={40} className="text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black mb-4">מדיניות פרטיות – Lumdim</h1>
                <p className="text-gray-400 font-medium">עודכן לאחרונה: 09.03.2026</p>
            </div>
        </div>

        <div className="p-8 md:p-16 space-y-12">
            <section className="prose prose-blue max-w-none text-right" dir="rtl">
                <p className="text-lg text-gray-700 leading-relaxed mb-12">
                    ברוכים הבאים ל-Lumdim (להלן: "הפלטפורמה"). אנו מכבדים את פרטיות המשתמשים ומחויבים להגן על המידע האישי שנמסר לנו. מדיניות זו מפרטת את אופן איסוף המידע, השימוש בו והזכויות העומדות לרשותכם על פי חוק הגנת הפרטיות, התשמ"א-1981 ותקנותיו.
                </p>

                <div className="space-y-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">1. המידע שאנו אוספים</h2>
                        <p className="mb-4">אנו אוספים מידע אישי ומידע טכני כחלק ממתן השירותים:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>מידע אישי:</strong> שם מלא, כתובת דואר אלקטרוני, תמונת פרופיל ופרטי התחברות.</li>
                            <li><strong>תוכן משתמש:</strong> שאלות, טקסטים, קבצים ונתונים המועלים על ידי המשתמש לצורך עיבוד ב-AI.</li>
                            <li><strong>מידע טכני:</strong> כתובת IP, נתוני עוגיות (Cookies), סוג דפדפן והיסטוריית שימוש לשיפור חוויית המשתמש.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">2. מטרות השימוש במידע</h2>
                        <p className="mb-4">המידע משמש למטרות הבאות:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>מתן השירות:</strong> תפעול הפלטפורמה, עיבוד שאילתות AI והתאמת תכנים לימודיים.</li>
                            <li><strong>שיפור השירות:</strong> ניתוח סטטיסטי אנונימי לשיפור אלגוריתמים וחוויית משתמש.</li>
                            <li><strong>תקשורת:</strong> שליחת עדכונים, הודעות מערכת ומענה לפניות תמיכה.</li>
                            <li><strong>אבטחה:</strong> מניעת שימוש לרעה והגנה על זכויות המשתמשים ו-Lumdim.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">3. העברת מידע לצדדים שלישיים</h2>
                        <p className="mb-4">אנו לא מוכרים מידע אישי. העברת מידע תתבצע רק במקרים הבאים:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>ספקי שירותי AI:</strong> המידע עשוי לעבור עיבוד דרך מודלים של Google Gemini לצורך הפקת התשובה.</li>
                            <li><strong>ספקי תשתית ודאטאבייס:</strong> אנו משתמשים בשירותי Supabase לאחסון נתונים וניהול מסדי נתונים.</li>
                            <li><strong>דרישות חוקיות:</strong> במקרה של צו שיפוטי או דרישה חוקית מרשות מוסמכת.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">4. אבטחת מידע ושמירתו</h2>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li>אנו מיישמים אמצעי אבטחה טכנולוגיים וארגוניים מקובלים להגנה על המידע.</li>
                            <li>המידע נשמר כל עוד החשבון פעיל או כנדרש על פי דין.</li>
                            <li>המידע עשוי להישמר בשרתים מחוץ לישראל, בכפוף להוראות הדין.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">5. זכויות המשתמש</h2>
                        <p className="mb-4">על פי חוק הגנת הפרטיות, הנך זכאי לעיין במידע המוחזק עליך, לבקש את תיקונו או מחיקתו במידה ואינו מדויק או מעודכן. ניתן לפנות אלינו בכל עת בכתובת info@lumdim.app.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">6. עוגיות (Cookies)</h2>
                        <p className="mb-4">הפלטפורמה משתמשת בעוגיות לצורך תפעול שוטף, אבטחה ואיסוף נתונים סטטיסטיים. אנו משתמשים בעוגיות הכרחיות לתפקוד האתר, ובעוגיות ניתוח לשיפור השירות.</p>
                        <button 
                          onClick={openCookieSettings}
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-bold transition-all text-sm border border-gray-200"
                        >
                          <Settings size={18} />
                          <span>נהל הגדרות עוגיות</span>
                        </button>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">7. שינויים במדיניות</h2>
                        <p>אנו רשאים לעדכן את מדיניות הפרטיות מעת לעת. המשך השימוש בפלטפורמה לאחר העדכון מהווה הסכמה לתנאים החדשים.</p>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyView;
