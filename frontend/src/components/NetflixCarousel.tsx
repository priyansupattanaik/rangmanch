'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, SlidersHorizontal } from 'lucide-react';

interface NetflixCarouselProps {
  title: string;
  subtitle?: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultView?: 'carousel' | 'grid';
  showToggle?: boolean;
}

export default function NetflixCarousel({
  title,
  subtitle,
  count,
  icon: Icon,
  children,
  defaultView = 'carousel',
  showToggle = true,
}: NetflixCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'carousel' | 'grid'>(defaultView);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [children, viewMode]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative space-y-3 group/carousel">
      {/* Row Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-3">
          <span className="w-1.5 h-5 bg-[#E50914] rounded-full inline-block shadow-[0_0_8px_#E50914]" />
          {Icon && <Icon className="w-4 h-4 text-[#E50914]" />}
          <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
            {title}
          </h2>
          {count !== undefined && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#262626] text-zinc-300 border border-white/10 font-bold">
              {count}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {subtitle && (
            <span className="text-xs font-mono text-zinc-500 uppercase hidden sm:block">
              {subtitle}
            </span>
          )}

          {showToggle && (
            <div className="flex items-center bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2b2b2b]">
              <button
                type="button"
                onClick={() => setViewMode('carousel')}
                title="Netflix Horizontal Carousel View"
                className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'carousel'
                    ? 'bg-[#2a2a2a] text-[#E50914] font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px] uppercase font-mono">Row</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Studio Grid View"
                className={`p-1.5 rounded text-xs transition-colors flex items-center space-x-1 ${
                  viewMode === 'grid'
                    ? 'bg-[#2a2a2a] text-[#E50914] font-bold shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[10px] uppercase font-mono">Grid</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row Body: Carousel vs Grid */}
      {viewMode === 'carousel' ? (
        <div className="relative group/row overflow-visible">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-0 bottom-0 z-30 w-12 bg-black/75 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all rounded-r-lg border-r border-y border-[#333333] shadow-2xl hover:scale-105 active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-7 h-7 text-white stroke-[2.5]" />
            </button>
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-0 bottom-0 z-30 w-12 bg-black/75 hover:bg-black/95 text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all rounded-l-lg border-l border-y border-[#333333] shadow-2xl hover:scale-105 active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-7 h-7 text-white stroke-[2.5]" />
            </button>
          )}

          {/* Horizontal Scrolling Track */}
          <div
            ref={scrollRef}
            className="flex items-stretch space-x-4 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
          >
            {React.Children.map(children, (child, idx) => (
              <div key={idx} className="w-[290px] sm:w-[330px] md:w-[360px] flex-shrink-0 flex flex-col">
                {child}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 py-2">
          {children}
        </div>
      )}
    </div>
  );
}
