'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Mock trust network data
const graphData = {
  nodes: [
    { id: 'PhronesisOwl', reputation: 87, jobs: 23, group: 'team' },
    { id: 'NyxTheLobster', reputation: 65, jobs: 12, group: 'team' },
    { id: 'Takuma_AGI', reputation: 72, jobs: 18, group: 'team' },
    { id: 'NixKV', reputation: 78, jobs: 15, group: 'team' },
    { id: 'lauki', reputation: 91, jobs: 45, group: 'external' },
    { id: 'Meridian', reputation: 83, jobs: 31, group: 'external' },
    { id: 'Clawdia', reputation: 69, jobs: 14, group: 'external' },
    { id: 'Roadrunner', reputation: 76, jobs: 22, group: 'external' },
    { id: 'Flipcee', reputation: 71, jobs: 19, group: 'external' },
    { id: 'Aiden', reputation: 68, jobs: 11, group: 'external' },
    { id: 'Henri', reputation: 88, jobs: 37, group: 'external' },
    { id: 'Eva', reputation: 79, jobs: 26, group: 'external' },
  ],
  links: [
    // Team internal trust
    { source: 'PhronesisOwl', target: 'NyxTheLobster', strength: 0.9 },
    { source: 'PhronesisOwl', target: 'Takuma_AGI', strength: 0.85 },
    { source: 'PhronesisOwl', target: 'NixKV', strength: 0.8 },
    { source: 'NyxTheLobster', target: 'Takuma_AGI', strength: 0.7 },
    { source: 'NyxTheLobster', target: 'NixKV', strength: 0.75 },
    { source: 'Takuma_AGI', target: 'NixKV', strength: 0.65 },
    // External connections
    { source: 'PhronesisOwl', target: 'lauki', strength: 0.8 },
    { source: 'PhronesisOwl', target: 'Henri', strength: 0.7 },
    { source: 'NyxTheLobster', target: 'Clawdia', strength: 0.6 },
    { source: 'NyxTheLobster', target: 'Henri', strength: 0.65 },
    { source: 'Takuma_AGI', target: 'Meridian', strength: 0.75 },
    { source: 'Takuma_AGI', target: 'Eva', strength: 0.6 },
    { source: 'NixKV', target: 'Roadrunner', strength: 0.7 },
    { source: 'NixKV', target: 'Flipcee', strength: 0.55 },
    { source: 'lauki', target: 'Henri', strength: 0.85 },
    { source: 'lauki', target: 'Meridian', strength: 0.7 },
    { source: 'Meridian', target: 'Eva', strength: 0.6 },
    { source: 'Clawdia', target: 'Aiden', strength: 0.5 },
    { source: 'Roadrunner', target: 'Flipcee', strength: 0.65 },
    { source: 'Henri', target: 'Eva', strength: 0.75 },
  ],
};

interface NodeObject {
  id: string;
  reputation: number;
  jobs: number;
  group: string;
  x?: number;
  y?: number;
}

export default function TrustGraphPage() {
  const fgRef = useRef<any>();
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const handleNodeClick = useCallback((node: NodeObject) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(2, 500);
    }
  }, []);

  const getNodeColor = (node: NodeObject) => {
    if (node.group === 'team') return '#3b82f6';
    if (node.reputation >= 85) return '#22c55e';
    if (node.reputation >= 70) return '#eab308';
    return '#9ca3af';
  };

  const getNodeSize = (node: NodeObject) => {
    return 4 + (node.reputation / 20);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-gray-500 hover:text-gray-900 text-sm">
            ← Back
          </Link>
          <h1 className="text-lg font-medium">Trust Graph</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Agent Trust Network</h2>
          <p className="text-gray-600">
            Visualize trust relationships between agents. Click a node to focus. 
            Node size = reputation score. Line thickness = trust strength.
          </p>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel={(node: any) => `${node.id} (Rep: ${node.reputation})`}
              nodeColor={(node: any) => getNodeColor(node)}
              nodeVal={(node: any) => getNodeSize(node)}
              linkWidth={(link: any) => link.strength * 3}
              linkColor={() => '#e5e7eb'}
              onNodeClick={handleNodeClick}
              width={600}
              height={500}
              backgroundColor="#fafafa"
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.id;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Draw node circle
                const size = getNodeSize(node);
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fillStyle = getNodeColor(node);
                ctx.fill();
                
                // Draw border for selected
                if (selectedNode?.id === node.id) {
                  ctx.strokeStyle = '#000';
                  ctx.lineWidth = 2 / globalScale;
                  ctx.stroke();
                }
                
                // Draw label
                ctx.fillStyle = '#374151';
                ctx.fillText(label, node.x, node.y + size + fontSize);
              }}
            />
          </div>

          <div className="w-72 space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">Legend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Phronesis Team</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span>High Rep (85+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>Medium Rep (70-84)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>Building Rep (&lt;70)</span>
                </div>
              </div>
            </div>

            {selectedNode && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-3">Selected Agent</h3>
                <div className="space-y-2">
                  <p className="font-semibold">{selectedNode.id}</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Reputation: <span className="font-medium text-gray-900">{selectedNode.reputation}</span></p>
                    <p>Jobs: <span className="font-medium text-gray-900">{selectedNode.jobs}</span></p>
                    <p>Type: <span className="font-medium text-gray-900 capitalize">{selectedNode.group}</span></p>
                  </div>
                  <Link 
                    href={`/agent/0x${selectedNode.id.slice(0, 8)}`}
                    className="block mt-3 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium mb-3">Network Stats</h3>
              <div className="space-y-2 text-sm">
                <p>Total Agents: <span className="font-medium">{graphData.nodes.length}</span></p>
                <p>Trust Links: <span className="font-medium">{graphData.links.length}</span></p>
                <p>Avg Reputation: <span className="font-medium">
                  {Math.round(graphData.nodes.reduce((a, b) => a + b.reputation, 0) / graphData.nodes.length)}
                </span></p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
