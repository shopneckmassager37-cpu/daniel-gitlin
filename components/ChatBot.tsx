
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Paperclip, X, Image as ImageIcon, Sparkles, RotateCcw, MessageCircle, ArrowRight } from 'lucide-react';
import { ChatMessage, Subject, Grade, ChatSession } from '../types.ts';
import { getChatResponseStream } from '../services/geminiService.ts';
import { GenerateContentResponse } from "@google/genai";
import LatexRenderer from './LatexRenderer.tsx';
import { Trash2, Plus, History } from 'lucide-react';

interface ChatBotProps {
  subject: Subject | null;
  grade: Grade | null;
  userName?: string | null;
  initialMessage?: string | null;
  isTeacher?: boolean;
  isPro?: boolean;
  schoolCode?: string | null;
  checkAndIncrementAiLimit?: (type: 'PRACTICE' | 'SUMMARY' | 'CHAT' | 'TEST_PREP') => boolean;
  chatHistory?: ChatSession[];
  onSaveSession?: (session: ChatSession) => void;
  onDeleteSession?: (id: string) => void;
  onBack?: () => void;
}

const CHAT_LOADING_MESSAGES = [
    "מקליד...",
    "חושב על תשובה...",
    "בודק בספרים...",
    "מנסח את המשפט...",
    "רגע אחד..."
];

