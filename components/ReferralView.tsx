
import React, { useState, useMemo } from 'react';
import { Gift, Share2, Copy, Check, ArrowRight, Star, Trophy, Crown } from 'lucide-react';

interface ReferralViewProps {
  onBack: () => void;
  referralCount: number;
  userId: string;
}

const ReferralView: React.FC<ReferralViewProps> = ({ onBack, referralCount, userId }) => {
  const [copied, setCopied] = useState(false);
  
  const referralLink = useMemo(() => {
    const url = new URL(window.location.href);
    url.search = ''; 
    url.hash = '';   
    const baseUrl = url.toString().replace(/\/$/, ''); 
    return `${baseUrl}/?ref=${userId}`;
  }, [userId]);

  const handleCopy = async () => {
    const textToCopy = referralLink;
    let success = false;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch (err) {
        console.warn("Modern clipboard API failed, trying fallback", err);
      }
    }
    
    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'בוא ללמוד איתי ב-Lumdim AI!',
          text: 'אפליקציית למידה חכמה עם מורה פרטי מבוסס בינה מלאכותית. כנס דרך הקישור שלי!',
          url: referralLink,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <div className="mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowRight size={20} />
          <span>חזרה לדף הבית</span>
        </button>

        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full -ml-32 -mb-32 opacity-50"></div>

          <div className="relative z-10">
            <div className="bg-green-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-600 rotate-3 group hover:rotate-0 transition-transform shadow-sm">
              <Gift size={40} />
            </div>
            
            <h2 className="text-4xl font-black text-gray-900 mb-4">חבר מביא חבר!</h2>
            <p className="text-xl text-gray-500 mb-8 max-w-lg mx-auto leading-relaxed">
              מזמינים חברים ללמוד ב-Lumdim AI וכולם מרוויחים. על כל חבר שנרשם דרכך, תקבל <span className="text-green-600 font-bold">חודש PRO בחינם!</span>
            </p>

            <div className="bg-gray-50 rounded-3xl p-6 md:p-8 border-2 border-dashed border-gray-200 mb-10">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">הקישור הייחודי שלך</p>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-4 font-mono text-sm text-gray-600 truncate flex items-center justify-center overflow-hidden">
                  {referralLink}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCopy}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black'}`}
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                    <span>{copied ? 'הועתק!' : 'העתק קישור'}</span>
                  </button>
                  <button 
                    onClick={handleShare}
                    className="p-4 bg-primary text-white rounded-2xl hover:bg-blue-600 transition-all flex items-center justify-center"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-3xl font-black text-primary mb-1">{referralCount}/5</div>
                <div className="text-sm font-bold text-gray-400">חברים שהצטרפו</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                 <div className="text-3xl font-black text-green-500 mb-1">{referralCount}</div>
                 <div className="text-sm font-bold text-gray-400">חודשי PRO שנצברו</div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                 <div className="text-3xl font-black text-yellow-500 mb-1">
                    {referralCount > 0 ? <Crown fill="currentColor" className="inline mb-1" /> : '🎁'}
                 </div>
                 <div className="text-sm font-bold text-gray-400">סטטוס בונוס</div>
              </div>
            </div>

            <div className="max-w-md mx-auto">
                <div className="flex items-center gap-4 text-right p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Star size={20} /></div>
                    <p className="text-sm text-gray-600 font-medium">מוגבל לעד 5 חברים (סה"כ 5 חודשי PRO חינם)</p>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralView;
