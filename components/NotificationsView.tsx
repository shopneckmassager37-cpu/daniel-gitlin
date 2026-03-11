
import React from 'react';
import { Bell, ArrowRight, Clock, MessageSquare, ClipboardCheck, ChevronLeft, Video } from 'lucide-react';
import { Notification } from '../types.ts';

interface NotificationsViewProps {
  notifications: Notification[];
  onBack: () => void;
  onOpenNotification: (notif: Notification) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onBack, onOpenNotification }) => {
  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm group">
            <ArrowRight size={24} />
          </button>
          <h2 className="text-3xl font-black text-gray-900">התראות</h2>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white p-16 rounded-[2.5rem] shadow-sm border border-gray-100 text-center space-y-6">
          <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
            <Bell size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900">אין לך התראות עדיין</h3>
            <p className="text-gray-500 font-bold max-w-xs mx-auto">כאשר תיהיה פעילות באחת הכיתות שלך זה יופיע כאן</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onOpenNotification(n)}
              className={`w-full text-right p-6 bg-white rounded-[2rem] border transition-all flex items-center justify-between group ${(n.read || n.isRead) ? 'border-gray-50 opacity-80' : 'border-blue-100 shadow-md ring-1 ring-blue-50'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl ${n.type === 'CHAT' ? 'bg-purple-50 text-purple-600' : (n.type === 'MEETING' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')} shadow-sm`}>
                  {n.type === 'CHAT' ? <MessageSquare size={24} /> : (n.type === 'MEETING' ? <Video size={24} /> : <ClipboardCheck size={24} />)}
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-gray-900 text-lg">{n.title}</h4>
                  <p className="text-gray-600 font-bold text-sm">{n.text || n.message}</p>
                  <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                    <Clock size={12} />
                    <span>{new Date(n.timestamp).toLocaleString('he-IL')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 {!(n.read || n.isRead) && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>}
                 <ChevronLeft size={20} className="text-gray-300 group-hover:text-primary transition-all" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
