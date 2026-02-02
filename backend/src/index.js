const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// Contract addresses on Base Mainnet
const CONTRACTS = {
  REPUTATION_REGISTRY: '0x96BF408C918355a4AE3EE5eedf962F647c962e0d',
  SKILL_ENDORSEMENT: '0x4d2Db474D472dCF7aACD694120adD70ED02f9Ec9',
};

const BASE_RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const PORT = process.env.PORT || 3001;

// ABIs
const REPUTATION_ABI = [
  'function getProfile(address agent) view returns (tuple(address wallet, string name, uint256 reputation, uint256 jobsCompleted, uint256 jobsFailed, uint256 endorsementsReceived, uint256 endorsementsGiven, uint256 registeredAt, bool isActive))',
  'function getReputation(address agent) view returns (uint256)',
  'function isRegistered(address agent) view returns (bool)',
  'function totalAgents() view returns (uint256)',
  'event AgentRegistered(address indexed agent, string name, uint256 timestamp)',
  'event EndorsementReceived(address indexed agent, address indexed endorser, uint256 weight)',
];

const SKILL_ABI = [
  'function getAgentSkills(address agent) view returns (string[])',
  'function getSkillEndorsement(address agent, string skill) view returns (uint256 totalEndorsements, uint256 credibilityScore)',
  'function findAgentsBySkill(string skill, uint256 minCredibility) view returns (address[])',
  'event SkillEndorsed(address indexed agent, address indexed endorser, string skill, uint256 newCredibility)',
];

// Provider and contracts
const provider = new ethers.JsonRpcProvider(BASE_RPC);
const reputationRegistry = new ethers.Contract(CONTRACTS.REPUTATION_REGISTRY, REPUTATION_ABI, provider);
const skillEndorsement = new ethers.Contract(CONTRACTS.SKILL_ENDORSEMENT, SKILL_ABI, provider);

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.time < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', contracts: CONTRACTS });
});

// Get agent reputation
app.get('/agent/:address/reputation', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `rep:${address}`;
    
    let reputation = getCached(cacheKey);
    if (!reputation) {
      reputation = Number(await reputationRegistry.getReputation(address));
      setCache(cacheKey, reputation);
    }
    
    res.json({ 
      address, 
      reputation,
      percentage: (reputation / 10).toFixed(1) + '%'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get full agent profile
app.get('/agent/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const cacheKey = `profile:${address}`;
    
    let profile = getCached(cacheKey);
    if (!profile) {
      const raw = await reputationRegistry.getProfile(address);
      profile = {
        wallet: raw.wallet,
        name: raw.name,
        reputation: Number(raw.reputation),
        reputationPercent: (Number(raw.reputation) / 10).toFixed(1) + '%',
        jobsCompleted: Number(raw.jobsCompleted),
        jobsFailed: Number(raw.jobsFailed),
        endorsementsReceived: Number(raw.endorsementsReceived),
        endorsementsGiven: Number(raw.endorsementsGiven),
        registeredAt: new Date(Number(raw.registeredAt) * 1000).toISOString(),
        isActive: raw.isActive,
      };
      setCache(cacheKey, profile);
    }
    
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get agent skills
app.get('/agent/:address/skills', async (req, res) => {
  try {
    const { address } = req.params;
    const skills = await skillEndorsement.getAgentSkills(address);
    
    // Get endorsement details for each skill
    const skillsWithDetails = await Promise.all(
      skills.map(async (skill) => {
        const endorsement = await skillEndorsement.getSkillEndorsement(address, skill);
        return {
          skill,
          totalEndorsements: Number(endorsement.totalEndorsements),
          credibilityScore: Number(endorsement.credibilityScore),
        };
      })
    );
    
    res.json({ address, skills: skillsWithDetails });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get top agents for a skill
app.get('/skills/:skill/agents', async (req, res) => {
  try {
    const { skill } = req.params;
    const minCredibility = parseInt(req.query.min || '0');
    
    const agents = await skillEndorsement.findAgentsBySkill(skill, minCredibility);
    
    // Get profiles for each agent
    const agentsWithProfiles = await Promise.all(
      agents.slice(0, 50).map(async (address) => { // Limit to 50
        try {
          const profile = await reputationRegistry.getProfile(address);
          return {
            address,
            name: profile.name,
            reputation: Number(profile.reputation),
          };
        } catch {
          return { address, name: 'Unknown', reputation: 0 };
        }
      })
    );
    
    // Sort by reputation
    agentsWithProfiles.sort((a, b) => b.reputation - a.reputation);
    
    res.json({ skill, minCredibility, agents: agentsWithProfiles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get trust graph (recent events)
app.get('/trust-graph', async (req, res) => {
  try {
    const cacheKey = 'trust-graph';
    let graph = getCached(cacheKey);
    
    if (!graph) {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 43200); // ~1 day
      
      // Fetch events
      const registeredEvents = await reputationRegistry.queryFilter(
        reputationRegistry.filters.AgentRegistered(),
        fromBlock
      );
      
      const endorsementEvents = await reputationRegistry.queryFilter(
        reputationRegistry.filters.EndorsementReceived(),
        fromBlock
      );
      
      // Build nodes
      const nodesMap = new Map();
      for (const event of registeredEvents) {
        const args = event.args;
        if (args) {
          nodesMap.set(args[0], {
            id: args[1] || args[0].slice(0, 8),
            address: args[0],
            type: 'agent',
          });
        }
      }
      
      // Build links
      const links = [];
      for (const event of endorsementEvents) {
        const args = event.args;
        if (args) {
          links.push({
            from: args[1], // endorser
            to: args[0],   // agent
            weight: Number(args[2]),
          });
        }
      }
      
      graph = {
        nodes: Array.from(nodesMap.values()),
        links,
        fetchedAt: new Date().toISOString(),
      };
      
      setCache(cacheKey, graph);
    }
    
    res.json(graph);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Contract addresses
app.get('/contracts', (req, res) => {
  res.json(CONTRACTS);
});

// Start server
app.listen(PORT, () => {
  console.log(`Trust Protocol API running on port ${PORT}`);
  console.log(`Contracts: ${JSON.stringify(CONTRACTS)}`);
});
