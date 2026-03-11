import React, { useState } from 'react';
import { User as UserType } from '../types';
import { Sparkles, Bot, ArrowLeft, User, Presentation, BookOpen } from 'lucide-react';


interface DemoViewProps {
  onLogin: (user: UserType) => void;
}


const DemoView: React.FC<DemoViewProps> = ({ onLogin }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');


  const handleDemoLogin = () => {
    if (!firstName || !lastName) {
      alert('נא להזין שם פרטי ושם משפחה');
      return;
    }
    const guestUser: UserType = {
      id: 'demo-' + Math.random().toString(36).substr(2, 9),
      name: `${firstName} ${lastName}`,
      email: `demo_${firstName.toLowerCase()}_${lastName.toLowerCase()}@lumdim.ai`,
      role: role,
      provider: 'guest',
      isOver13: true
    };
    onLogin(guestUser);
  };


  return (
    <div className="min-h-[700px] flex items-center justify-center p-8 md:p-16 relative overflow-hidden" dir="rtl">
      {/* Immersive Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>


      <div className="relative z-10 w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Content */}
        <div className="text-right space-y-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white shadow-xl shadow-slate-200/50 rounded-2xl text-primary font-black text-sm border border-slate-100">
            <Sparkles size={18} className="animate-bounce" />
            <span>התנסות חופשית ללא הרשמה</span>
          </div>
         
          <div className="space-y-6">
            <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
              העתיד של <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-blue-400">הלמידה החכמה</span> <br />
              בידיים שלך.
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">
              הצטרפו לאלפי מורים ותלמידים שכבר משתמשים בבינה מלאכותית כדי להגיע להישגים גבוהים יותר בפחות זמן.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-slate-400 font-bold">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>ללא כרטיס אשראי</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-bold">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>גישה מיידית</span>
            </div>
          </div>
        </div>


        {/* Right Side: Form Card */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary to-blue-400 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
         
          <div className="relative bg-white/80 backdrop-blur-2xl border border-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 space-y-10">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Bot size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">בואו נכיר</h2>
              <p className="text-slate-400 font-bold">איך תרצו להתנסות במערכת?</p>
            </div>


            <div className="space-y-8">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                <button
                  onClick={() => setRole('STUDENT')}
                  className={`flex-1 py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${
                    role === 'STUDENT'
                      ? 'bg-white text-primary shadow-lg'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <BookOpen size={20} />
                  תלמיד
                </button>
                <button
                  onClick={() => setRole('TEACHER')}
                  className={`flex-1 py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 ${
                    role === 'TEACHER'
                      ? 'bg-white text-primary shadow-lg'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Presentation size={20} />
                  מורה
                </button>
              </div>


              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-wider">שם פרטי</label>
                    <input
                      type="text"
                      placeholder="ישראל"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-50 rounded-2xl font-bold text-right outline-none focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-wider">שם משפחה</label>
                    <input
                      type="text"
                      placeholder="ישראלי"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-slate-50 rounded-2xl font-bold text-right outline-none focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                </div>


                <button
                  onClick={handleDemoLogin}
                  className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-4 group"
                >
                  <span>התחל התנסות עכשיו</span>
                  <ArrowLeft size={24} className="group-hover:-translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




export default DemoView;
