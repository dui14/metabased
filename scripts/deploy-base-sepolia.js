const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function ensure0x(value) {
  if (!value) return value;
  return value.startsWith("0x") ? value : `0x${value}`;
}

function upsertEnv(filePath, key, value) {
  const line = `${key}=${value}`;
  let content = "";

  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf8");
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, line);
    } else {
      content = `${content.trim()}\n${line}\n`;
    }
  } else {
    content = `${line}\n`;
  }

  fs.writeFileSync(filePath, content);
}

function getGasBumpPercent() {
  const value = Number(process.env.BASE_SEPOLIA_GAS_BUMP_PERCENT || "20");
  if (!Number.isFinite(value)) {
    return 20;
  }
  return Math.max(0, Math.floor(value));
}

function applyBump(value, percent) {
  if (value == null) {
    return null;
  }
  const factor = BigInt(100 + percent);
  return (value * factor) / 100n;
}

async function getFeeOverrides(provider) {
  const feeData = await provider.getFeeData();
  const bumpPercent = getGasBumpPercent();
  const overrides = {};

  const maxFeePerGas = applyBump(feeData.maxFeePerGas, bumpPercent);
  const maxPriorityFeePerGas = applyBump(feeData.maxPriorityFeePerGas, bumpPercent);
  const gasPrice = applyBump(feeData.gasPrice, bumpPercent);

  if (maxFeePerGas != null && maxPriorityFeePerGas != null) {
    overrides.maxFeePerGas = maxFeePerGas;
    overrides.maxPriorityFeePerGas = maxPriorityFeePerGas;
    return overrides;
  }

  if (gasPrice != null) {
    overrides.gasPrice = gasPrice;
  }

  return overrides;
}

async function deployContract(factoryName, constructorArgs, txOverrides) {
  const Factory = await hre.ethers.getContractFactory(factoryName);
  const contract = await Factory.deploy(...constructorArgs, txOverrides);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  if (!process.env.BASE_SEPOLIA_PRIVATE_KEY) {
    throw new Error("Missing BASE_SEPOLIA_PRIVATE_KEY in .env");
  }

  const privateKey = ensure0x(process.env.BASE_SEPOLIA_PRIVATE_KEY);
  process.env.BASE_SEPOLIA_PRIVATE_KEY = privateKey;

  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== 84532) {
    throw new Error(`Wrong chainId ${network.chainId}. Expected 84532 (Base Sepolia)`);
  }

  const mintEndTime = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10;
  const feeOverrides = await getFeeOverrides(provider);
  let nextNonce = await provider.getTransactionCount(deployer.address, "pending");

  const nft721 = await deployContract(
    "NFT721",
    ["Metabased NFT721", "MB721", mintEndTime],
    { ...feeOverrides, nonce: nextNonce++ }
  );

  const nft1155 = await deployContract(
    "NFT1155",
    ["https://api.metabased.xyz/metadata/{id}.json", mintEndTime],
    { ...feeOverrides, nonce: nextNonce++ }
  );

  const marketplace = await deployContract(
    "Marketplace",
    [250],
    { ...feeOverrides, nonce: nextNonce++ }
  );

  const output = {
    network: "baseSepolia",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      nft721: await nft721.getAddress(),
      nft1155: await nft1155.getAddress(),
      marketplace: await marketplace.getAddress(),
    },
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, "base-sepolia.json"),
    JSON.stringify(output, null, 2)
  );

  const envTargets = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "src", ".env.local"),
    path.join(process.cwd(), "src", ".env.example"),
  ];

  const updates = {
    NEXT_PUBLIC_CHAIN_ID: "84532",
    NEXT_PUBLIC_RPC_URL: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    NEXT_PUBLIC_NFT721_CONTRACT_ADDRESS: output.contracts.nft721,
    NEXT_PUBLIC_NFT1155_CONTRACT_ADDRESS: output.contracts.nft1155,
    NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS: output.contracts.marketplace,
    NFT721_CONTRACT_ADDRESS: output.contracts.nft721,
    NFT1155_CONTRACT_ADDRESS: output.contracts.nft1155,
    MARKETPLACE_CONTRACT_ADDRESS: output.contracts.marketplace,
  };

  for (const filePath of envTargets) {
    for (const [key, value] of Object.entries(updates)) {
      upsertEnv(filePath, key, value);
    }
  }

  console.log("Deployer:", output.deployer);
  console.log("Nonce start:", nextNonce - 3);
  if (feeOverrides.maxFeePerGas != null && feeOverrides.maxPriorityFeePerGas != null) {
    console.log("maxFeePerGas:", feeOverrides.maxFeePerGas.toString());
    console.log("maxPriorityFeePerGas:", feeOverrides.maxPriorityFeePerGas.toString());
  } else if (feeOverrides.gasPrice != null) {
    console.log("gasPrice:", feeOverrides.gasPrice.toString());
  }
  console.log("NFT721:", output.contracts.nft721);
  console.log("NFT1155:", output.contracts.nft1155);
  console.log("Marketplace:", output.contracts.marketplace);
  console.log("Saved deployment:", path.join("deployments", "base-sepolia.json"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
