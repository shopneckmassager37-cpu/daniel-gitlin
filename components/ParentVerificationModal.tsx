
import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ParentVerificationModalProps {
  userId: string;
  onVerified: () => void;
}

const ParentVerificationModal: React.FC<ParentVerificationModalProps> = ({ userId, onVerified }) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, parentEmail: email })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'נכשל בשליחת קוד אימות');
      }
      
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'קוד אימות לא תקין');
      }
      
      onVerified();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md" dir="rtl">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 md:p-10 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-blue-50 text-primary rounded-3xl flex items-center justify-center shadow-sm">
              <ShieldCheck size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900">אישור הורה נדרש</h2>
              <p className="text-gray-500 font-medium">מכיוון שאתה מתחת לגיל 13, עלינו לקבל אישור מהוריך כדי שתוכל להשתמש ב-Lumdim.</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pr-1">אימייל של הורה</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition-all text-right font-bold pr-12"
                  />
                  <Mail size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight size={24} className="rotate-180" />}
                <span>שלח קוד אימות</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2 text-center">
                <p className="text-sm text-gray-500 font-bold">קוד אימות נשלח לכתובת:<br/><span className="text-primary">{email}</span></p>
                <div className="flex justify-center gap-2 mt-4">
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full max-w-[200px] p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none transition-all text-center font-black text-3xl tracking-[10px] placeholder:tracking-normal"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  type="submit"
                  disabled={isLoading || otp.length < 6}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                  <span>אמת קוד והמשך</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-all"
                >
                  החלף אימייל
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
              בהזנת הקוד, ההורה מאשר כי הוא מעל גיל 18 וכי הוא מאשר לילדו להשתמש באפליקציה בהתאם לתנאי השימוש ומדיניות הפרטיות.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentVerificationModal;
