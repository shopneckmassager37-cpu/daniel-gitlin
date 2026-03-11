
import React, { useState } from 'react';
import { Check, Zap, Star, Crown, ArrowRight, ShieldCheck, Globe, Layout, Database, Loader2, Sparkles, Info } from 'lucide-react';
import { User, PLAN_KEYS } from '../types';
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

interface SubscriptionViewProps {
  user: User;
  onUpdateSubscription: (type: 'Free' | 'Pro') => void;
  onBack: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ user, onUpdateSubscription, onBack }) => {
  const isPro = user.subscriptionType === 'Pro';
  const isTeacher = user.role === 'TEACHER';
  const [showPaypal, setShowPaypal] = useState(false);

  const rawPaypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const teacherPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID_TEACHER;
  const studentPlanId = import.meta.env.VITE_PAYPAL_PLAN_ID_STUDENT;
  const paypalCurrency = import.meta.env.VITE_PAYPAL_CURRENCY || "ILS";
  
  const paypalClientId = rawPaypalClientId || "";

  const teacherBenefits = [
    {
      title: 'כיתות',
      free: 'עד 3 כיתות',
      pro: 'ללא הגבלה',
      icon: Globe,
      color: 'text-blue-500'
    },
    {
      title: 'בקשות AI יומיות',
      free: 'עד 10 בקשות ביום',
      pro: 'ללא הגבלה',
      icon: Zap,
      color: 'text-yellow-500'
    },
    {
      title: 'מחולל מערכי שיעור',
      free: 'אינפוגרפיקה בלבד',
      pro: 'אינפוגרפיקה + מצגות',
      icon: Layout,
      color: 'text-purple-500'
    },
    {
      title: 'מאגר חומרים',
      free: 'עד 5 תכנים למקצוע',
      pro: 'ללא הגבלה',
      icon: Database,
      color: 'text-green-500'
    }
  ];

  const studentBenefits = [
    {
      title: 'תרגולים יומיים',
      free: 'עד 5 תרגולים ביום',
      pro: 'ללא הגבלה',
      icon: Layout,
      color: 'text-blue-500'
    },
    {
      title: 'סיכומי שיעור',
      free: 'סיכום 1 ביום',
      pro: 'ללא הגבלה',
      icon: Database,
      color: 'text-green-500'
    },
    {
      title: 'הודעות ל-AI',
      free: 'עד 15 הודעות ביום',
      pro: 'ללא הגבלה',
      icon: Zap,
      color: 'text-yellow-500'
    },
    {
      title: 'הכנות למבחן',
      free: 'תוכנית 1 בשבוע',
      pro: 'ללא הגבלה',
      icon: Star,
      color: 'text-purple-500'
    }
  ];

  const benefits = isTeacher ? teacherBenefits : studentBenefits;
  const price = isTeacher ? '49' : '24';
  const roleName = isTeacher ? 'מורים' : 'תלמידים';
  const proDescription = isTeacher ? 'למורים מקצועיים שרוצים להצליח' : 'לתלמידים שרוצים להגיע להישגים הכי גבוהים';
  const mainDescription = isTeacher 
    ? 'קבלו את כל הכלים שאתם צריכים כדי ללמד טוב יותר, לנהל כיתות ביעילות ולהכין חומרים בצורה חכמה יותר.'
    : 'קבלו את כל הכלים שאתם צריכים כדי ללמוד טוב יותר, מהר יותר ובצורה חכמה יותר.';

  if (user.schoolCode) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fade-in" dir="rtl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8 group"
        >
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span>חזרה למסך הבית</span>
        </button>
        <div className="text-center py-12 bg-blue-50 rounded-3xl border-2 border-blue-100 px-6 space-y-6">
          <div className="w-20 h-20 bg-blue-100 text-primary rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Crown size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">יש לך גישה מלאה לכל התכונות!</h2>
            <p className="text-xl text-gray-600 font-medium">כמשתמש המחובר לבית הספר <strong>{user.schoolName}</strong>, אתה נהנה מכל היכולות של Lumdim ללא הגבלה.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                <benefit.icon className={`${benefit.color} mx-auto mb-2`} size={24} />
                <p className="font-bold text-gray-900 text-sm">{benefit.title}</p>
                <p className="text-xs text-primary font-bold">{benefit.pro}</p>
              </div>
            ))}
          </div>
          <button 
            onClick={onBack}
            className="mt-8 px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-lg"
          >
            המשך ללמוד
          </button>
        </div>
      </div>
    );
  }

  const updateKindeRole = async (isDowngrade = false) => {
    try {
      // If downgrading, try to cancel PayPal subscription first
      if (isDowngrade) {
        const userId = user.id;
        const saved = localStorage.getItem(`user_extra_${userId}`);
        const extra = saved ? JSON.parse(saved) : {};
        const subscriptionId = extra.paypalSubscriptionId;

        if (subscriptionId) {
          try {
            await fetch('/api/paypal/cancel-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscriptionId })
            });
            // Clear it from local storage after successful cancellation
            delete extra.paypalSubscriptionId;
            localStorage.setItem(`user_extra_${userId}`, JSON.stringify(extra));
          } catch (cancelError) {
            console.error("Failed to cancel PayPal subscription:", cancelError);
            // We continue anyway to downgrade the role, but log the error
          }
        }
      }

      await fetch('/api/admin/update-kinde-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          plan: isDowngrade ? 'Free' : 'Pro',
          role: user.role
        })
      });
    } catch (error) {
      console.error("Failed to update Kinde role:", error);
    }
  };

  const isPaypalConfigured = !!paypalClientId && !!teacherPlanId && !!studentPlanId;

  return (
    <PayPalScriptProvider options={{ 
      clientId: paypalClientId || "sb", 
      currency: paypalCurrency,
      vault: true,
      intent: "subscription",
      locale: "he_IL"
    }}>
      <div className="max-w-4xl mx-auto p-6 animate-fade-in" dir="rtl">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8 group"
        >
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span>חזרה למסך הבית</span>
        </button>

        {!isPaypalConfigured && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-medium flex items-center gap-3">
            <Info size={20} />
            <span>שים לב: הגדרות התשלום (PayPal) טרם הושלמו. השדרוג יתבצע במצב דמו.</span>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-4">שדרגו ל-Lumdim Pro</h1>
          <p className="text-xl text-gray-600">{mainDescription}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-100 shadow-sm relative overflow-hidden">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">התוכנית החינמית</h2>
              <p className="text-gray-500">ל{roleName} בתחילת הדרך</p>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-8">₪0 <span className="text-lg font-normal text-gray-400">/ לחודש</span></div>
            
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check size={20} className="text-gray-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-700">{benefit.title}</p>
                    <p className="text-sm text-gray-500">{benefit.free}</p>
                  </div>
                </li>
              ))}
            </ul>

            <button 
              disabled={!isPro}
              onClick={async () => {
                if (isPro && window.confirm("האם אתה בטוח שברצונך לעבור לתוכנית החינמית?")) {
                  await updateKindeRole(true);
                  onUpdateSubscription('Free');
                }
              }}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${!isPro ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-white border-2 border-primary text-primary hover:bg-blue-50'}`}
            >
              {!isPro ? 'התוכנית הנוכחית שלך' : 'לעבור לתוכנית החינמית'}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-3xl p-8 border-2 border-primary shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-primary text-white px-6 py-2 rounded-br-2xl font-bold flex items-center gap-2">
              <Crown size={18} />
              מומלץ
            </div>
            
            <div className="mb-6 mt-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lumdim Pro</h2>
              <p className="text-gray-500">{proDescription}</p>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-2">₪{price} <span className="text-lg font-normal text-gray-400">/ לחודש</span></div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black px-4 py-2 rounded-2xl inline-flex items-center gap-2 mb-8 shadow-md">
              <Sparkles size={14} className="text-yellow-300" />
              <span>14 ימי ניסיון חינם - התחילו עכשיו ובטלו בכל עת</span>
            </div>
            
            <ul className="space-y-4 mb-8">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check size={20} className="text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">{benefit.title}</p>
                    <p className="text-sm text-primary font-medium">{benefit.pro}</p>
                  </div>
                </li>
              ))}
            </ul>

            {isPro ? (
              <div className="space-y-4">
                <div className="w-full py-4 rounded-2xl font-bold bg-green-500 text-white flex items-center justify-center gap-2">
                  <ShieldCheck size={20} />
                  <span>אתה כבר Pro!</span>
                </div>
                <button 
                  onClick={async () => {
                    if (window.confirm("האם אתה בטוח שברצונך לעבור לתוכנית החינמית?")) {
                      await updateKindeRole(true);
                      onUpdateSubscription('Free');
                    }
                  }}
                  className="w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors font-bold"
                >
                  לעבור לתוכנית החינמית
                </button>
              </div>
            ) : showPaypal && paypalClientId ? (
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
                      if (!planId) {
                        alert("שגיאה: חסר Plan ID של PayPal. אנא הגדר את VITE_PAYPAL_PLAN_ID_TEACHER או VITE_PAYPAL_PLAN_ID_STUDENT בקובץ .env");
                        return Promise.reject("Plan ID is missing");
                      }
                      return actions.subscription.create({
                        plan_id: planId
                      });
                    }}
                    onApprove={async (data, actions) => {
                      console.log("PayPal Subscription Approved:", data);
                      // Store subscription ID in user data
                      const userId = user.id;
                      const saved = localStorage.getItem(`user_extra_${userId}`);
                      const extra = saved ? JSON.parse(saved) : {};
                      extra.paypalSubscriptionId = data.subscriptionID;
                      localStorage.setItem(`user_extra_${userId}`, JSON.stringify(extra));

                      await updateKindeRole();
                      onUpdateSubscription('Pro');
                      alert(`המינוי בוצע בהצלחה! מזהה מינוי: ${data.subscriptionID}`);
                    }}
                    onError={(err: any) => {
                      // Filter out the "Window is closed" error which is often benign/manual closure
                      const errorMsg = err?.message || String(err);
                      console.error("Full PayPal Error Object:", err);
                      
                      if (errorMsg.includes("Window is closed") || errorMsg.includes("determine type")) {
                        console.log("PayPal popup closed by user or environment.");
                        return;
                      }
                      
                      console.error("PayPal Error Details:", errorMsg);
                      alert(`אירעה שגיאה בתהליך המינוי: ${errorMsg}. וודא שה-Plan ID תואם למטבע (${paypalCurrency}) ולחשבון ה-PayPal.`);
                    }}
                  />
                </PayPalErrorWrapper>
                <button 
                  onClick={() => setShowPaypal(false)}
                  className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button 
                onClick={async () => {
                  if (paypalClientId) {
                    setShowPaypal(true);
                  } else {
                    // Fallback for demo if no client ID
                    await updateKindeRole();
                    onUpdateSubscription('Pro');
                  }
                }}
                className="w-full py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 bg-primary text-white hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap size={20} />
                <span>שדרג ל-Pro עכשיו</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default SubscriptionView;
