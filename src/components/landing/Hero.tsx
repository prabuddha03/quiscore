"use client"
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Zap, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAuthModal } from '@/context/AuthModalContext';
import { useCreateEventModal } from '@/context/CreateEventModalContext';

export function Hero() {
  const { status } = useSession();
  const { openSignInModal } = useAuthModal();
  const { openCreateEventModal } = useCreateEventModal();

  const handleCreateEventClick = () => {
    if (status === 'authenticated') {
      openCreateEventModal();
    } else {
      openSignInModal();
    }
  };

  return (
    <section className="relative bg-black text-white h-screen flex items-center justify-center" id="home">
      {/* Background Gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-80"></div>
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-r from-orange-500/20 to-transparent blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-l from-blue-500/20 to-transparent blur-3xl animate-pulse-slow animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
            className="inline-block mb-6"
          >
            <Link href="/dashboard" className="group inline-flex items-center rounded-full border border-white/20 bg-white/5 p-1 pr-2 text-sm text-gray-300 transition-all duration-300 hover:bg-white/10">
                <span className="rounded-full bg-orange-500/80 px-3 py-1 text-xs font-semibold leading-5 text-black">
                  New
                </span>
                <span className="ml-2">For Quizzes, Sports, and More</span>
                <ChevronRight className="ml-2 h-4 w-4 text-gray-500 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
            <span className="block">The Ultimate Platform for</span>
            <span className="block text-transparent pb-4 bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Live Scoring</span>
          </h1>
          <p className="mt-6 max-w-md mx-auto text-lg text-gray-400 sm:max-w-xl">
          QuiScore is a real-time scoring platform for quizzes, hackathons, debates, corporate events, and tournaments—so you can compete, while we handle the scores.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button size="lg" onClick={handleCreateEventClick} className="bg-orange-500 text-black font-semibold hover:bg-orange-600 shadow-lg shadow-orange-500/20">
                Create an Event <Zap className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
               <Link href="#features">
                <Button size="lg" variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white">
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 