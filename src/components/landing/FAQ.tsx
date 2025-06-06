"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'What is QuiScore?',
    answer: 'QuiScore is a real-time scoring platform designed for any live event. It allows organizers to manage participants or teams, track scores, and display a live scoreboard to the audience.',
  },
  {
    question: 'Can I customize the scoring rules?',
    answer: 'Yes, absolutely! Our Pro plan allows you to set custom rules for any game, like points per round in a quiz, sets in a badminton match, or custom values for any other competition. You have full control over the scoring logic.',
  },
  {
    question: 'Is there a limit to the number of participants or teams?',
    answer: 'The Hobby plan supports up to 10 participants or teams. The Pro and Enterprise plans allow for unlimited teams and scoring events, so you can scale your event to any size.',
  },
  {
    question: 'How does the public scoreboard work?',
    answer: 'With the Pro plan, you get a shareable link to a public scoreboard. Your audience can access this link from any device to see live score updates as they happen.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'We offer community support for our Hobby plan users. Pro plan users get priority email support, and Enterprise customers receive a dedicated account manager and personalized training.',
  },
  {
    question: 'Can I try QuiScore before committing to a plan?',
    answer: 'Yes, our Hobby plan is the perfect way to try out QuiScore. You can create an event, add participants, and test the real-time scoring features for any type of event to see if it is the right fit for you.',
  },
];

interface FaqItemProps {
  faq: {
    question: string;
    answer: string;
  };
  isOpen: boolean;
  onClick: () => void;
}

function FaqItem({ faq, isOpen, onClick }: FaqItemProps) {
  return (
    <motion.div 
      className="border-b border-white/10"
      layout
    >
      <button
        className="flex w-full items-center justify-between py-5 text-left text-lg font-medium text-white"
        onClick={onClick}
      >
        <span>{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-6 w-6 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-gray-400">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-black py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Have questions? We have got answers. If you cannot find what you are looking for, feel free to contact us.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-3xl">
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              faq={faq}
              isOpen={openIndex === index}
              onClick={() => handleClick(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
} 