const hre = require("hardhat");

async function main() {
  console.log("Deploying Phronesis Trust Protocol contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log();

  // 1. Deploy ReputationRegistry
  console.log("1. Deploying ReputationRegistry...");
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const registry = await ReputationRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   ReputationRegistry deployed to:", registryAddress);

  // 2. Deploy SkillEndorsement
  console.log("\n2. Deploying SkillEndorsement...");
  const SkillEndorsement = await hre.ethers.getContractFactory("SkillEndorsement");
  const skills = await SkillEndorsement.deploy(registryAddress);
  await skills.waitForDeployment();
  const skillsAddress = await skills.getAddress();
  console.log("   SkillEndorsement deployed to:", skillsAddress);

  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("  ReputationRegistry:", registryAddress);
  console.log("  SkillEndorsement:", skillsAddress);
  console.log("\nNext steps:");
  console.log("  1. Verify contracts on BaseScan");
  console.log("  2. Set Openwork as a trusted platform");
  console.log("  3. Integrate with the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
