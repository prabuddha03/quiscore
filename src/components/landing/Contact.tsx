"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

export function Contact() {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    // Here you would typically send the data to a backend endpoint
    // For this example, we'll simulate a network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(data);
    setIsSubmitting(false);
    setIsSuccess(true);
    reset();
    setTimeout(() => setIsSuccess(false), 5000);
  };

  return (
    <section id="contact" className="bg-gray-900/50 relative py-20 sm:py-32">
        <div className="absolute inset-0 z-0 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black to-transparent"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                    Get in Touch
                </h2>
                <p className="mt-4 text-lg text-gray-400">
                    Have a question, a proposal, or just want to say hello? Go ahead.
                </p>
            </div>
            <motion.div 
                className="mx-auto mt-16 max-w-xl"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8 }}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <Label htmlFor="name" className="text-gray-300">Name</Label>
                        <Input 
                            id="name" 
                            type="text" 
                            className="bg-gray-800 border-gray-700 text-white mt-2"
                            {...register('name', { required: 'Name is required' })}
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="email" className="text-gray-300">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            className="bg-gray-800 border-gray-700 text-white mt-2"
                            {...register('email', { 
                                required: 'Email is required',
                                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                            })}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="message" className="text-gray-300">Message</Label>
                        <Textarea 
                            id="message" 
                            rows={5}
                            className="bg-gray-800 border-gray-700 text-white mt-2"
                            {...register('message', { required: 'Message is required' })}
                        />
                        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message.message as string}</p>}
                    </div>
                    <div className="text-center">
                        <Button 
                            type="submit" 
                            size="lg" 
                            className="w-full sm:w-auto bg-yellow-400 text-black font-semibold hover:bg-yellow-500"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </Button>
                    </div>
                     {isSuccess && (
                        <p className="text-green-500 text-center mt-4">
                            Message sent successfully! We&apos;ll get back to you soon.
                        </p>
                    )}
                </form>
            </motion.div>
        </div>
    </section>
  );
} 