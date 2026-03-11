import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Settings, Check } from 'lucide-react';

const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    const savedPrefs = localStorage.getItem('lumdim_cookie_preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPrefs({ analytics: parsed.analytics || false, marketing: parsed.marketing || false });
      } catch (e) {
        console.error('Error parsing cookie preferences', e);
      }
    }
    
    const handleOpenBanner = () => {
      setIsVisible(true);
      setShowCustomize(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenBanner);
    
    const consent = localStorage.getItem('lumdim_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('open-cookie-settings', handleOpenBanner);
      };
    }

    return () => window.removeEventListener('open-cookie-settings', handleOpenBanner);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('lumdim_cookie_consent', 'accepted');
    localStorage.setItem('lumdim_cookie_preferences', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true
    }));
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('lumdim_cookie_consent', 'declined');
    localStorage.setItem('lumdim_cookie_preferences', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false
    }));
    setIsVisible(false);
  };

  const handleSavePreferences = (prefs: { analytics: boolean, marketing: boolean }) => {
    localStorage.setItem('lumdim_cookie_consent', 'custom');
    localStorage.setItem('lumdim_cookie_preferences', JSON.stringify({
      essential: true,
      ...prefs
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-[200] animate-slide-up" dir="rtl">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-8 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-primary shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-900">פרטיות ושימוש בעוגיות</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              אנו משתמשים בעוגיות ובאחסון מקומי כדי לשמור את ההעדפות שלך, לאפשר התחברות מאובטחת ולשפר את חווית הלמידה. המידע שלך מעובד בצורה מאובטחת ואינו מועבר לצדדים שלישיים למטרות פרסום.
            </p>
          </div>
        </div>

        {showCustomize ? (
          <div className="space-y-4 py-4 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">עוגיות הכרחיות</span>
              <div className="w-10 h-5 bg-primary rounded-full relative opacity-50">
                <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">עוגיות ניתוח</span>
              <button 
                onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${prefs.analytics ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prefs.analytics ? 'left-1' : 'right-1'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">עוגיות שיווק</span>
              <button 
                onClick={() => setPrefs(p => ({ ...p, marketing: !p.marketing }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${prefs.marketing ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${prefs.marketing ? 'left-1' : 'right-1'}`}></div>
              </button>
            </div>
            <button 
              onClick={() => handleSavePreferences(prefs)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all"
            >
              שמור העדפות
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleAccept}
              className="col-span-2 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-primary/20"
            >
              אני מסכים
            </button>
            <button 
              onClick={handleDecline}
              className="py-3 bg-gray-50 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all"
            >
              סרב
            </button>
            <button 
              onClick={() => setShowCustomize(true)}
              className="py-3 bg-white border border-gray-100 text-gray-400 rounded-2xl font-black text-xs hover:border-gray-200 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <Settings size={14} />
              <span>התאמה אישית</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
