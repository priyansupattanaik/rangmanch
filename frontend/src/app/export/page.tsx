'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Download, FileCheck, Package, AlertTriangle, ShieldCheck,
  CheckCircle2, RefreshCw, FileText, Image as ImageIcon, ExternalLink
} from 'lucide-react';

export default function ExportPage() {
  const router = useRouter();
  const { projectId, projectName } = useProjectStore();

  const [continuityWarnings, setContinuityWarnings] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<{ plan_review_items: any[]; scene_review_items: any[] }>({
    plan_review_items: [],
    scene_review_items: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }
    loadAuditReports();
  }, [projectId]);

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
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-zinc-400">Compiling final continuity audit and export manifests...</p>
      </div>
    );
  }

  const exportZipUrl = api.getExportZipUrl(projectId!);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>STAGE 10: PRODUCTION DELIVERY & PACKAGING</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Production Package Export
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Export the complete adapted screenplay bundle, continuity reports, and visual asset bibles.
          </p>
        </div>

        <a
          href={exportZipUrl}
          download
          className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-sm transition-transform active:scale-95 shadow-lg shadow-amber-500/10"
        >
          <Download className="w-4 h-4" />
          <span>Download Complete Package (ZIP)</span>
        </a>
      </div>

      {/* Audit Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Continuity Report */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Continuity Audit Status</span>
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              {continuityWarnings.length} Issues Flagged
            </span>
          </div>

          {continuityWarnings.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>All props, costumes, and character hierarchies verified contiguous across scenes.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {continuityWarnings.map((w, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200">
                  <div className="font-mono text-[10px] text-amber-400 font-bold uppercase">{w.type}</div>
                  <p className="mt-0.5 text-zinc-300">{w.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review Queue Summary */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-amber-400" />
              <span>Human Review Queue Audit</span>
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              {reviewQueue.plan_review_items.length + reviewQueue.scene_review_items.length} Items Flagged
            </span>
          </div>

          {reviewQueue.plan_review_items.length === 0 && reviewQueue.scene_review_items.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>All human review gates passed. No unresolved cultural ambiguities remain.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {reviewQueue.plan_review_items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 uppercase">Plan Decision Review</span>
                  <p className="text-zinc-200">{item.original} → {item.proposed}</p>
                  <p className="text-[11px] text-zinc-500">{item.reason}</p>
                </div>
              ))}
              {reviewQueue.scene_review_items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                  <span className="text-[10px] font-mono text-amber-400 uppercase">Scene {item.scene_id} Review</span>
                  <p className="text-zinc-300">{item.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Package Contents Breakdown */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
          <Package className="w-4 h-4 text-amber-400" />
          <span>Deliverable Package Structure (included in ZIP)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>adapted_screenplay.md</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Complete dialogue and action screenplay formatted with scene headings, character tags, and cultural parentheticals.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>scene_breakdown.json</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Structured metadata covering INT/EXT, locations, time of day, dramatic conflict, and character presence.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>continuity_report.json</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Full prop movement chains, costume allocation audits, and relationship dynamic preservation logs.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>character_bible/</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Visual plates for each canonical character with prompt records and cultural persona metadata.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>costume_bible/</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Textile, ornament, and wardrobe reference cards grounded in regional craftsmanship.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="text-amber-400 flex items-center space-x-1.5 font-bold">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>scene_keyframes/</span>
            </div>
            <p className="text-zinc-400 text-[11px] font-sans">
              Atmospheric 35mm widescreen visual plates portraying setting architecture and emotional mood.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
