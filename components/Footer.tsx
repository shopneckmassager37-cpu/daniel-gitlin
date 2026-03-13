
import React from 'react';
import { Mail, Shield, FileText } from 'lucide-react';

interface FooterProps {
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}

const Footer: React.FC<FooterProps> = ({ onShowPrivacy, onShowTerms }) => {
  return (
    <footer className="w-full py-8 mt-auto border-t border-gray-100 bg-white/50 backdrop-blur-sm no-print" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2 text-gray-400 font-bold text-sm">
          <Mail size={16} className="text-primary" />
          <span>יצירת קשר:</span>
          <a href="mailto:info@lumdim.app" className="hover:text-primary transition-colors">info@lumdim.app</a>
        </div>
        
        <div className="flex items-center gap-8 text-xs font-black text-gray-400 uppercase tracking-widest">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-cookie-settings'))}
            className="flex items-center gap-2 hover:text-primary transition-colors group"
          >
            <Shield size={14} className="group-hover:scale-110 transition-transform" />
            <span>הגדרות עוגיות</span>
          </button>
          <button 
            onClick={onShowPrivacy}
            className="flex items-center gap-2 hover:text-primary transition-colors group"
          >
            <Shield size={14} className="group-hover:scale-110 transition-transform" />
            <span>מדיניות פרטיות</span>
          </button>
          <button 
            onClick={onShowTerms}
            className="flex items-center gap-2 hover:text-primary transition-colors group"
          >
            <FileText size={14} className="group-hover:scale-110 transition-transform" />
            <span>תנאי שימוש</span>
          </button>
        </div>

        <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
          © {new Date().getFullYear()} Lumdim - לומדים חכם יותר
        </div>
      </div>
    </footer>
  );
};

export default Footer;
