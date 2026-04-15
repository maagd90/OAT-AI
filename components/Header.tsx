"use client";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="font-bold text-xl text-blue-700">AI Travel Planner</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link href="/trips" className="hover:text-blue-600 transition-colors">My Trips</Link>
          <Link href="/about" className="hover:text-blue-600 transition-colors">About</Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded text-gray-600 hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-3 flex flex-col gap-3 text-sm font-medium text-gray-600">
          <Link href="/" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">Home</Link>
          <Link href="/trips" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">My Trips</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)} className="hover:text-blue-600">About</Link>
        </div>
      )}
    </header>
  );
}
