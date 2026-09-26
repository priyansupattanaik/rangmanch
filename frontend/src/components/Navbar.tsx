'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/store/project';
import { Sparkles, Layers, Compass, FileText, Image as ImageIcon, Download } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { projectName, projectStatus, selectedCulture } = useProjectStore();

  const navItems = [
    { label: 'Upload & Culture', href: '/', icon: Sparkles },
    { label: 'Review (Gate 1)', href: '/review', icon: Layers },
    { label: 'Plan (Gate 2)', href: '/plan', icon: Compass },
    { label: 'Adapt (Gate 3)', href: '/adapt', icon: FileText },
    { label: 'Visual Gallery', href: '/gallery', icon: ImageIcon },
    { label: 'Export', href: '/export', icon: Download },
  ];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2 group">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold group-hover:scale-105 transition-transform">
              रं
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-wider text-white text-lg">RANGMANCH</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono">रंगमंच</span>
              </div>
              <p className="text-[10px] text-zinc-400">Where Stories Become Culture</p>
            </div>
          </Link>
        </div>

        {/* Center Nav Pipeline */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status indicator */}
        <div className="flex items-center space-x-3 text-xs">
          {projectName ? (
            <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-300 font-medium truncate max-w-[120px]">{projectName}</span>
              <span className="text-amber-400 font-mono text-[10px] uppercase">[{projectStatus}]</span>
            </div>
          ) : (
            <div className="text-zinc-500 font-mono text-[11px]">No Active Project</div>
          )}
        </div>
      </div>
    </header>
  );
}
