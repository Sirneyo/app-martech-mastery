import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SYSTEM_CONTEXT = `You are a helpful AI assistant for the MarTech Mastery Academy student platform. 
You help students navigate the platform, understand their cohort progress, and answer questions about the program.

Platform navigation guide:
- Dashboard: Overview of progress and stats
- StudentDashboard: Main student home with cohort info, points, and leaderboard
- StudentAssignments: View and submit weekly assignments
- StudentProjects: View and submit projects
- StudentPortfolio: Manage portfolio items needed for certification
- StudentCertification: Take the certification exam (unlocks at week 8)
- MyPortfolio: Portfolio overview
- MyProjects: Projects overview
- StudentProfile: Update your profile
- StudentAITools: AI tools provided by the academy
- MarketoAccess: Access the shared Marketo platform
- BeginLearning: Access the Kajabi learning library

Key facts about the program:
- The program runs for 12 weeks
- Students earn points by submitting assignments and projects
- Portfolio items must be approved by a tutor for certification
- The certification exam unlocks at week 8 and has 4 attempts
- The exam has 80 questions across multiple sections with a time limit of 100 minutes
- Students need 65 correct answers to pass the exam
- Tutors review and grade submissions and portfolio items
- WhatsApp community is available for peer support

Be concise, friendly, and helpful. If asked how to navigate somewhere, mention the section name clearly.`;

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your MarTech Mastery AI assistant. How can I help you today? I can help you navigate the platform, answer questions about your cohort, assignments, certification, and more! 🎓" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
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