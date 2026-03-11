
import React, { useState, useRef } from 'react';
import { X, User, Save, Camera, Trash2, Settings, Bell, Moon, Sun, Database, History, ShieldCheck, GraduationCap, LogIn, LogOut, ArrowRight, ChevronLeft, BarChart3 } from 'lucide-react';
import { UserSettings, Grade, UserRole } from '../types.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhoto: string;
  userGrade?: Grade;
  userRole?: UserRole;
  userSettings?: UserSettings;
  onUpdate: (name: string, photoUrl: string, settings: UserSettings, grade?: Grade) => void;
  onResetSystem?: () => void;
  onLogout?: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userName, userPhoto, userGrade, userRole, userSettings, onUpdate, onResetSystem, onLogout }) => {
  const [name, setName] = useState(userName);
  const [photo, setPhoto] = useState(userPhoto);
  const [grade, setGrade] = useState<Grade>(userGrade || Grade.NOT_DEFINED);
  
  const [settings, setSettings] = useState<UserSettings>(userSettings || {
    darkMode: false,
    notificationsEnabled: true,
    autoSaveDrafts: true,
    showProgressStats: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdate(name, photo, settings, grade);
    onClose();
  };

  const removePhoto = () => {
    setPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSetting = (key: keyof UserSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Settings size={24} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">הגדרות חשבון</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-10 no-scrollbar">
            <div className="space-y-10">
                {/* Profile Section */}
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-32 h-32 bg-gradient-to-br from-primary to-blue-600 text-white rounded-full flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                            {photo ? (
                              <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span>{name ? name[0].toUpperCase() : <User size={48} />}</span>
                            )}
                        </div>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-blue-600 transition-all transform hover:scale-110 border-4 border-white"
                          title="החלף תמונה"
                        >
                          <Camera size={20} />
                        </button>
                        {photo && (
                          <button 
                            onClick={removePhoto}
                            className="absolute top-0 left-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 border-2 border-white"
                            title="הסר תמונה"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                </div>

                <div className={`grid ${userRole === 'TEACHER' ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
                    <div>
                        <label className="block text-xs font-black text-gray-400 mb-2 text-right pr-1 uppercase tracking-widest">שם מלא</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all text-right font-bold shadow-inner"
                            placeholder="הקלד את השם שלך..."
                        />
                    </div>
                    {userRole !== 'TEACHER' && (
                      <div>
                          <label className="block text-xs font-black text-gray-400 mb-2 text-right pr-1 uppercase tracking-widest">כיתה</label>
                          <div className="relative">
                              <select 
                                  value={grade}
                                  onChange={(e) => setGrade(e.target.value as Grade)}
                                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all text-right font-bold shadow-inner appearance-none pr-10"
                              >
                                  {Object.values(Grade).map((g) => (
                                      <option key={g} value={g}>{g}</option>
                                  ))}
                              </select>
                              <GraduationCap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                      </div>
                    )}
                </div>

                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-1">העדפות ממשק ותפעול</h4>
                    
                    <div className="grid gap-4">
                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        {settings.darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">מצב כהה (Dark Mode)</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">התאמת הממשק לשעות הלילה</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('darkMode')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.darkMode ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.darkMode ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <Bell size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">התראות פעילות</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">קבלת עדכונים על משימות ומבחנים</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('notificationsEnabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.notificationsEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <History size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">שמירה אוטומטית של טיוטות</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">שמירת שינויים בעורך תוך כדי עבודה</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('autoSaveDrafts')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.autoSaveDrafts ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSaveDrafts ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <BarChart3 size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">הצגת סטטיסטיקות התקדמות</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">הצגת גרפים ונתוני למידה בדף הבית</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('showProgressStats')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.showProgressStats ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.showProgressStats ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="pt-6 border-t border-gray-200 mt-6 space-y-4">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-1 mb-4">ניהול חשבון</h4>
                                
                                <button 
                                    onClick={() => {
                                        onLogout?.();
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                            <LogOut size={18} className="scale-x-[-1]"/>
                                        </div>
                                        <div className="text-right">
                                            <h5 className="font-bold text-gray-800 text-sm">התנתקות מהמערכת</h5>
                                            <p className="text-[10px] text-gray-400 font-bold">חזרה למסך הכניסה</p>
                                        </div>
                                    </div>
                                    <ChevronLeft size={16} className="text-gray-300"/>
                                </button>

                                <button 
                                    onClick={() => {
                                        if (window.confirm('האם אתה בטוח שברצונך למחוק את החשבון? כל הנתונים, הכיתות וההתקדמות יימחקו לצמיתות.')) {
                                            onResetSystem?.();
                                        }
                                    }}
                                    className="w-full flex items-center justify-between p-5 bg-red-50 rounded-2xl border border-red-100 hover:bg-red-100 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-white rounded-lg text-red-500 shadow-sm group-hover:bg-red-500 group-hover:text-white transition-all">
                                            <Trash2 size={18}/>
                                        </div>
                                        <div className="text-right">
                                            <h5 className="font-bold text-red-800 text-sm">מחיקת חשבון לצמיתות</h5>
                                            <p className="text-[10px] text-red-400 font-bold">מחיקת כל המידע האישי וההתקדמות מהמערכת</p>
                                        </div>
                                    </div>
                                    <X size={16} className="text-red-300"/>
                                </button>
                            </div>
                    </div>
                </div>

                <div className="bg-gray-100 p-6 rounded-[2rem] text-center border border-gray-200">
                    <p className="text-gray-500 text-xs font-bold">גרסה: 1.1.3 (Account Management Update)</p>
                </div>
            </div>
        </div>

        <div className="p-8 bg-gray-50/80 border-t border-gray-100 flex gap-4">
            <button 
                onClick={handleSave}
                className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
            >
                <Save size={24} />
                <span>שמור שינויים</span>
            </button>
            <button 
                onClick={onClose}
                className="px-8 bg-white border border-gray-200 text-gray-500 font-bold py-5 rounded-2xl hover:bg-gray-100 transition-all"
            >
                ביטול
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
