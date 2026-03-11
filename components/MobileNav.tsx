
import React from 'react';
import { Home, History, School, MessageCircle, PenTool, Library, Trophy, CalendarDays, BookOpen, Gamepad2 } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isTeacher: boolean;
  viewMode: string;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange, isTeacher, viewMode }) => {
  const isMainTool = ['PRACTICE', 'CHAT', 'GAMES', 'RESOURCES', 'TEST_PREP'].includes(viewMode);

  if (isTeacher) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => onTabChange('OVERVIEW')}
          className={`flex flex-col items-center gap-1 ${viewMode === 'DASHBOARD' ? 'text-primary' : 'text-gray-400'}`}
        >
          <Home size={20} />
          <span className="text-[10px] font-bold">ראשי</span>
        </button>
        <button 
          onClick={() => onTabChange('CLASSROOM')}
          className={`flex flex-col items-center gap-1 ${viewMode === 'CLASSROOM' ? 'text-primary' : 'text-gray-400'}`}
        >
          <School size={20} />
          <span className="text-[10px] font-bold">כיתות</span>
        </button>
        <button 
          onClick={() => onTabChange('HISTORY')}
          className={`flex flex-col items-center gap-1 ${viewMode === 'HISTORY' ? 'text-primary' : 'text-gray-400'}`}
        >
          <Library size={20} />
          <span className="text-[10px] font-bold">מאגר</span>
        </button>
        <button 
          onClick={() => onTabChange('CHAT')}
          className={`flex flex-col items-center gap-1 ${viewMode === 'CHAT' ? 'text-primary' : 'text-gray-400'}`}
        >
          <MessageCircle size={20} />
          <span className="text-[10px] font-bold">צ'אט</span>
        </button>
      </div>
    );
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <button 
        onClick={() => onTabChange('DASHBOARD')}
        className={`flex flex-col items-center gap-1 ${viewMode === 'DASHBOARD' ? 'text-primary' : 'text-gray-400'}`}
      >
        <Home size={20} />
        <span className="text-[10px] font-bold">ראשי</span>
      </button>
      <button 
        onClick={() => onTabChange('practice')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'practice' && viewMode === 'PRACTICE' ? 'text-primary' : 'text-gray-400'}`}
      >
        <PenTool size={20} />
        <span className="text-[10px] font-bold">תרגול</span>
      </button>
      <button 
        onClick={() => onTabChange('chat')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'chat' && viewMode === 'CHAT' ? 'text-primary' : 'text-gray-400'}`}
      >
        <MessageCircle size={20} />
        <span className="text-[10px] font-bold">צ'אט</span>
      </button>
      <button 
        onClick={() => onTabChange('resources')}
        className={`flex flex-col items-center gap-1 ${activeTab === 'resources' && viewMode === 'PRACTICE' ? 'text-primary' : 'text-gray-400'}`}
      >
        <BookOpen size={20} />
        <span className="text-[10px] font-bold">חומרים</span>
      </button>
      <button 
        onClick={() => onTabChange('HISTORY')}
        className={`flex flex-col items-center gap-1 ${viewMode === 'HISTORY' ? 'text-primary' : 'text-gray-400'}`}
      >
        <History size={20} />
        <span className="text-[10px] font-bold">היסטוריה</span>
      </button>
    </div>
  );
};

export default MobileNav;
