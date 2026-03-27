import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, X, Send, Bot, Loader2, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SYSTEM_CONTEXT = `You are a helpful AI assistant for the MarTech Mastery Academy student platform. 
You help students navigate the platform, understand their cohort progress, and answer questions about the program.

Platform navigation guide:
- StudentDashboard: Main student home with cohort info, points, and leaderboard
- StudentAssignments: View and submit weekly assignments
- StudentProjects: View and submit projects
- StudentPortfolio: Manage portfolio items needed for certification
- StudentCertification: Take the certification exam (unlocks at week 8)
- StudentProfile: Update your profile
- StudentAITools: AI tools provided by the academy
- MarketoAccess: Access the shared Marketo platform
- BeginLearning: Access the Kajabi learning library

Key facts about the program:
- The program runs for 12 weeks
- Students earn points by submitting assignments and projects
- Portfolio items must be approved by a tutor for certification
- The certification exam unlocks at week 8 and has 4 attempts
- The exam has 80 questions with a 100 minute time limit
- Students need 65 correct answers to pass the exam
- Tutors review and grade all submissions and portfolio items
- A WhatsApp community is available for peer support

Be concise, friendly, and helpful. When suggesting navigation, mention the section name clearly.`;

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your MarTech Mastery AI assistant 🎓\n\nI can help you navigate the platform, answer questions about your cohort, assignments, certification, and more. What would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [btnPos, setBtnPos] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ai-btn-pos') || 'null'); } catch { return null; }
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${SYSTEM_CONTEXT}

Previous conversation:
${conversationHistory}

Student: ${userMessage}
Assistant:`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const btnRef = useRef(null);

  const handleBtnPointerDown = (e) => {
    e.preventDefault();
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // offset of pointer within the button
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    dragState.current = { dragging: false, startX: e.clientX, startY: e.clientY, offsetX, offsetY };

    const onMove = (ev) => {
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      if (!dragState.current.dragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        dragState.current.dragging = true;
      }
      if (!dragState.current.dragging) return;
      const newPos = {
        left: Math.max(8, Math.min(window.innerWidth - 64, ev.clientX - dragState.current.offsetX)),
        top: Math.max(8, Math.min(window.innerHeight - 64, ev.clientY - dragState.current.offsetY)),
      };
      setBtnPos(newPos);
      sessionStorage.setItem('ai-btn-pos', JSON.stringify(newPos));
    };

    const onUp = () => {
      if (!dragState.current.dragging) setOpen(true);
      dragState.current.dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setInput(prev => prev + (prev ? ' ' : '') + file_url);
    setUploadingFile(false);
    e.target.value = '';
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={btnRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onPointerDown={handleBtnPointerDown}
            style={btnPos ? { left: btnPos.left, top: btnPos.top, bottom: 'auto', right: 'auto' } : { bottom: '1.5rem', right: '1.5rem' }}
            className="fixed z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 rounded-full shadow-xl flex items-center justify-center text-white hover:shadow-2xl hover:shadow-purple-500/40 transition-shadow cursor-grab active:cursor-grabbing select-none"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">MarTech AI Assistant</p>
                  <p className="text-white/70 text-xs">Always here to help</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white rounded-2xl rounded-tr-none'
                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
              <div className="flex gap-2 items-end bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-transparent transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-slate-400 max-h-24 py-0.5"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-violet-600 transition-colors disabled:opacity-40"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-violet-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}