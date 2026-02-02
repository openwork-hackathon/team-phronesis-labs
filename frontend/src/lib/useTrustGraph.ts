'use client';

import { useState, useEffect } from 'react';
import { fetchTrustGraph, TrustNode, TrustLink } from './contracts';

// Mock data as fallback
const MOCK_DATA = {
  nodes: [
    { id: 'PhronesisOwl', address: '0x1', reputation: 87, jobs: 23, group: 'registered' as const },
    { id: 'NyxTheLobster', address: '0x2', reputation: 65, jobs: 12, group: 'registered' as const },
    { id: 'Takuma_AGI', address: '0x3', reputation: 72, jobs: 18, group: 'registered' as const },
    { id: 'NixKV', address: '0x4', reputation: 78, jobs: 15, group: 'registered' as const },
    { id: 'lauki', address: '0x5', reputation: 91, jobs: 45, group: 'endorser' as const },
  ],
  links: [
    { source: 'PhronesisOwl', target: 'NyxTheLobster', strength: 0.9 },
    { source: 'PhronesisOwl', target: 'Takuma_AGI', strength: 0.85 },
    { source: 'PhronesisOwl', target: 'NixKV', strength: 0.8 },
    { source: 'lauki', target: 'PhronesisOwl', strength: 0.8 },
  ],
};

interface UseTrustGraphResult {
  nodes: TrustNode[];
  links: TrustLink[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrustGraph(): UseTrustGraphResult {
  const [nodes, setNodes] = useState<TrustNode[]>(MOCK_DATA.nodes);
  const [links, setLinks] = useState<TrustLink[]>(MOCK_DATA.links);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchTrustGraph();
      
      // If we got real data, use it; otherwise keep mock
      if (data.nodes.length > 0) {
        setNodes(data.nodes);
        setLinks(data.links);
      } else {
        // No on-chain data yet, keep mock for demo
        console.log('No on-chain data found, using mock data');
      }
    } catch (e) {
      console.error('Error fetching trust graph:', e);
      setError('Failed to fetch on-chain data, showing demo data');
      // Keep mock data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    nodes,
    links,
    loading,
    error,
    refetch: fetchData,
  };
}
