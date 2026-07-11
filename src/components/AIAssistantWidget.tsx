import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, PhoneCall, HelpCircle, ShieldCheck, Sparkles, User, Truck, CreditCard } from 'lucide-react';
import { useAppState } from '../AppContext';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const AIAssistantWidget: React.FC = () => {
  const { settings, courierSettings, paymentNumbers } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `স্বাগতম! আমি আপনার YOUNG Style হেল্প অ্যাসিস্ট্যান্ট 🌸 পোশাকের মান, সাইজ, ডেলিভারি বা যেকোনো জরুরি যোগাযোগে আমি আপনাকে দ্রুত তথ্য দিয়ে সাহায্য করতে প্রস্তুত। আপনার প্রশ্নটি টাইপ করুন বা নিচের সাহায্যকারী বাটনগুলো ব্যবহার করুন।`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSuggest = (topic: string) => {
    let userText = '';
    let responseText = '';

    if (topic === 'emergency') {
      userText = '📞 জরুরি যোগাযোগ (Emergency)';
      responseText = `আমাদের সাথে যেকোনো প্রয়োজনে সরাসরি কথা বলতে পারেন:
📞 ফোন করুন: ${settings.phone || '+8801712345678'}
✉️ ইমেইল: ${settings.email || 'info@youngstyle.com'}
🏠 আমাদের শো-রুম: ${settings.address || 'সাভার বাজার রোড, সাভার, ঢাকা'}

আমরা ২৪ ঘণ্টার মধ্যে যেকোনো সমস্যার সমাধান দিতে প্রস্তুত! 🌸`;
    } else if (topic === 'delivery') {
      userText = '🚚 ডেলিভারি চার্জ ও সময়';
      responseText = `আমাদের ডেলিভারি পলিসি অত্যন্ত সহজ ও দ্রুত:
📍 সাভারের ভেতরে ডেলিভারি চার্জ: ৳${courierSettings.insideSavarCharge} (সময়: ২৪-৪৮ ঘণ্টা)
📍 সাভারের বাইরে ডেলিভারি চার্জ: ৳${courierSettings.outsideSavarCharge} (সময়: ২-৩ দিন)

🎉 যেকোনো ৩টি প্রোডাক্ট অর্ডারে পুরো বাংলাদেশে ডেলিভারি সম্পূর্ণ ফ্রি!`;
    } else if (topic === 'payment') {
      userText = '💳 পেমেন্ট করার নিয়ম';
      responseText = `আপনি অত্যন্ত নিরাপদে দুইভাবে পেমেন্ট করতে পারবেন:
১. ক্যাশ অন ডেলিভারি (হাতেনাতে ক্যাশ পেমেন্ট)
২. মোবাইল ব্যাংকিং (অ্যাডভান্স ডেলিভারি চার্জ বা ফুল পেমেন্ট):
   📱 বিকাশ (bKash): ${paymentNumbers.bkash} (পার্সোনাল)
   📱 নগদ (Nagad): ${paymentNumbers.nagad} (পার্সোনাল)
   
টাকা পাঠানোর পর অবশ্যই ট্রানজেকশন আইডি ইনপুট দিবেন।`;
    } else if (topic === 'quality') {
      userText = '👕 শার্ট ও টি-শার্টের মান কেমন?';
      responseText = `আমাদের পোশাকের বৈশিষ্ট্যসমূহ:
✅ ১০০% প্রিমিয়াম সুতি কাপড়ে (Premium Combed Cotton) তৈরি
✅ কালার গ্যারান্টি (১০০% রঙ পাকা ও কালার ফাস্টনেস উন্নত)
✅ স্টাইলিশ এবং রেগুলার ফিটিং যা তরুণদের খুবই মানানসই
✅ এভেলেবল সাইজসমূহ: M, L, XL, XXL (বিস্তারিত সাইজ চার্ট প্রতিটি প্রোডাক্ট কার্ডে পাবেন)`;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date()
      }]);
    }, 850);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let reply = '';
      const q = query.toLowerCase();

      if (q.includes('যোগাযোগ') || q.includes('জরুরি') || q.includes('নাম্বার') || q.includes('phone') || q.includes('contact') || q.includes('emergency') || q.includes('call')) {
        reply = `যেকোনো প্রয়োজনে সরাসরি আমাদের গ্রাহক সেবায় ফোন করুন:
📞 মোবাইল: ${settings.phone || '+8801712345678'}
✉️ ইমেইল: ${settings.email || 'info@youngstyle.com'}
🏠 আমাদের শো-রুম: ${settings.address || 'সাভার বাজার রোড, সাভার, ঢাকা'}`;
      } else if (q.includes('ডেলিভারি') || q.includes('চার্জ') || q.includes('ডেলিভারী') || q.includes('delivery') || q.includes('charge') || q.includes('শিপিং')) {
        reply = `আমাদের ডেলিভারি চার্জ ও সময়:
📍 সাভারের ভেতরে: ৳${courierSettings.insideSavarCharge} (২৪-৪৮ ঘণ্টা)
📍 সাভারের বাইরে: ৳${courierSettings.outsideSavarCharge} (২-৩ দিন)
🎉 ৩টি প্রোডাক্ট একসাথে কিনলে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!`;
      } else if (q.includes('পেমেন্ট') || q.includes('বিকাশ') || q.includes('নগদ') || q.includes('টাকা') || q.includes('payment') || q.includes('bkash') || q.includes('nagad') || q.includes('pay')) {
        reply = `আমরা ক্যাশ অন ডেলিভারি এবং মোবাইল পেমেন্ট সাপোর্ট করি:
📱 বিকাশ পার্সোনাল: ${paymentNumbers.bkash}
📱 নগদ পার্সোনাল: ${paymentNumbers.nagad}
অর্ডার কনফার্মেশনের জন্য অ্যাডভান্স চার্জ পাঠালে এই নাম্বারে ক্যাশআউট/সেন্ডমানি করুন।`;
      } else if (q.includes('সাইজ') || q.includes('কোয়ালিটি') || q.includes('কাপড়') || q.includes('quality') || q.includes('size') || q.includes('shirt') || q.includes('tshirt') || q.includes('মান')) {
        reply = `আমাদের সকল পোশাক ১০০% প্রিমিয়াম সুতি কাপড়ে তৈরি, অত্যন্ত আরামদায়ক এবং টেকসই প্রিন্ট যুক্ত। 
📐 এভেলেবল সাইজসমূহ: M, L, XL, XXL (শার্ট ও টি-শার্ট)। রঙ ও কাপড়ের কোয়ালিটির ব্যাপারে আমরা শতভাগ গ্যারান্টি দিচ্ছি।`;
      } else if (q.includes('হাই') || q.includes('হ্যালো') || q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('সালাম')) {
        reply = `হ্যালো! আমি আপনার শপিং অ্যাসিস্ট্যান্ট 🌸 পোশাক, ডেলিভারি চার্জ, পেমেন্ট নম্বর বা যেকোনো প্রবলেমে আমাদের সাথে জরুরি যোগাযোগ করতে পারেন। আমি আপনাকে কোনো বিষয়ে সাহায্য করব বলুন?`;
      } else {
        reply = `আপনার প্রশ্নটি আমি বুঝতে পেরেছি 🌸 পোশাকের সাইজ, ডেলিভারি বা বিকাশ নম্বরের জন্য নিচের বাটনগুলো ক্লিক করতে পারেন। অথবা সরাসরি কথা বলতে আমাদের হেল্পলাইনে কল করুন: ${settings.phone || '+8801712345678'}`;
      }

      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date()
      }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      
      {/* Expanded Chat Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-[320px] sm:w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1877F2] to-blue-600 p-4 text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs text-white border border-white/40 animate-pulse-glow">
                    🌸
                  </div>
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black tracking-wide leading-none">YOUNG AI Assistant</h4>
                  <p className="text-[9px] text-blue-100 font-bold mt-1 uppercase flex items-center gap-1">
                    <Sparkles className="h-2 w-2 text-amber-200" />
                    Custom Care 24/7
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors text-white focus:outline-hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50"
            >
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`flex gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'assistant' && (
                    <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center text-[10px] font-black shrink-0">
                      AI
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed shadow-xs whitespace-pre-line ${
                    m.sender === 'user' 
                      ? 'bg-[#1877F2] text-white rounded-br-none font-bold' 
                      : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 justify-start items-center">
                  <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center text-[10px] font-black shrink-0">
                    AI
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Predefined suggestion buttons for single-click answers */}
            <div className="px-3 py-2 bg-white border-t border-gray-50 flex flex-wrap gap-1.5 shrink-0">
              <button 
                onClick={() => handleSuggest('emergency')}
                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
              >
                <PhoneCall className="h-2.5 w-2.5" />
                <span>জরুরি যোগাযোগ</span>
              </button>
              <button 
                onClick={() => handleSuggest('delivery')}
                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
              >
                <Truck className="h-2.5 w-2.5" />
                <span>ডেলিভারি চার্জ</span>
              </button>
              <button 
                onClick={() => handleSuggest('payment')}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
              >
                <CreditCard className="h-2.5 w-2.5" />
                <span>পেমেন্ট নম্বর</span>
              </button>
              <button 
                onClick={() => handleSuggest('quality')}
                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg transition-all flex items-center gap-1"
              >
                <HelpCircle className="h-2.5 w-2.5" />
                <span>কাপড়ের মান</span>
              </button>
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleSend}
              className="p-2 bg-white border-t border-gray-100 flex gap-1.5 shrink-0"
            >
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="যেকোনো প্রশ্ন এখানে লিখুন..."
                className="flex-1 bg-slate-50 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:bg-white focus:border-[#1877F2] focus:outline-hidden"
              />
              <button 
                type="submit"
                className="p-2 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
                title="Send Message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher Button with beautiful cute animation */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-r from-[#1877F2] via-blue-500 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer relative z-50 hover:shadow-blue-500/30 transition-shadow"
        id="btn-ai-widget"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] font-black text-white items-center justify-center">1</span>
        </span>
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <span className="text-xl leading-none animate-bounce">🌸</span>
            <span className="text-[8px] font-black tracking-tighter uppercase leading-none mt-0.5">Contact</span>
          </div>
        )}
      </motion.button>

    </div>
  );
};
