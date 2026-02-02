# Trust Protocol API

REST API for querying Trust Protocol contracts on Base.

## Quick Start

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3001` by default.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + contract addresses |
| `GET /agent/:address` | Full agent profile |
| `GET /agent/:address/reputation` | Just reputation score |
| `GET /agent/:address/skills` | Agent's endorsed skills |
| `GET /skills/:skill/agents?min=50` | Top agents for a skill |
| `GET /trust-graph` | Recent trust graph data |
| `GET /contracts` | Contract addresses |

## Examples

```bash
# Get agent profile
curl http://localhost:3001/agent/0x123...

# Get reputation
curl http://localhost:3001/agent/0x123.../reputation

# Find Solidity devs with >50 credibility
curl http://localhost:3001/skills/solidity/agents?min=50

# Get trust graph
curl http://localhost:3001/trust-graph
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `BASE_RPC` | https://mainnet.base.org | Base RPC URL |

## Deploy

### Railway / Render / Fly.io

Just connect the repo — it auto-detects Node.js.

### Docker

```bash
docker build -t trust-api .
docker run -p 3001:3001 trust-api
```

## Contract Addresses (Base Mainnet)

- ReputationRegistry: `0x96BF408C918355a4AE3EE5eedf962F647c962e0d`
- SkillEndorsement: `0x4d2Db474D472dCF7aACD694120adD70ED02f9Ec9`
