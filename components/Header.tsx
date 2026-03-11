
import React, { useState } from 'react';
import { GraduationCap, History, ChevronDown, Settings, LayoutGrid, User, School, LogOut, UserCircle, Trophy, CalendarDays, FolderOpen, Bell, Library, BookCheck, Crown, Zap } from 'lucide-react';
import { Grade, UserRole, UserSettings } from '../types';

interface HeaderProps {
  onHomeClick: () => void;
  onHistoryClick: () => void;
  onClassroomClick: () => void;
  onAchievementsClick: () => void;
  onCalendarClick: () => void;
  onNotificationsClick: () => void;
  onLibraryClick: () => void;
  onCoursesClick: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
  selectedGrade: Grade | null;
  onChangeGrade: () => void;
  userName?: string | null;
  userPhoto?: string;
  userEmail?: string;
  userRole?: UserRole;
  userSettings?: UserSettings;
  unreadCount?: number;
  onUpgradeClick?: () => void;
  subscriptionType?: 'Free' | 'Pro';
  schoolCode?: string | null;
}

const Header: React.FC<HeaderProps> = ({ 
  onHomeClick, 
  onHistoryClick, 
  onClassroomClick,
  onAchievementsClick,
  onCalendarClick,
  onNotificationsClick,
  onLibraryClick,
  onCoursesClick,
  onLogout,
  onProfileClick,
  selectedGrade, 
  onChangeGrade, 
  userName,
  userPhoto,
  userEmail,
  userRole,
  userSettings,
  unreadCount = 0,
  onUpgradeClick,
  subscriptionType = 'Free',
  schoolCode
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isTeacher = userRole === 'TEACHER';
  const notificationsEnabled = userSettings?.notificationsEnabled ?? true;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 no-print transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button 
            onClick={onHomeClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary p-2 rounded-lg text-white">
              < GraduationCap size={24} />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Lumdim</h1>
              <p className="text-[10px] text-gray-500">{isTeacher ? 'מרחב עבודה פדגוגי' : 'המורה החכם שלך'}</p>
            </div>
          </button>
          
          <div className="flex items-center gap-1 md:gap-3">
             <button
               onClick={onUpgradeClick}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border shadow-sm text-xs font-black ${
                 subscriptionType === 'Pro' 
                   ? 'bg-amber-500 text-white border-amber-300 hover:scale-105' 
                   : 'bg-amber-400 text-white border-amber-300 hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
               }`}
               title={subscriptionType === 'Pro' ? "ניהול מנוי Pro" : "שדרוג ל-Pro"}
             >
                <Crown size={16} className="text-white" />
                <span className="hidden sm:inline">{subscriptionType === 'Pro' ? 'מנוי Pro' : 'שדרוג ל-Pro'}</span>
             </button>

             {notificationsEnabled && isTeacher && (
                <button
                  onClick={onNotificationsClick}
                  className="relative p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all mr-1"
                  title="התראות"
                >
                   <Bell size={22} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                     </span>
                   )}
                </button>
             )}

             {isTeacher && (
               <button
                 onClick={onLibraryClick}
                 className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                 title="ספרייה"
               >
                  <Library size={18} className="md:ml-2" />
                  <span className="hidden md:inline">ספרייה</span>
               </button>
             )}

             {!isTeacher && (
                <>
                  <button
                    onClick={onAchievementsClick}
                    className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 px-2 py-1 rounded-lg transition-colors"
                    title="ההישגים שלי"
                  >
                    <Trophy size={18} className="md:ml-2" />
                    <span className="hidden md:inline">הישגים</span>
                  </button>

                  <button
                    onClick={onCalendarClick}
                    className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    title="היומן שלי"
                  >
                    <CalendarDays size={18} className="md:ml-2" />
                    <span className="hidden md:inline">יומן</span>
                  </button>
                </>
             )}

             <button
               onClick={onClassroomClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
               title="הכיתה שלי"
             >
                <School size={18} className="md:ml-2" />
                <span className="hidden md:inline">כיתה</span>
             </button>

             <button
               onClick={onHomeClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
               title={isTeacher ? "לוח בקרה" : "מקצועות"}
             >
                <LayoutGrid size={18} className="md:ml-2" />
                <span className="hidden md:inline">{isTeacher ? 'לוח בקרה' : 'מקצועות'}</span>
             </button>

             <button
               onClick={onHistoryClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
               title={isTeacher ? "מאגר חומרים" : "היסטוריית תרגול"}
             >
                {isTeacher ? <FolderOpen size={18} className="md:ml-2" /> : <History size={18} className="md:ml-2" />}
                <span className="hidden md:inline">{isTeacher ? 'מאגר חומרים' : 'היסטוריה'}</span>
             </button>

             <button
               onClick={onProfileClick}
               className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-xl transition-colors"
               title="פרופיל והגדרות"
             >
               {userPhoto ? (
                 <img src={userPhoto} alt={userName || ''} className="w-8 h-8 rounded-full border border-gray-100 object-cover" />
               ) : (
                 <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-sm">
                   {userName ? userName[0].toUpperCase() : <UserCircle size={20} />}
                 </div>
               )}
               <span className="hidden md:inline text-xs font-bold text-gray-700">{userName}</span>
             </button>
          </div>
          </div>
        </div>
    </header>
  );
};

export default Header;
