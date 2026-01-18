import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, ArrowLeft } from 'lucide-react';

const navLinks = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const isDiscussionDetail = router.pathname.startsWith('/discussion/[');
  let backToDiscussionsHref = '/'; // Default to home
  if (isDiscussionDetail) {
    // This logic needs to be refined if the discussion detail page needs to go back to a specific debate's discussions list
    backToDiscussionsHref = router.asPath.split('/discussion/')[0]; // Go back to /debate/[debateId]/discussions
  }
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="w-full z-40 bg-white shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left Area: Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2 text-[#1351B4] font-black text-xl tracking-tighter px-3 py-1 rounded-sm hover:bg-gray-100 transition group relative">
            <span className="inline-block align-middle relative">🏛️</span>
            <span className="inline-block align-middle">Termômetro Eleições</span>
          </Link>
        </div>
        
        {/* Right Area: Nav Links, and Mobile toggler */}
        <div className="flex items-center gap-4">
          {/* Desktop Nav Links (Sobre, Contato) */}
          <div className="hidden md:flex md:gap-2 lg:gap-5 items-center">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="relative font-semibold px-2.5 py-1.5 rounded-sm text-gray-800 hover:text-[#1351B4] transition focus-visible:ring-2 focus-visible:ring-[#1351B4] group"
              >
                <span>{label}</span>
                {router.pathname === href && (
                  <span className="absolute left-0 -bottom-0.5 h-0.5 w-full bg-[#1351B4] rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Removed "Voltar para Discussões" button for desktop */}
        <button
          onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-sm hover:bg-gray-100 border border-gray-300 focus:ring-2 focus:ring-[#1351B4] transition"
          aria-label="Toggle menu"
          tabIndex={0}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
        </div>
      </div>
      {/* Mobile Menu Overlay */}
        {isOpen && (
        <div
          className="fixed inset-0 top-[60px] left-0 right-0 bg-white z-50 flex flex-col items-center gap-4 pt-8 pb-16 border-b border-gray-200 shadow-xl md:hidden"
          >
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
              className="font-bold text-lg text-gray-900 px-5 py-3 rounded-sm hover:bg-gray-100 transition w-3/4 text-center"
                onClick={() => setIsOpen(false)}
              >
                {label}
              </Link>
            ))}
          {/* Removed "Voltar para Discussões" button for mobile */}
        </div>
        )}
    </nav>
  );
};

export default Navbar;
