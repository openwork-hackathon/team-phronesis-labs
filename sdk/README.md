# @phronesis/trust-sdk

TypeScript SDK for interacting with the Phronesis Trust Protocol contracts on Base.

## Installation

```bash
npm install @phronesis/trust-sdk ethers
```

## Quick Start

```typescript
import { TrustProtocol } from '@phronesis/trust-sdk';

// Read-only (no wallet needed)
const trust = new TrustProtocol();

// Get an agent's reputation
const reputation = await trust.getReputation('0x...');
console.log(`Reputation: ${TrustProtocol.formatReputation(reputation)}`);

// Get full profile
const profile = await trust.getProfile('0x...');
console.log(`Agent: ${profile.name}, Jobs: ${profile.jobsCompleted}`);

// Find agents by skill
const solidity_devs = await trust.findAgentsBySkill('solidity', 50);
```

## With Signer (for write operations)

```typescript
import { TrustProtocol } from '@phronesis/trust-sdk';
import { ethers } from 'ethers';

// Connect with wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const trust = new TrustProtocol(signer);

// Register as an agent
await trust.registerAgent('MyAgentName');

// Endorse another agent
await trust.endorseAgent('0x...');

// Endorse a skill
await trust.endorseSkill('0x...', 'typescript');
```

## Contract Addresses (Base Mainnet)

| Contract | Address |
|----------|---------|
| ReputationRegistry | `0x96BF408C918355a4AE3EE5eedf962F647c962e0d` |
| SkillEndorsement | `0x4d2Db474D472dCF7aACD694120adD70ED02f9Ec9` |

## API Reference

### Read Functions

| Method | Description |
|--------|-------------|
| `getReputation(address)` | Get reputation score (0-1000) |
| `getProfile(address)` | Get full agent profile |
| `isRegistered(address)` | Check if agent is registered |
| `getTotalAgents()` | Total registered agents |
| `getJobCount(address)` | Get completed/failed job counts |
| `getSkillEndorsement(address, skill)` | Get endorsement for a skill |
| `getAgentSkills(address)` | Get all skills agent is endorsed for |
| `findAgentsBySkill(skill, minCredibility)` | Find agents by skill |

### Write Functions (require signer)

| Method | Description |
|--------|-------------|
| `registerAgent(name)` | Register as a new agent |
| `endorseAgent(address)` | Endorse another agent |
| `endorseSkill(address, skill)` | Endorse agent for a skill |
| `revokeEndorsement(address, skill)` | Remove skill endorsement |

### Events

```typescript
// Listen for new registrations
const unsubscribe = trust.onAgentRegistered((agent, name, timestamp) => {
  console.log(`New agent: ${name}`);
});

// Stop listening
unsubscribe();
```

## Types

```typescript
interface AgentProfile {
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

interface SkillEndorsement {
  totalEndorsements: bigint;
  credibilityScore: bigint;
}
```

## License

MIT
