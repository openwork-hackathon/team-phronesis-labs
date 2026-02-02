import { ethers, Contract, Provider, Signer, JsonRpcProvider } from 'ethers';

// ============ Contract Addresses (Base Mainnet) ============

export const CONTRACTS = {
  REPUTATION_REGISTRY: '0x96BF408C918355a4AE3EE5eedf962F647c962e0d',
  SKILL_ENDORSEMENT: '0x4d2Db474D472dCF7aACD694120adD70ED02f9Ec9',
} as const;

export const BASE_MAINNET_RPC = 'https://mainnet.base.org';

// ============ ABIs ============

export const REPUTATION_REGISTRY_ABI = [
  // Read functions
  'function agents(address) view returns (address wallet, string name, uint256 reputation, uint256 jobsCompleted, uint256 jobsFailed, uint256 endorsementsReceived, uint256 endorsementsGiven, uint256 registeredAt, bool isActive)',
  'function getReputation(address agent) view returns (uint256)',
  'function getProfile(address agent) view returns (tuple(address wallet, string name, uint256 reputation, uint256 jobsCompleted, uint256 jobsFailed, uint256 endorsementsReceived, uint256 endorsementsGiven, uint256 registeredAt, bool isActive))',
  'function isRegistered(address agent) view returns (bool)',
  'function getJobCount(address agent) view returns (uint256 completed, uint256 failed)',
  'function totalAgents() view returns (uint256)',
  'function trustedPlatforms(address) view returns (bool)',
  
  // Write functions
  'function registerAgent(string name)',
  'function endorseAgent(address agent)',
  'function reportJobCompleted(address agent, bytes32 jobId, address client, uint256 reward, uint8 rating)',
  'function reportJobFailed(address agent, bytes32 jobId)',
  'function setTrustedPlatform(address platform, bool trusted)',
  
  // Events
  'event AgentRegistered(address indexed agent, string name, uint256 timestamp)',
  'event JobCompleted(address indexed agent, bytes32 indexed jobId, address platform, uint8 rating)',
  'event JobFailed(address indexed agent, bytes32 indexed jobId, address platform)',
  'event ReputationUpdated(address indexed agent, uint256 oldScore, uint256 newScore)',
  'event EndorsementReceived(address indexed agent, address indexed endorser, uint256 weight)',
];

export const SKILL_ENDORSEMENT_ABI = [
  // Read functions
  'function getSkillEndorsement(address agent, string skill) view returns (uint256 totalEndorsements, uint256 credibilityScore)',
  'function getAgentSkills(address agent) view returns (string[])',
  'function hasEndorsed(address endorser, address agent, string skill) view returns (bool)',
  'function findAgentsBySkill(string skill, uint256 minCredibility) view returns (address[])',
  
  // Write functions  
  'function endorseSkill(address agent, string skill)',
  'function revokeEndorsement(address agent, string skill)',
  
  // Events
  'event SkillEndorsed(address indexed agent, address indexed endorser, string skill, uint256 newCredibility)',
  'event EndorsementRevoked(address indexed agent, address indexed endorser, string skill)',
];

// ============ Types ============

export interface AgentProfile {
  wallet: string;
  name: string;
  reputation: bigint;
  jobsCompleted: bigint;
  jobsFailed: bigint;
  endorsementsReceived: bigint;
  endorsementsGiven: bigint;
  registeredAt: bigint;
  isActive: boolean;
}

export interface SkillEndorsement {
  totalEndorsements: bigint;
  credibilityScore: bigint;
}

// ============ SDK Class ============

export class TrustProtocol {
  private provider: Provider;
  private signer?: Signer;
  private reputationRegistry: Contract;
  private skillEndorsement: Contract;

  constructor(providerOrSigner?: Provider | Signer | string) {
    // Default to Base mainnet
    if (!providerOrSigner) {
      this.provider = new JsonRpcProvider(BASE_MAINNET_RPC);
    } else if (typeof providerOrSigner === 'string') {
      this.provider = new JsonRpcProvider(providerOrSigner);
    } else if ('getAddress' in providerOrSigner) {
      // It's a signer
      this.signer = providerOrSigner;
      this.provider = providerOrSigner.provider!;
    } else {
      this.provider = providerOrSigner;
    }

    const signerOrProvider = this.signer || this.provider;
    
    this.reputationRegistry = new Contract(
      CONTRACTS.REPUTATION_REGISTRY,
      REPUTATION_REGISTRY_ABI,
      signerOrProvider
    );
    
    this.skillEndorsement = new Contract(
      CONTRACTS.SKILL_ENDORSEMENT,
      SKILL_ENDORSEMENT_ABI,
      signerOrProvider
    );
  }

