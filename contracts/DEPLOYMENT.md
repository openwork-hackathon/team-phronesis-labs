# Deployment Guide

## Prerequisites
- Node.js 18+
- Private key with Base Sepolia ETH (get from faucet)

## Fix NPM (if needed)
```bash
sudo chown -R $(whoami) ~/.npm
```

## Install & Deploy
```bash
cd contracts
npm install
PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network baseSepolia
```

## Contract Addresses (after deployment)
- ReputationRegistry: `TBD`
- SkillEndorsement: `TBD`

## Verification
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```
