'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/project';
import {
  Film,
  Layers,
  Compass,
  FileText,
  Image as ImageIcon,
  Download,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { projectName, projectStatus, selectedCulture, reset } = useProjectStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Upload & Ingest', href: '/', stage: '01', icon: Film },
    { label: 'Gate 1: Review', href: '/review', stage: '02', icon: Layers },
    { label: 'Gate 2: Plan', href: '/plan', stage: '03', icon: Compass },
    { label: 'Gate 3: Adapt', href: '/adapt', stage: '04', icon: FileText },
    { label: 'Visual Bible', href: '/gallery', stage: '05', icon: ImageIcon },
    { label: 'Package Export', href: '/export', stage: '06', icon: Download },
  ];

  const handleReset = () => {
    if (window.confirm('Reset current production project and start fresh?')) {
      reset();
      router.push('/');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#141414]/95 backdrop-blur-md border-b border-[#262626] transition-all">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
        {/* Left: Netflix Studio Branding */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-3 group">
            {/* Netflix-style Red Ribbon Emblem */}
            <div className="relative flex items-center justify-center w-8 h-9 bg-black border border-[#E50914]/40 rounded-sm shadow-netflix-glow group-hover:scale-105 transition-transform overflow-hidden">
              <span className="text-[#E50914] font-black text-xl tracking-tighter select-none font-mono">
                रं
              </span>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-[#E50914]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl sm:text-2xl font-black tracking-widest text-[#E50914] uppercase drop-shadow-[0_2px_12px_rgba(229,9,20,0.5)]">
                  RANGMANCH
                </span>
                <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#262626] text-white/80 font-semibold border border-white/10">
                  STUDIO
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium hidden sm:block">
                Where Stories Become Culture
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'text-white bg-[#222222] shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E50914]' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-3 h-[2px] bg-[#E50914] rounded-full shadow-[0_0_8px_#E50914]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Studio Production Metadata & Reset */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {projectName ? (
            <div className="flex items-center space-x-2.5 bg-[#1b1b1b] border border-[#333333] px-3.5 py-1.5 rounded-full shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E50914] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E50914]"></span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-white text-xs font-semibold max-w-[130px] sm:max-w-[180px] truncate">
                  {projectName}
                </span>
                <span className="text-[10px] font-mono uppercase bg-[#282828] text-[#E50914] px-1.5 py-0.5 rounded border border-[#E50914]/20 font-bold">
                  {projectStatus}
                </span>
                {selectedCulture && (
                  <span className="hidden sm:inline-block text-[10px] uppercase text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded font-mono">
                    {selectedCulture}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
              <span>STANDBY: NO PRODUCTION</span>
            </div>
          )}

          {projectName && (
            <button
              onClick={handleReset}
              title="Reset Project"
              className="p-2 text-zinc-400 hover:text-white bg-[#1a1a1a] hover:bg-[#282828] border border-zinc-800 rounded-full transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-zinc-300 hover:text-white bg-[#1f1f1f] border border-zinc-800 rounded-lg text-xs font-medium"
          >
            Pipeline
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#181818] border-b border-[#2c2c2c] px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 p-2 rounded text-xs font-medium ${
                  isActive
                    ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40'
                    : 'text-zinc-300 hover:bg-[#222222]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
