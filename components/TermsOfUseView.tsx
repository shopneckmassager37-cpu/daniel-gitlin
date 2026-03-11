
import React from 'react';
import { FileText, ArrowRight, Scale, UserCheck, ShieldAlert, CreditCard, HelpCircle } from 'lucide-react';

interface TermsOfUseViewProps {
  onBack: () => void;
}

const TermsOfUseView: React.FC<TermsOfUseViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20" dir="rtl">
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
                    <Scale size={40} className="text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black mb-4">תנאי שימוש – Lumdim</h1>
                <p className="text-gray-400 font-medium">עודכן לאחרונה: 09.03.2026</p>
            </div>
        </div>

        <div className="p-8 md:p-16 space-y-12">
            <section className="prose prose-blue max-w-none text-right">
                <p className="text-lg text-gray-700 leading-relaxed mb-12">
                    ברוכים הבאים ל-Lumdim (להלן: "הפלטפורמה"). השימוש בפלטפורמה כפוף לתנאי השימוש המפורטים להלן. בעצם השימוש בפלטפורמה, הנך מצהיר כי קראת, הבנת והסכמת לתנאים אלו.
                </p>

                <div className="space-y-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">1. כללי</h2>
                        <p className="mb-4">הפלטפורמה מופעלת על ידי Lumdim ומספקת שירותי עזר לימודיים מבוססי בינה מלאכותית. התנאים חלים על כל משתמש, בין אם מורה, תלמיד או אורח.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">2. הרשמה וחשבון משתמש</h2>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li>השימוש בחלק מהשירותים מחייב הרשמה ומסירת פרטים אישיים נכונים.</li>
                            <li>הנך אחראי לשמירה על סודיות פרטי ההתחברות שלך.</li>
                            <li>חל איסור להעביר את החשבון לצד שלישי ללא אישור מראש.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">3. קניין רוחני</h2>
                        <p className="mb-4">כל הזכויות בפלטפורמה, לרבות עיצוב, קוד, סימני מסחר ותוכן (למעט תוכן משתמש), שייכות ל-Lumdim. אין להעתיק, להפיץ או להשתמש בתוכן ללא אישור בכתב.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">4. תוכן משתמש ושימוש ב-AI ודאטאבייס</h2>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li>המשתמש נושא באחריות מלאה לתוכן שהוא מעלה לפלטפורמה.</li>
                            <li>התוכן המופק על ידי ה-AI הוא בגדר המלצה ועזר בלבד. Lumdim אינה אחראית לדיוק המוחלט של התשובות או לטעויות בתוכן המופק.</li>
                            <li>הנתונים נשמרים ומנוהלים בצורה מאובטחת.</li>
                            <li>אין להשתמש בפלטפורמה ליצירת תוכן פוגעני, בלתי חוקי או כזה המפר זכויות יוצרים.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">5. מנויים ותשלומים</h2>
                        <p className="mb-4">חלק מהשירותים כרוכים בתשלום (מנוי Pro). התשלום מתבצע באמצעות ספקי סליקה חיצוניים. ביטול מנוי יתבצע בהתאם למדיניות הביטולים המפורטת באתר ועל פי חוק הגנת הצרכן הישראלי.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">6. הגבלת אחריות</h2>
                        <p className="mb-4">השירות ניתן כפי שהוא (AS-IS). Lumdim לא תהיה אחראית לכל נזק ישיר או עקיף שייגרם כתוצאה מהשימוש בפלטפורמה או מהסתמכות על התכנים המופיעים בה.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">7. סמכות שיפוט</h2>
                        <p>על תנאים אלו יחולו חוקי מדינת ישראל בלבד. סמכות השיפוט הבלעדית בכל עניין הנוגע להסכם זה תהיה לבתי המשפט המוסמכים במחוז תל אביב-יפו.</p>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <h2 className="text-lg font-black text-primary mb-2 flex items-center gap-2">
                            <HelpCircle size={20} />
                            יש לכם שאלות?
                        </h2>
                        <p className="text-sm text-gray-600">ניתן לפנות אלינו בכל עת בכתובת המייל: info@lumdim.app</p>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUseView;
