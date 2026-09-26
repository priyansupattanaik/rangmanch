'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Edit3,
  Sliders,
  Check,
  Eye,
  Film
} from 'lucide-react';

export default function AdaptPage() {
  const router = useRouter();
  const { projectId, projectName, adaptedScenes, setAdaptedScenes, setImages, _hasHydrated } = useProjectStore();

  const [scenePairs, setScenePairs] = useState<any[]>(adaptedScenes || []);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable scene dialogue state
  const [editedDialogues, setEditedDialogues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!projectId) {
      router.push('/');
      return;
    }
    loadAdaptedData();
  }, [_hasHydrated, projectId]);

  const loadAdaptedData = async () => {
    try {
      setLoading(true);
      const data = await api.getAdapted(projectId!);
      setScenePairs(data || []);
      setAdaptedScenes(data || []);

      const initialMap: Record<string, string> = {};
      data.forEach((item: any) => {
        if (item.adapted) {
          initialMap[item.adapted.id] = item.adapted.adapted_dialogue;
        }
      });
      setEditedDialogues(initialMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load adapted screenplay scenes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogueChange = (adaptedId: string, val: string) => {
    setEditedDialogues((prev) => ({ ...prev, [adaptedId]: val }));
  };

  const handleApproveVisuals = async () => {
    try {
      setActionLoading(true);
      const sceneEdits = Object.entries(editedDialogues).map(([id, text]) => ({
        id,
        adapted_dialogue: text,
        human_review_needed: false,
      }));

      // 1. Approve Gate 3
      await api.approveAdapted(projectId!, { scene_edits: sceneEdits });

      // 2. Synthesize Stage 9 Visual Bibles & Keyframes
      await api.generateVisuals(projectId!);

      // 3. Fetch visual assets and advance to Gallery
      const galleryData = await api.getGallery(projectId!);
      setImages(galleryData);

      router.push('/gallery');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to approve Gate 3 screenplay and generate visuals.');
    } finally {
      setActionLoading(false);
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
          RUNNING 7-POINT INDEPENDENT QUALITY & CONTINUITY AUDIT...
        </p>
      </div>
    );
  }

  const currentPair = scenePairs[activeSceneIndex] || null;
  const currentScene = currentPair?.scene;
  const currentAdapted = currentPair?.adapted;
  const currentVerification = currentPair?.verification || [];

  const allPassed = scenePairs.every((p) => p.adapted?.verification_passed);
  const totalWarnings = scenePairs.reduce(
    (acc, p) => acc + (p.adapted?.continuity_warnings ? JSON.parse(p.adapted.continuity_warnings).length : 0),
    0
  );

  return (
    <div className="space-y-8 px-2 sm:px-4">
      {/* Billboard Banner */}
      <section className="relative rounded-2xl bg-gradient-to-r from-black via-[#181818] to-[#202020] border border-[#2b2b2b] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#E50914]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#E50914] uppercase tracking-wider font-bold">
              <FileText className="w-4 h-4 text-[#E50914]" />
              <span>GATE 3: SCREENPLAY READER & 7-POINT VERIFICATION AUDIT</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              SCREENPLAY ADAPTATION & DIFF SUITE
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Side-by-side reading desk comparing the original screenplay with regional dialogue adaptation.
              Certified by 7 independent dramaturgy and continuity verifiers before visual bible generation.
            </p>
          </div>

          {/* Gate 3 Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleApproveVisuals}
              disabled={actionLoading}
              className="flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-[#E50914] hover:bg-[#b20710] disabled:bg-[#4d1012] text-white font-extrabold text-xs tracking-wider uppercase transition-all hover:scale-105 active:scale-95 shadow-netflix-glow disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SYNTHESIZING VISUAL BIBLES & KEYFRAMES...</span>
                </>
              ) : (
                <>
                  <span>APPROVE SCREENPLAY & SYNTHESIZE VISUALS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-[#E50914]/15 border border-[#E50914] p-4 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#E50914] mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Screenplay Scene Selector Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1 border-b border-[#2d2d2d]">
        {scenePairs.map((pair, idx) => {
          const isSelected = idx === activeSceneIndex;
          const passed = pair.adapted?.verification_passed;
          return (
            <button
              key={pair.scene.id}
              onClick={() => setActiveSceneIndex(idx)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#E50914] text-white shadow-netflix-glow'
                  : 'bg-[#181818] text-zinc-400 hover:text-white border border-[#2d2d2d]'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>
                SCENE {String(pair.scene.scene_number).padStart(2, '0')}: {pair.scene.int_ext} {pair.scene.location_id}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  passed ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Active Scene Container */}
      {currentScene && (
        <div className="space-y-6">
          {/* Scene Metadata Bar */}
          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-[#E50914] text-white">
                SCENE {String(currentScene.scene_number).padStart(2, '0')}
              </span>
              <span className="text-sm font-bold text-white uppercase">{currentScene.slugline}</span>
              <span className="text-xs font-mono bg-[#242424] text-zinc-300 px-2.5 py-0.5 rounded border border-zinc-700">
                MOOD: {currentScene.mood}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-zinc-400">PURPOSE:</span>
              <span className="text-white font-medium">{currentScene.dramatic_purpose}</span>
            </div>
          </div>

          {/* Side-by-Side Screenplay Reader */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Original Screenplay */}
            <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl overflow-hidden flex flex-col">
              <div className="bg-[#1c1c1c] border-b border-[#2b2b2b] px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  ORIGINAL SCREENPLAY SOURCE
                </span>
                <span className="text-[10px] font-mono text-zinc-500">STANDARD FORMAT</span>
              </div>
              <div className="p-6 flex-1 bg-[#141414]/80">
                <pre className="screenplay-font text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {currentScene.raw_text}
                </pre>
              </div>
            </div>

            {/* Right: Adapted Screenplay (Editable with Studio Highlights) */}
            <div className="bg-[#181818] border border-[#E50914]/40 rounded-xl overflow-hidden flex flex-col shadow-netflix-card">
              <div className="bg-[#1c1c1c] border-b border-[#2b2b2b] px-5 py-3 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E50914] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E50914]" />
                  ADAPTED REGIONAL SCREENPLAY
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  LIVE EDITABLE FOR GATE 3
                </span>
              </div>
              <div className="p-6 flex-1 bg-[#141414] flex flex-col space-y-4">
                <textarea
                  rows={14}
                  value={
                    currentAdapted
                      ? editedDialogues[currentAdapted.id] ?? currentAdapted.adapted_dialogue
                      : ''
                  }
                  onChange={(e) => {
                    if (currentAdapted) {
                      handleDialogueChange(currentAdapted.id, e.target.value);
                    }
                  }}
                  className="w-full flex-1 bg-transparent screenplay-font text-xs sm:text-sm text-white outline-none resize-none leading-relaxed border-none p-0 focus:ring-0"
                />

                {/* Cultural Changes Tag Pills */}
                {currentAdapted?.cultural_changes && (
                  <div className="pt-3 border-t border-[#262626] space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold block">
                      Applied Cultural Substitutions in this Scene:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {JSON.parse(currentAdapted.cultural_changes).map((ch: any, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#242424] text-zinc-200 border border-zinc-700"
                        >
                          <span className="text-zinc-500 line-through mr-1">{ch.original}</span>
                          <span className="text-[#E50914] font-bold">{ch.adapted}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7-POINT INDEPENDENT VERIFIER AUDIT TRAY */}
          <div className="bg-[#181818] border border-[#2b2b2b] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  INDEPENDENT 7-POINT VERIFICATION AUDIT
                </h3>
              </div>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                  currentAdapted?.verification_passed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {currentAdapted?.verification_passed ? 'ALL CHECKS PASSED' : 'REVIEW FLAGGED'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentVerification.map((chk: any) => (
                <div
                  key={chk.check_number}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    chk.passed
                      ? 'bg-[#141414] border-[#292929]'
                      : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-500">
                      CHECK {chk.check_number}
                    </span>
                    {chk.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase">{chk.name}</h4>
                  <p className="text-[11px] text-zinc-400 leading-tight">{chk.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
