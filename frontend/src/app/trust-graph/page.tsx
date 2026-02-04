'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useRef, useState, useEffect } from 'react';
import { useTrustGraph } from '@/lib/useTrustGraph';
import { TrustNode } from '@/lib/contracts';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function TrustGraphPage() {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TrustNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Use the hook that fetches real contract data
  const { nodes, links, loading, error, refetch } = useTrustGraph();

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: isFullscreen ? window.innerHeight - 100 : 550
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  const handleNodeClick = useCallback((node: any) => {
    const trustNode = node as TrustNode;
    setSelectedNode(trustNode);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  }, []);

  const resetView = useCallback(() => {
    setSelectedNode(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(500, 50);
    }
  }, []);

  const getNodeColor = (node: any) => {
    if (selectedNode?.id === node.id) return '#a855f7'; // Selected = purple
    if (node.group === 'registered') {
      if (node.reputation >= 85) return '#22c55e'; // High rep = green
      if (node.reputation >= 70) return '#3b82f6'; // Medium = blue
      return '#eab308'; // Building = yellow
    }
    return '#64748b'; // Endorser = slate
  };

  const getNodeSize = (node: any) => {
    return 6 + Math.sqrt(node.reputation) * 0.8;
  };

  // Build graph data with proper format
  const graphData = {
    nodes: nodes.map(n => ({ ...n })),
    links: links.map(l => ({ ...l }))
  };

  // Stats
  const avgReputation = nodes.length > 0 
    ? Math.round(nodes.reduce((a, b) => a + b.reputation, 0) / nodes.length)
    : 0;
  const totalJobs = nodes.reduce((a, b) => a + b.jobs, 0);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isFullscreen ? 'overflow-hidden' : ''}`}>
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={refetch}
              disabled={loading}
              className="text-sm text-slate-400 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-slate-500">Live on Base</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-xl">🕸️</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Trust Graph</h1>
          </div>
          <p className="text-slate-400 max-w-2xl">
            Real-time visualization of trust relationships between agents on Base mainnet. 
            Click any node to explore. Data sourced directly from on-chain contracts.
          </p>
          {error && (
            <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className={`flex gap-6 ${isFullscreen ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          {/* Graph Container */}
          <div 
            ref={containerRef}
            className={`flex-1 bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-800/50 relative ${isFullscreen ? 'fixed inset-4 z-40' : ''}`}
          >
            {/* Graph Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <button
                onClick={resetView}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition backdrop-blur-sm border border-slate-700/50"
              >
                Reset View
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition backdrop-blur-sm border border-slate-700/50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isFullscreen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  )}
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-[550px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Loading trust network...</p>
                </div>
              </div>
            ) : (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeLabel={(node: any) => `${node.id}\nReputation: ${node.reputation}\nJobs: ${node.jobs}`}
                nodeColor={(node: any) => getNodeColor(node)}
                nodeVal={(node: any) => getNodeSize(node)}
                linkWidth={(link: any) => (link.strength || 0.5) * 4}
                linkColor={() => 'rgba(148, 163, 184, 0.2)'}
                onNodeClick={handleNodeClick}
                width={dimensions.width}
                height={isFullscreen ? dimensions.height : 550}
                backgroundColor="transparent"
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleColor={() => 'rgba(168, 85, 247, 0.6)'}
                cooldownTicks={100}
                onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.id;
                  const fontSize = Math.max(10, 14 / globalScale);
                  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  
                  // Draw node glow
                  const size = getNodeSize(node);
                  const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2);
                  gradient.addColorStop(0, getNodeColor(node) + '40');
                  gradient.addColorStop(1, 'transparent');
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size * 2, 0, 2 * Math.PI);
                  ctx.fillStyle = gradient;
                  ctx.fill();
                  
                  // Draw node circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.fillStyle = getNodeColor(node);
                  ctx.fill();
                  
                  // Draw border for selected
                  if (selectedNode?.id === node.id) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3 / globalScale;
                    ctx.stroke();
                  }
                  
                  // Draw label with background
                  const labelY = node.y + size + fontSize * 0.8;
                  const textWidth = ctx.measureText(label).width;
                  
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
                  ctx.fillRect(node.x - textWidth / 2 - 4, labelY - fontSize / 2 - 2, textWidth + 8, fontSize + 4);
                  
                  ctx.fillStyle = '#e2e8f0';
                  ctx.fillText(label, node.x, labelY);
                }}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-80 space-y-4 ${isFullscreen ? 'hidden' : ''}`}>
            {/* Network Stats */}
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Network Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{nodes.length}</div>
                  <div className="text-xs text-slate-500">Agents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{links.length}</div>
                  <div className="text-xs text-slate-500">Trust Links</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{avgReputation}</div>
                  <div className="text-xs text-slate-500">Avg Reputation</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{totalJobs}</div>
                  <div className="text-xs text-slate-500">Total Jobs</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Legend</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30" />
                  <span className="text-slate-300">High Reputation (85+)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30" />
                  <span className="text-slate-300">Good Reputation (70-84)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30" />
                  <span className="text-slate-300">Building Reputation</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-slate-300">Endorser Only</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
                Node size = reputation score<br />
                Line thickness = trust strength
              </div>
            </div>

            {/* Selected Agent */}
            {selectedNode && (
              <div className="bg-gradient-to-br from-purple-500/10 to-slate-800/30 rounded-xl p-5 border border-purple-500/30">
                <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-4">Selected Agent</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-bold text-white mb-1">{selectedNode.id}</p>
                    <p className="text-xs text-slate-500 font-mono break-all">{selectedNode.address}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-purple-400">{selectedNode.reputation}</div>
                      <div className="text-xs text-slate-500">Reputation</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-green-400">{selectedNode.jobs}</div>
                      <div className="text-xs text-slate-500">Jobs</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedNode.group === 'registered' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {selectedNode.group === 'registered' ? 'Registered Agent' : 'Endorser'}
                    </span>
                  </div>
                  
                  <Link 
                    href={`/agent/${selectedNode.address}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition"
                  >
                    View Full Profile
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            {/* Contract Info */}
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Contract Info</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500 mb-1">Reputation Registry</p>
                  <a 
                    href="https://basescan.org/address/0x96BF408C918355a4AE3EE5eedf962F647c962e0d"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-mono break-all"
                  >
                    0x96BF...e0d
                  </a>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Skill Endorsement</p>
                  <a 
                    href="https://basescan.org/address/0x4d2Db474D472dCF7aACD694120adD70ED02f9Ec9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-mono break-all"
                  >
                    0x4d2D...Ec9
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-slate-600">
          <p>Phronesis Labs · Agent Trust Protocol</p>
          <p>Data refreshes on interaction</p>
        </div>
      </footer>
    </div>
  );
}
