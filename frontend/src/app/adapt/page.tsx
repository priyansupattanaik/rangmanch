'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  FileText, ShieldCheck, CheckCircle2, AlertTriangle, XCircle,
  ArrowRight, Sparkles, RefreshCw, Edit2, AlertCircle
} from 'lucide-react';

export default function AdaptPage() {
  const router = useRouter();
  const { projectId, projectName, adaptedScenes, setAdaptedScenes, setImages } = useProjectStore();

  const [scenePairs, setScenePairs] = useState<any[]>(adaptedScenes || []);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable scene state
  const [editedDialogues, setEditedDialogues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }
    loadAdaptedData();
  }, [projectId]);

  const loadAdaptedData = async () => {
    try {
      setLoading(true);
      const data = await api.getAdapted(projectId!);
      setScenePairs(data || []);
      setAdaptedScenes(data || []);

      // Pre-fill editable state
      const initialMap: Record<string, string> = {};
      data.forEach((item: any) => {
        if (item.adapted) {
          initialMap[item.adapted.id] = item.adapted.adapted_dialogue;
        }
      });
      setEditedDialogues(initialMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load adapted screenplay scenes');
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
      // 1. Submit any user edits to adapted dialogue
      const sceneEdits = Object.entries(editedDialogues).map(([id, text]) => ({
        id,
        adapted_dialogue: text,
        human_review_needed: false,
      }));

      // 2. Approve Gate 3
      await api.approveAdapted(projectId!, { scene_edits: sceneEdits });

      // 3. Trigger Stage 9 Visual Generation
      await api.generateVisuals(projectId!);

      // 4. Fetch gallery images
      const galleryData = await api.getGallery(projectId!);
      setImages(galleryData);

      router.push('/gallery');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to approve screenplay and trigger visuals');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading side-by-side adapted screenplay with independent verification checks...</p>
      </div>
    );
  }

  // Calculate estimated visual cost
  const totalScenes = scenePairs.length;
  const estimatedCost = (totalScenes * 0.04 + 0.12).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>GATE 3: SCREENPLAY VERIFICATION & VISUAL APPROVAL</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Side-by-Side Screenplay Adaptation
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Review adapted dialogues and 7-point verification audit before unleashing image generation.
          </p>
        </div>

        <div className="flex flex-col items-end space-y-1">
          <button
            onClick={handleApproveVisuals}
            disabled={actionLoading}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs transition-transform active:scale-95 disabled:opacity-50"
          >
            <span>{actionLoading ? 'Synthesizing Visual Bible...' : 'Approve & Generate Visuals'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-zinc-500 font-mono">
            Est. API Cost: ${estimatedCost} (Mock / Replay Available)
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-700/60 p-4 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Screenplay Diff Rows */}
      <div className="space-y-8">
        {scenePairs.map((item, index) => {
          const sc = item.scene;
          const ad = item.adapted;
          const verChecks: any[] = item.verification || [];

          const hasFail = verChecks.some((c) => !c.passed && c.blocking);
          const hasWarn = verChecks.some((c) => !c.passed && !c.blocking);
          const isPassed = !hasFail && !hasWarn;

          return (
            <div
              key={sc.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Verification Strip */}
              <div
                className={`px-4 py-2.5 flex items-center justify-between border-b text-xs ${
                  hasFail
                    ? 'bg-red-950/50 border-red-800/60 text-red-200'
                    : hasWarn
                    ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                }`}
              >
                <div className="flex items-center space-x-2 font-mono font-bold">
                  {hasFail ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : hasWarn ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>
                    SCENE {sc.scene_number}: {sc.id} — {sc.int_ext} {sc.location_id}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-[11px] font-mono">
                    STATUS: {hasFail ? 'FAIL (BLOCKING)' : hasWarn ? 'WARNINGS' : 'PASS (ALL 7 CHECKS)'}
                  </span>
                </div>
              </div>

              {/* 7 Checks Summary badges */}
              <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-800/80 flex flex-wrap gap-2 text-[10px] font-mono">
                {verChecks.map((c, i) => (
                  <span
                    key={i}
                    title={c.reason}
                    className={`px-2 py-0.5 rounded cursor-help ${
                      c.passed
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                        : c.blocking
                        ? 'bg-red-950 text-red-400 border border-red-800 font-bold'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    Check {c.check_number}: {c.name} {c.passed ? '✓' : '✗'}
                  </span>
                ))}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                {/* Left: Original Screenplay */}
                <div className="p-4 space-y-2 bg-zinc-950/40">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 uppercase">
                    <span>Source Screenplay (Read Only)</span>
                    <span>{sc.time_of_day}</span>
                  </div>
                  <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed font-normal">
                    {sc.raw_text}
                  </pre>
                </div>

                {/* Right: Adapted Screenplay (Editable) */}
                <div className="p-4 space-y-2 bg-zinc-900/30">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-400/90 uppercase">
                    <span>Regional Cultural Adaptation (Editable)</span>
                    <span className="text-zinc-500">Confidence: {ad?.confidence || 'HIGH'}</span>
                  </div>
                  {ad && (
                    <textarea
                      rows={10}
                      value={editedDialogues[ad.id] || ad.adapted_dialogue}
                      onChange={(e) => handleDialogueChange(ad.id, e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-lg p-3 text-xs font-mono text-amber-100 placeholder-zinc-600 focus:outline-none leading-relaxed"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
