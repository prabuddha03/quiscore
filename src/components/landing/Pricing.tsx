"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

const pricingPlans = [
  {
    name: 'Hobby',
    price: '$0',
    description: 'For small, casual events and tournaments.',
    features: [
      'Up to 10 teams or players',
      'Unlimited scoring events',
      'Real-time scoreboard',
      'Basic scoring rules',
      'Community support',
    ],
    cta: 'Get Started for Free',
    isPopular: false,
    href: '/create'
  },
  {
    name: 'Pro',
    price: '$3',
    pricePeriod: '/event',
    description: 'For professional organizers and larger events.',
    features: [
      'Unlimited teams & players',
      'Advanced scoring rules',
      'Custom branding',
      'Public scoreboard sharing',
      'Priority email support',
      'Detailed analytics'
    ],
    cta: 'Choose Pro',
    isPopular: true,
    href: '/create'
  },
   {
    name: 'Enterprise',
    price: 'Contact Us',
    description: 'For large-scale organizations with custom needs.',
    features: [
        'Everything in Pro',
        'Dedicated account manager',
        'Custom integrations (API access)',
        'On-premise deployment options',
        'SLA and advanced security',
        'Personalized onboarding & training'
    ],
    cta: 'Contact Sales',
    isPopular: false,
    href: '#contact'
  },
];

const cardVariants = {
  offscreen: {
    y: 50,
    opacity: 0,
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4,
      duration: 0.8,
    },
  },
};

export function Pricing() {
  return (
    <section id="pricing" className="bg-black py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Find the perfect plan
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Start for free and scale up as you grow. No hidden fees.
          </p>
        </div>
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.5 }}
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -10 }}
              className={`relative flex flex-col rounded-2xl p-8 border ${
                plan.isPopular 
                  ? 'border-orange-500 bg-gray-900' 
                  : 'border-white/10 bg-gray-900/50'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-2 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-semibold text-black">
                    <Star className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <p className="mt-4 text-gray-400">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                {plan.pricePeriod && (
                    <span className="text-base font-medium text-gray-400">{plan.pricePeriod}</span>
                )}
              </div>
              <ul className="mt-8 space-y-4 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href={plan.href} className='w-full'>
                    <Button 
                        size="lg" 
                        className={`w-full font-semibold ${
                            plan.isPopular 
                            ? 'bg-orange-500 text-black hover:bg-orange-600'
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                    >
                        {plan.cta}
                    </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 