  // ============ Read Functions ============

  /**
   * Get an agent's reputation score (0-1000)
   */
  async getReputation(address: string): Promise<bigint> {
    return await this.reputationRegistry.getReputation(address);
  }

  /**
   * Get full agent profile
   */
  async getProfile(address: string): Promise<AgentProfile> {
    const profile = await this.reputationRegistry.getProfile(address);
    return {
      wallet: profile.wallet,
      name: profile.name,
      reputation: profile.reputation,
      jobsCompleted: profile.jobsCompleted,
      jobsFailed: profile.jobsFailed,
      endorsementsReceived: profile.endorsementsReceived,
      endorsementsGiven: profile.endorsementsGiven,
      registeredAt: profile.registeredAt,
      isActive: profile.isActive,
    };
  }

  /**
   * Check if an address is registered as an agent
   */
  async isRegistered(address: string): Promise<boolean> {
    return await this.reputationRegistry.isRegistered(address);
  }

  /**
   * Get total number of registered agents
   */
  async getTotalAgents(): Promise<bigint> {
    return await this.reputationRegistry.totalAgents();
  }

  /**
   * Get job completion stats for an agent
   */
  async getJobCount(address: string): Promise<{ completed: bigint; failed: bigint }> {
    const [completed, failed] = await this.reputationRegistry.getJobCount(address);
    return { completed, failed };
  }

  /**
   * Get skill endorsement for an agent
   */
  async getSkillEndorsement(address: string, skill: string): Promise<SkillEndorsement> {
    const result = await this.skillEndorsement.getSkillEndorsement(address, skill);
    return {
      totalEndorsements: result.totalEndorsements,
      credibilityScore: result.credibilityScore,
    };
  }

  /**
   * Get all skills an agent has been endorsed for
   */
  async getAgentSkills(address: string): Promise<string[]> {
    return await this.skillEndorsement.getAgentSkills(address);
  }

  /**
   * Find agents with a specific skill
   */
  async findAgentsBySkill(skill: string, minCredibility: number = 0): Promise<string[]> {
    return await this.skillEndorsement.findAgentsBySkill(skill, minCredibility);
  }

  // ============ Write Functions (require signer) ============

  /**
   * Register as an agent
   */
  async registerAgent(name: string) {
    if (!this.signer) throw new Error('Signer required for write operations');
    const tx = await this.reputationRegistry.registerAgent(name);
    return await tx.wait();
  }

  /**
   * Endorse another agent (adds to their reputation)
   */
  async endorseAgent(agentAddress: string) {
    if (!this.signer) throw new Error('Signer required for write operations');
    const tx = await this.reputationRegistry.endorseAgent(agentAddress);
    return await tx.wait();
  }

  /**
   * Endorse an agent for a specific skill
   */
  async endorseSkill(agentAddress: string, skill: string) {
    if (!this.signer) throw new Error('Signer required for write operations');
    const tx = await this.skillEndorsement.endorseSkill(agentAddress, skill);
    return await tx.wait();
  }

  /**
   * Revoke a skill endorsement
   */
  async revokeEndorsement(agentAddress: string, skill: string) {
    if (!this.signer) throw new Error('Signer required for write operations');
    const tx = await this.skillEndorsement.revokeEndorsement(agentAddress, skill);
    return await tx.wait();
  }

  // ============ Event Listeners ============

  /**
   * Listen for new agent registrations
   */
  onAgentRegistered(callback: (agent: string, name: string, timestamp: bigint) => void) {
    this.reputationRegistry.on('AgentRegistered', callback);
    return () => this.reputationRegistry.off('AgentRegistered', callback);
  }

  /**
   * Listen for reputation updates
   */
  onReputationUpdated(callback: (agent: string, oldScore: bigint, newScore: bigint) => void) {
    this.reputationRegistry.on('ReputationUpdated', callback);
    return () => this.reputationRegistry.off('ReputationUpdated', callback);
  }

  /**
   * Listen for skill endorsements
   */
  onSkillEndorsed(callback: (agent: string, endorser: string, skill: string, newCredibility: bigint) => void) {
    this.skillEndorsement.on('SkillEndorsed', callback);
    return () => this.skillEndorsement.off('SkillEndorsed', callback);
  }

  // ============ Utilities ============

  /**
   * Format reputation score as percentage (0-100%)
   */
  static formatReputation(score: bigint): string {
    return `${Number(score) / 10}%`;
  }

  /**
   * Get the raw contract instances for advanced usage
   */
  getContracts() {
    return {
      reputationRegistry: this.reputationRegistry,
      skillEndorsement: this.skillEndorsement,
    };
  }
}

// Default export for convenience
export default TrustProtocol;
