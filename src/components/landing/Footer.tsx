import Link from 'next/link';
import { Zap, Twitter, Github, Linkedin } from 'lucide-react';

export function Footer() {
  const socialLinks = [
    { name: 'Twitter', icon: <Twitter className="h-5 w-5" />, href: '#' },
    { name: 'GitHub', icon: <Github className="h-5 w-5" />, href: '#' },
    { name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" />, href: '#' },
  ];

  const footerLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <footer className="bg-black border-t border-white/10 text-gray-400">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="md:col-span-1">
             <Link href="/" className="flex items-center gap-2">
                <Zap className="h-8 w-8 text-orange-500" />
                <span className="text-2xl font-bold text-white">QuiScore</span>
            </Link>
            <p className="mt-4 text-sm">
                The ultimate platform for live scoring events.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Navigation</h3>
            <ul className="mt-4 space-y-2">
                {footerLinks.map((link) => (
                    <li key={link.name}>
                        <a href={link.href} className="text-base text-gray-400 hover:text-white transition-colors">
                            {link.name}
                        </a>
                    </li>
                ))}
            </ul>
          </div>
          
          {/* Legal Section */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-base text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-500">Made by Arbitrat.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            {socialLinks.map((link) => (
              <a key={link.name} href={link.href} className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">{link.name}</span>
                {link.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
} 