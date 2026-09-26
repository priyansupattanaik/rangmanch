'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useProjectStore } from '@/store/project';
import {
  Image as ImageIcon, Users, Sparkles, Layers,
  RefreshCw, Download, ArrowRight, Eye, Code2
} from 'lucide-react';

export default function GalleryPage() {
  const router = useRouter();
  const { projectId, images, setImages } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'character' | 'costume' | 'scene'>('character');
  const [galleryItems, setGalleryItems] = useState<any[]>(images || []);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (!projectId) {
      router.push('/');
      return;
    }
    loadGallery();
  }, [projectId]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const data = await api.getGallery(projectId!);
      setGalleryItems(data || []);
      setImages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = galleryItems.filter((item) => item.entity_type === activeTab);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-zinc-400">Loading generated cultural visual bibles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>STAGE 9: GROUNDED VISUAL SYNTHESIS</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Visual Bible & Cinematic Gallery
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Photorealistic character bibles, wardrobe plates, and keyframes strictly generated from approved decisions.
          </p>
        </div>

        <button
          onClick={() => router.push('/export')}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs transition-transform active:scale-95"
        >
          <span>Proceed to Package Export</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 space-x-2 text-xs">
        <button
          onClick={() => setActiveTab('character')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'character'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Characters ({galleryItems.filter((i) => i.entity_type === 'character').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('costume')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'costume'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Costumes ({galleryItems.filter((i) => i.entity_type === 'costume').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('scene')}
          className={`flex items-center space-x-2 pb-3 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'scene'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Scene Keyframes ({galleryItems.filter((i) => i.entity_type === 'scene').length})</span>
        </button>
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <ImageIcon className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-300 font-semibold">No visual assets generated yet.</p>
          <p className="text-xs text-zinc-500 mt-1">Approve the screenplay in Gate 3 to synthesize visual plates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const imgUrl = `${api.baseUrl}${item.relative_url}`;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 rounded-2xl overflow-hidden cursor-pointer group transition-all"
              >
                {/* Visual Viewport */}
                <div className="aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={imgUrl}
                    alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback display if static host path requires placeholder
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%2318181b"/><text x="200" y="150" fill="%23a1a1aa" font-family="sans-serif" font-size="14" text-anchor="middle">Visual Bible Asset</text></svg>';
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-zinc-950/80 backdrop-blur text-[10px] font-mono text-amber-400">
                    {item.generation_model}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">{item.entity_id}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{item.prompt_used}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspection Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">{selectedItem.label}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 bg-zinc-800 rounded"
              >
                ✕ Close
              </button>
            </div>

            <div className="aspect-[16/9] bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src={`${api.baseUrl}${selectedItem.relative_url}`}
                alt={selectedItem.label}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-amber-400 font-semibold flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>STORED IMAGE PROMPT:</span>
              </span>
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {selectedItem.prompt_used}
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-mono flex justify-between">
              <span>Entity: {selectedItem.entity_id}</span>
              <span>Model: {selectedItem.generation_model}</span>
              <span>Verified & Grounded</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
