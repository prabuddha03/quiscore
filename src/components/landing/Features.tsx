"use client";

import { motion } from 'framer-motion';
import { BarChart, Settings, Users, Share2, ShieldCheck, Zap } from 'lucide-react';

const features = [
  {
    icon: <Zap className="h-10 w-10 text-orange-500" />,
    title: 'Real-time Scoring',
    description: 'Update scores live and see the leaderboard change in real-time. No more manual calculations.',
  },
  {
    icon: <Settings className="h-10 w-10 text-blue-400" />,
    title: 'Customizable Rules',
    description: 'Define unique scoring for any game. Set points, penalties, and special rules for rounds or matches.',
  },
  {
    icon: <Users className="h-10 w-10 text-green-400" />,
    title: 'Team & Player Management',
    description: 'Easily create and manage teams or individual players for your event. Add or remove them on the fly.',
  },
  {
    icon: <BarChart className="h-10 w-10 text-purple-400" />,
    title: 'Score Analytics',
    description: 'Get detailed analytics on performance, scoring trends, and event statistics.',
  },
   {
    icon: <Share2 className="h-10 w-10 text-pink-400" />,
    title: 'Public Scoreboard',
    description: 'Share a public link to the scoreboard for your audience to follow along live.',
  },
  {
    icon: <ShieldCheck className="h-10 w-10 text-teal-400" />,
    title: 'Secure & Reliable',
    description: 'Built with modern technology to ensure your data is safe and the platform is always available.',
  },
];

const cardVariants = {
  offscreen: {
    y: 50,
    opacity: 0
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      bounce: 0.4,
      duration: 0.8
    }
  }
};

export function Features() {
  return (
    <section id="features" className="bg-black py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Why scorOps?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Everything you need to run a successful event, all in one place.
          </p>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-gray-900/50 p-8 border border-white/10"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 30px rgba(255, 255, 255, 0.1)" }}
            >
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-10 rounded-full bg-gradient-to-tr from-orange-500 to-transparent blur-2xl"></div>
              <div className="relative">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black border border-white/10">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="mt-4 text-gray-400">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 