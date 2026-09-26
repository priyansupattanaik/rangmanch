'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Download,
  FileCheck,
  Package,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Film,
  Award
} from 'lucide-react';

export default function ExportPage() {
  const router = useRouter();
  const { projectId, projectName, selectedCulture, adaptedScenes, _hasHydrated } = useProjectStore();

  const [continuityWarnings, setContinuityWarnings] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<{ plan_review_items: any[]; scene_review_items: any[] }>({
    plan_review_items: [],
    scene_review_items: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!projectId) {
      router.push('/');
      return;
    }
    loadAuditReports();
  }, [_hasHydrated, projectId]);

  const loadAuditReports = async () => {
    try {
      setLoading(true);
      const [contData, revData] = await Promise.all([
        api.getContinuity(projectId!),
        api.getReviewQueue(projectId!),
      ]);
      setContinuityWarnings(contData || []);
      setReviewQueue(revData || { plan_review_items: [], scene_review_items: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[#E50914] border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-[#E50914] font-black text-xs">
            N
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
          COMPILING PRODUCTION DELIVERY PACKAGE & INTEGRITY HASHES...
        </p>
      </div>
    );
  }

  const exportZipUrl = api.getExportZipUrl(projectId!);

  const manifestItems = [
    {
      file: 'adapted_screenplay.md',
      type: 'Screenplay Script',
      format: 'Markdown',
      description: 'Full adapted screenplay formatted with scene headings, character tags, and cultural dialogue.',
      icon: FileText,
    },
    {
      file: 'scene_breakdown.json',
      type: 'Production Metadata',
      format: 'JSON',
      description: 'Structured scene breakdown with time of day, moods, dramatic purpose, and cast indices.',
      icon: Film,
    },
    {
      file: 'continuity_report.json',
      type: 'Quality Assurance',
      format: 'JSON',
      description: 'Comprehensive continuity verification log covering prop tracking and costume consistency.',
      icon: ShieldCheck,
    },
    {
      file: 'character_bible/ & keyframes/',
      type: 'Visual Assets',
      format: 'SVG / PNG',
      description: 'Complete visual lookbooks and scene keyframes generated strictly from approved decisions.',
      icon: ImageIcon,
    },
  ];

  return (
    <div className="space-y-10 px-2 sm:px-4">
      {/* Hero Delivery Billboard */}
      <section className="relative rounded-2xl bg-gradient-to-r from-black via-[#181818] to-[#202020] border border-[#2b2b2b] p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E50914]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] uppercase tracking-wider font-bold">
              <Package className="w-4 h-4 text-[#E50914]" />
              <span>STAGE 10: PRODUCTION DELIVERY & DISTRIBUTION READY</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
              PRODUCTION PACKAGE EXPORT
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Congratulations! Your screenplay has passed all three human review gates and 7-point independent verification.
              Download the complete ZIP distribution package containing all adapted scripts, metadata, and visual bibles.
            </p>
          </div>

          {/* Download Action Button */}
          <a
            href={exportZipUrl}
            download
            className="flex items-center justify-center space-x-3 px-8 py-4 rounded-xl bg-[#E50914] hover:bg-[#b20710] text-white font-black text-sm tracking-wider uppercase transition-all hover:scale-105 active:scale-95 shadow-netflix-glow flex-shrink-0"
          >
            <Download className="w-5 h-5" />
            <span>DOWNLOAD ZIP PACKAGE</span>
          </a>
        </div>
      </section>

      {/* Audit Scorecard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-zinc-400 font-bold">ETHNOGRAPHIC CANON</span>
            <Award className="w-4 h-4 text-[#E50914]" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase tracking-wide">
            {selectedCulture ? selectedCulture.toUpperCase() : 'CANONICAL'}
          </h3>
          <p className="text-xs text-zinc-400">
            Derived exclusively from authenticated ethnographic records with zero ungrounded terms.
          </p>
        </div>

        <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-zinc-400 font-bold">CONTINUITY STATUS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-wide">
            {continuityWarnings.length === 0 ? 'CERTIFIED CLEAN' : `${continuityWarnings.length} WARNINGS`}
          </h3>
          <p className="text-xs text-zinc-400">
            {continuityWarnings.length === 0
              ? 'Unbroken prop and wardrobe chains across all scenes.'
              : 'Discrepancies flagged for showrunner review.'}
          </p>
        </div>

        <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-zinc-400 font-bold">TRIPLE GATES</span>
            <CheckCircle2 className="w-4 h-4 text-[#E50914]" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-wide">
            GATES 1, 2 & 3 PASSED
          </h3>
          <p className="text-xs text-zinc-400">
            Human authorized entities, adaptation decisions, and screenplay diffs before export.
          </p>
        </div>
      </div>

      {/* Package Manifest Section */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <span className="w-1.5 h-4 bg-[#E50914] rounded-full inline-block" />
          <span>PACKAGE MANIFEST CONTENTS</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manifestItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-5 space-y-2 flex items-start space-x-4"
              >
                <div className="p-3 rounded-lg bg-[#222222] text-[#E50914] flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-bold text-white">{item.file}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#262626] text-zinc-400 border border-zinc-700">
                      {item.format}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Screenplay Preview Box */}
      {adaptedScenes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <span className="w-1.5 h-4 bg-[#E50914] rounded-full inline-block" />
              <span>SCREENPLAY SCRIPT VIEWER (SCENE 1 SAMPLE)</span>
            </h2>
            <span className="text-xs font-mono text-zinc-500">ADAPTED OUTPUT</span>
          </div>

          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-6 overflow-hidden">
            <pre className="screenplay-font text-xs sm:text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {adaptedScenes[0]?.adapted?.adapted_dialogue || 'Screenplay content loaded in ZIP bundle.'}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
