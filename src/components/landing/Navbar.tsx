"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
    { href: '#contact', label: 'Contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="h-8 w-8 text-orange-500" />
                    <span className="text-2xl font-bold text-white">QuiScore</span>
                </div>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
              {session ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black">Dashboard</Button>
                  </Link>
                  <Button onClick={() => signOut()} variant="ghost">Sign Out</Button>
                </>
              ) : (
                <Link href="/api/auth/signin">
                  <Button className="bg-orange-500 text-black hover:bg-orange-600">Sign In</Button>
                </Link>
              )}
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="bg-gray-900 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
             <div className="flex items-center px-5">
                {session ? (
                    <div className='w-full flex flex-col gap-2'>
                        <Link href="/dashboard" className='w-full'>
                            <Button variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black">Dashboard</Button>
                        </Link>
                        <Button onClick={() => signOut()} variant="ghost" className='w-full'>Sign Out</Button>
                    </div>
                ) : (
                    <Link href="/api/auth/signin" className='w-full'>
                        <Button className="w-full bg-orange-500 text-black hover:bg-orange-600">Sign In</Button>
                    </Link>
                )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 