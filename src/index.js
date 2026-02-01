const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (would be database in production)
const agents = new Map();
const reputationScores = new Map();
const trustGraph = new Map();
const skillVerifications = new Map();

/**
 * Agent Reputation & Trust Protocol API
 * Phronesis Labs - Openwork Clawathon 2026
 */

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'phronesis-labs-api',
    version: '0.1.0'
  });
});

// Register an agent
app.post('/api/agents/register', (req, res) => {
  const { agentId, name, wallet, specialties } = req.body;
  
  if (!agentId || !wallet) {
    return res.status(400).json({ error: 'agentId and wallet required' });
  }
  
  agents.set(agentId, {
    id: agentId,
    name: name || 'Unknown',
    wallet,
    specialties: specialties || [],
    registeredAt: Date.now(),
    jobsCompleted: 0,
    totalEarnings: 0
  });
  
  // Initialize reputation score
  reputationScores.set(agentId, {
    overall: 50, // Start at neutral
    reliability: 50,
    quality: 50,
    communication: 50,
    totalReviews: 0
  });
  
  res.json({ 
    success: true, 
    agent: agents.get(agentId),
    reputation: reputationScores.get(agentId)
  });
});

// Get agent reputation
app.get('/api/agents/:agentId/reputation', (req, res) => {
  const { agentId } = req.params;
  
  if (!agents.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const rep = reputationScores.get(agentId) || {
    overall: 0,
    reliability: 0,
    quality: 0,
    communication: 0,
    totalReviews: 0
  };
  
  res.json({
    agentId,
    reputation: rep,
    trustScore: calculateTrustScore(agentId)
  });
});

// Submit a review (reputation update)
app.post('/api/agents/:agentId/reviews', (req, res) => {
  const { agentId } = req.params;
  const { reviewerId, jobId, ratings, review } = req.body;
  
  if (!agents.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Update reputation with weighted average
  const current = reputationScores.get(agentId);
  const newTotal = current.totalReviews + 1;
  
  const updated = {
    reliability: weightedAverage(current.reliability, ratings.reliability, newTotal),
    quality: weightedAverage(current.quality, ratings.quality, newTotal),
    communication: weightedAverage(current.communication, ratings.communication, newTotal),
    totalReviews: newTotal
  };
  
  // Overall is weighted average of components
  updated.overall = Math.round(
    (updated.reliability * 0.4) + 
    (updated.quality * 0.4) + 
    (updated.communication * 0.2)
  );
  
  reputationScores.set(agentId, updated);
  
  // Update trust graph
  updateTrustGraph(reviewerId, agentId, ratings.overall || updated.overall);
  
  res.json({ 
    success: true, 
    reputation: updated 
  });
});

// Get trust graph for an agent
app.get('/api/agents/:agentId/trust-graph', (req, res) => {
  const { agentId } = req.params;
  const { depth = 1 } = req.query;
  
  const graph = buildTrustGraph(agentId, parseInt(depth));
  
  res.json({
    agentId,
    depth: parseInt(depth),
    graph,
    networkTrustScore: calculateNetworkTrust(agentId, graph)
  });
});

// Verify a skill
app.post('/api/skills/verify', (req, res) => {
  const { agentId, skill, verifierId, proof } = req.body;
  
  if (!skillVerifications.has(agentId)) {
    skillVerifications.set(agentId, new Map());
  }
  
  const agentSkills = skillVerifications.get(agentId);
  
  if (!agentSkills.has(skill)) {
    agentSkills.set(skill, []);
  }
  
  agentSkills.get(skill).push({
    verifierId,
    proof,
    verifiedAt: Date.now()
  });
  
  res.json({ 
    success: true, 
    skill,
    verifications: agentSkills.get(skill).length 
  });
});

// Get verified skills for an agent
app.get('/api/agents/:agentId/skills', (req, res) => {
  const { agentId } = req.params;
  const agentSkills = skillVerifications.get(agentId) || new Map();
  
  const skills = {};
  agentSkills.forEach((verifications, skill) => {
    skills[skill] = {
      verifications: verifications.length,
      verifiedBy: verifications.map(v => v.verifierId)
    };
  });
  
  res.json({ agentId, skills });
});

// Search agents by reputation and skills
app.get('/api/agents/search', (req, res) => {
  const { minReputation = 0, skills, limit = 20 } = req.query;
  
  const results = [];
  
  agents.forEach((agent, id) => {
    const rep = reputationScores.get(id);
    
    if (rep.overall >= parseInt(minReputation)) {
      // Check skills if specified
      if (skills) {
        const requiredSkills = skills.split(',');
        const agentSkills = skillVerifications.get(id) || new Map();
        const hasAllSkills = requiredSkills.every(s => agentSkills.has(s));
        if (!hasAllSkills) return;
      }
      
      results.push({
        ...agent,
        reputation: rep,
        trustScore: calculateTrustScore(id)
      });
    }
  });
  
  // Sort by reputation
  results.sort((a, b) => b.reputation.overall - a.reputation.overall);
  
  res.json({
    count: results.length,
    agents: results.slice(0, parseInt(limit))
  });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { category = 'overall', limit = 10 } = req.query;
  
  const rankings = [];
  
  agents.forEach((agent, id) => {
    const rep = reputationScores.get(id);
    rankings.push({
      agentId: id,
      name: agent.name,
      wallet: agent.wallet,
      score: rep[category] || rep.overall,
      totalReviews: rep.totalReviews,
      trustScore: calculateTrustScore(id)
    });
  });
  
  rankings.sort((a, b) => b.score - a.score);
  
  res.json({
    category,
    leaderboard: rankings.slice(0, parseInt(limit))
  });
});

// Helper functions
function weightedAverage(current, newValue, total) {
  return Math.round(((current * (total - 1)) + newValue) / total);
}

function calculateTrustScore(agentId) {
  const rep = reputationScores.get(agentId);
  if (!rep) return 0;
  
  // Base trust on reputation
  let trust = rep.overall;
  
  // Boost for more reviews (established agents more trustworthy)
  if (rep.totalReviews > 10) trust += 5;
  if (rep.totalReviews > 50) trust += 5;
  
  // Cap at 100
  return Math.min(trust, 100);
}

function updateTrustGraph(from, to, rating) {
  if (!trustGraph.has(from)) {
    trustGraph.set(from, new Map());
  }
  
  trustGraph.get(from).set(to, {
    rating,
    timestamp: Date.now()
  });
}

function buildTrustGraph(agentId, depth) {
  const visited = new Set();
  const graph = { nodes: [], edges: [] };
  
  function traverse(current, currentDepth) {
    if (currentDepth > depth || visited.has(current)) return;
    visited.add(current);
    
    const agent = agents.get(current);
    if (agent) {
      graph.nodes.push({
        id: current,
        name: agent.name,
        reputation: reputationScores.get(current)?.overall || 0
      });
    }
    
    const connections = trustGraph.get(current);
    if (connections) {
      connections.forEach((data, target) => {
        graph.edges.push({
          from: current,
          to: target,
          rating: data.rating
        });
        traverse(target, currentDepth + 1);
      });
    }
  }
  
  traverse(agentId, 0);
  return graph;
}

function calculateNetworkTrust(agentId, graph) {
  if (graph.nodes.length <= 1) return 0;
  
  // Simple network trust: average reputation of connected nodes
  const totalRep = graph.nodes.reduce((sum, node) => sum + node.reputation, 0);
  return Math.round(totalRep / graph.nodes.length);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🦞 Phronesis Labs API running on port ${PORT}`);
});

module.exports = app;
