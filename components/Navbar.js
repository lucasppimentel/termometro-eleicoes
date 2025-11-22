import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center">
          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-indigo-200 transition-colors font-medium">
              Home
            </Link>
            <Link href="/" className="hover:text-indigo-200 transition-colors font-medium">
              Debates
            </Link>
            <a href="#sobre" className="hover:text-indigo-200 transition-colors font-medium">
              Sobre
            </a>
            <a href="#contato" className="hover:text-indigo-200 transition-colors font-medium">
              Contato
            </a>
          </div>

          {/* Menu Mobile Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-indigo-700 transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu Mobile */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-indigo-500 pt-4">
            <Link href="/" className="block px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Home
            </Link>
            <Link href="/" className="block px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Debates
            </Link>
            <a href="#sobre" className="block px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Sobre
            </a>
            <a href="#contato" className="block px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Contato
            </a>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
