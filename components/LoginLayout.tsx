import React, { useState } from 'react';
import LoginView from './LoginView';
import AboutView from './AboutView';
import OrderSystemView from './OrderSystemView';
import DemoView from './DemoView';
import { User as UserType } from '../types';
import { GraduationCap, Info, ShoppingCart, PlayCircle } from 'lucide-react';


interface LoginLayoutProps {
  onLogin: (user: UserType) => void;
  onSchoolLogin: (code: string) => void;
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}


const LoginLayout: React.FC<LoginLayoutProps> = ({ onLogin, onSchoolLogin, onShowPrivacy, onShowTerms }) => {
  const [activeView, setActiveView] = useState('login');


  const menuItems = [
    { id: 'login', label: 'כניסה', icon: GraduationCap },
    { id: 'about', label: 'על המערכת', icon: Info },
    { id: 'order', label: 'מחירון', icon: ShoppingCart },
    { id: 'demo', label: 'התנסות', icon: PlayCircle },
  ];


  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" dir="rtl">
      {/* Modern Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <GraduationCap size={24} />
              </div>
              <span className="text-2xl font-black text-slate-900 tracking-tight">Lumdim</span>
            </div>
           
            <div className="hidden md:flex items-center gap-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                    activeView === item.id
                      ? 'bg-primary text-white shadow-md shadow-primary/10'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>


            {/* Mobile Menu Button (Simplified for now) */}
            <div className="md:hidden flex items-center gap-4">
               {menuItems.map(item => (
                 <button
                   key={item.id}
                   onClick={() => setActiveView(item.id)}
                   className={`p-2 rounded-lg transition-all ${
                     activeView === item.id
                       ? 'text-primary bg-primary/10'
                       : 'text-slate-400'
                   }`}
                   title={item.label}
                 >
                   <item.icon size={20} />
                 </button>
               ))}
            </div>
          </div>
        </div>
      </nav>


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-7xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
          <div className="min-h-[600px] relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
           
            <div className="relative z-10">
              {activeView === 'login' && (
                <LoginView
                  onLogin={onLogin}
                  onSchoolLogin={onSchoolLogin}
                  onShowPrivacy={onShowPrivacy}
                  onShowTerms={onShowTerms}
                  onOrderClick={() => setActiveView('order')}
                />
              )}
              {activeView === 'about' && <AboutView />}
              {activeView === 'order' && <OrderSystemView />}
              {activeView === 'demo' && <DemoView onLogin={onLogin} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};




export default LoginLayout;