const ChatBot: React.FC<ChatBotProps> = ({ 
  subject, grade, userName, initialMessage, isTeacher, isPro, schoolCode, checkAndIncrementAiLimit,
  chatHistory = [], onSaveSession, onDeleteSession, onBack
}) => {
  const getIntroMessage = () => {
    if (!subject) {
      return `שלום המורה ${userName || 'אורח בדיקה'}! אני עוזר ההוראה הדיגיטלי שלך. איך אוכל לעזור לך היום בתכנון השיעור או בניסוח חומרים מקצועיים?`;
    }
    return isTeacher 
        ? `שלום המורה ${userName || ''}! אני עוזר ההוראה הדיגיטלי שלך. איך אוכל לעזור לך היום בתכנון השיעור או בניסוח חומרים מקצועיים ל${subject}?`
        : `שלום ${userName || ''}! אני המורה הפרטי שלך ל${subject}. איך אני יכול לעזור לך היום בחומר של ${grade}?`;
  };

  const [currentSessionId, setCurrentSessionId] = useState<string>(Date.now().toString());
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'model',
      text: getIntroMessage(),
      timestamp: Date.now()
    }
  ]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [attachment, setAttachment] = useState<{file: File, preview: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
       interval = setInterval(() => {
          setLoadingMsgIndex((prev) => (prev + 1) % CHAT_LOADING_MESSAGES.length);
       }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = async (overrideMessage?: string) => {
    const finalInput = overrideMessage || input;
    if ((!finalInput.trim() && !attachment) || isLoading) return;

    // Check AI limit
    if (checkAndIncrementAiLimit && !checkAndIncrementAiLimit('CHAT')) {
      alert("הגעת למכסת הודעות ה-AI היומיות שלך. נסה שוב מחר!");
      return;
    }

    let attachmentData = undefined;
    if (attachment) {
      const base64Data = attachment.preview.split(',')[1];
      attachmentData = {
        mimeType: attachment.file.type,
        data: base64Data
      };
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: finalInput,
      timestamp: Date.now(),
      attachment: attachmentData
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => !m.attachment)
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      // Fixed: The returned stream is now correctly inferred as AsyncIterable<GenerateContentResponse> 
      // from the source service, which allows the for-await iteration below.
      const stream = await getChatResponseStream(history, userMessage.text, subject || undefined, grade || undefined, attachmentData);
      
      let fullResponse = '';
      const botMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: botMessageId,
        role: 'model',
        text: '',
        timestamp: Date.now()
      }]);

      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullResponse += c.text;
          setMessages(prev => {
            const newMessages = prev.map(msg => 
              msg.id === botMessageId ? { ...msg, text: fullResponse } : msg
            );
            // Save session after each chunk or at the end
            return newMessages;
          });
        }
      }

      // Final save
      const finalMessages: ChatMessage[] = [...messages, userMessage, {
        id: botMessageId,
        role: 'model',
        text: fullResponse,
        timestamp: Date.now()
      }];
      
      if (onSaveSession) {
        onSaveSession({
          id: currentSessionId,
          title: userMessage.text.slice(0, 30) + (userMessage.text.length > 30 ? '...' : ''),
          messages: finalMessages,
          timestamp: Date.now(),
          type: isTeacher ? 'TEACHING_ASSISTANT' : 'CHAT',
          subject: subject || undefined
        });
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model' as const,
        text: 'סליחה, הייתה בעיה בתקשורת. נסה שוב מאוחר יותר.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessage && initialMessage !== autoSentRef.current) {
      autoSentRef.current = initialMessage;
      // Start a new session for help context
      const newId = Date.now().toString();
      setCurrentSessionId(newId);
      setMessages([
        {
          id: 'intro',
          role: 'model' as const,
          text: getIntroMessage(),
          timestamp: Date.now()
        }
      ]);
      handleSend(`עזור לי להבין את הקטע הבא: ${initialMessage}`);
    }
  }, [initialMessage]);

  const startNewChat = () => {
    setCurrentSessionId(Date.now().toString());
    setMessages([
      {
        id: 'intro',
        role: 'model' as const,
        text: getIntroMessage(),
        timestamp: Date.now()
      }
    ]);
    setShowHistory(false);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  const filteredHistory = chatHistory.filter(s => s.type === (isTeacher ? 'TEACHING_ASSISTANT' : 'CHAT'));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment({
          file: file,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto h-[800px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-gray-100 relative text-right" dir="rtl">
        <div className={`p-5 border-b border-gray-100 flex items-center justify-between ${isTeacher ? 'bg-gradient-to-r from-indigo-50/80 to-white' : 'bg-gradient-to-r from-accent/5 to-white'}`}>
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all ml-2"
                title="חזרה"
              >
                <ArrowRight size={24} className="rotate-180" />
              </button>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isTeacher ? 'bg-indigo-600 text-white' : 'bg-accent text-white'}`}>
              {isTeacher ? <Sparkles size={20} /> : <Bot size={20} />}
            </div>
            <div>
              <h3 className="font-black text-lg text-gray-900">{isTeacher ? 'עוזר הוראה חכם' : 'המורה הפרטי שלך'}</h3>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">מחובר ומוכן לעזור</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="היסטוריית שיחות"
            >
              <History size={18} />
            </button>
            <button 
              onClick={startNewChat}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="שיחה חדשה"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      
      <div className="flex-1 overflow-hidden flex relative">
        {/* History Sidebar/Overlay */}
        {showHistory && (
          <div className="absolute inset-0 z-20 bg-white border-l border-gray-100 animate-slide-in-right overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-gray-800">היסטוריית שיחות</h4>
              <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {filteredHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">אין שיחות קודמות</p>
              ) : (
                filteredHistory.map(session => (
                  <div 
                    key={session.id}
                    className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${currentSessionId === session.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                    onClick={() => loadSession(session)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{session.title}</p>
                      <p className="text-[10px] text-gray-400">{new Date(session.timestamp).toLocaleDateString('he-IL')}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteSession) onDeleteSession(session.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30 scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
              <div className="bg-gray-100 p-8 rounded-[3rem] mb-6">
                <MessageCircle size={64} className="text-gray-400" />
              </div>
              <h4 className="text-2xl font-black text-gray-900 mb-2">איך אוכל לעזור לך היום?</h4>
              <p className="text-gray-600 font-medium max-w-xs">שאל אותי כל דבר על חומר הלימוד, בקש סיכום או תרגול נוסף.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${msg.role === 'user' ? 'bg-blue-600 text-white' : (isTeacher ? 'bg-indigo-100 text-indigo-600' : 'bg-accent text-white')}`}>
                {msg.role === 'user' ? <User size={20} /> : (isTeacher ? <Sparkles size={20} /> : <Bot size={20} />)}
              </div>
              <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.attachment && (
                  <div className="rounded-2xl overflow-hidden border-4 border-white shadow-md mb-1 max-w-[280px] group relative">
                    <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="attachment" className="w-full h-auto" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                  </div>
                )}
                {msg.text && (
                  <div className={`p-5 rounded-[2rem] text-base font-medium shadow-sm border leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' 
                      : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
                  }`}>
                    <LatexRenderer text={msg.text} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 text-gray-400 text-xs ml-14 animate-pulse font-bold bg-white/80 backdrop-blur-sm w-fit px-5 py-3 rounded-full shadow-sm border border-gray-100">
              <Loader2 className="animate-spin text-accent" size={16} />
              <span>{CHAT_LOADING_MESSAGES[loadingMsgIndex]}</span>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100">
          <div className="max-w-3xl mx-auto relative">
            {attachment && (
              <div className="absolute bottom-full left-0 mb-4 animate-slide-up">
                <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                    <img src={attachment.preview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="pr-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">קובץ מצורף</p>
                    <p className="text-xs font-bold text-gray-700 max-w-[120px] truncate">{attachment.file.name}</p>
                  </div>
                  <button onClick={removeAttachment} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-3 bg-gray-50 p-3 rounded-[2.5rem] border-2 border-gray-100 focus-within:border-accent/30 focus-within:bg-white focus-within:ring-8 focus-within:ring-accent/5 transition-all shadow-sm">
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-4 text-gray-400 hover:text-accent hover:bg-accent/5 rounded-full transition-all"
                title="צרף קובץ"
              >
                <Paperclip size={24} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf,text/*" className="hidden" />
              
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
                placeholder={isTeacher ? "כתוב הודעה לעוזר ההוראה..." : "שאל אותי כל דבר..."} 
                className="flex-1 py-4 px-2 bg-transparent border-none focus:outline-none resize-none max-h-48 min-h-[56px] font-bold text-lg text-right overflow-y-auto" 
                dir="rtl"
                rows={1} 
                disabled={isLoading} 
              />
              
              <button 
                onClick={() => handleSend()} 
                disabled={(!input.trim() && !attachment) || isLoading} 
                className={`p-4 rounded-full transition-all shadow-xl disabled:bg-gray-200 disabled:shadow-none disabled:scale-100 active:scale-95 ${
                  isTeacher ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-accent hover:bg-accent/90 shadow-accent/20'
                } text-white`}
              >
                <Send size={24} className={`transform scale-x-[-1] ${isLoading ? 'opacity-0' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 font-bold mt-3 uppercase tracking-widest">
              Lumdim AI עשוי לטעות, כדאי לאמת פרטים חשובים.
            </p>
          </div>
        </div>
    </div>
  );
};

export default ChatBot;
