import {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { BigNumber } from "ethers";
import { verify } from "../helper-functions";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const chainId = hre.network.config.chainId;
  if (!chainId) return;
  const entranceFeeInUSD = 50;
  let subscriptionId: BigNumber;
  let vrfCoordinatorAddr: string | undefined;
  let priceFeedAddr: string | undefined;

  if (chainId === 31337) {
    const priceFeed = await deployments.get("MockV3Aggregator");
    const VRFCoordinatorV2MockDepl = await deployments.get(
      "VRFCoordinatorV2Mock"
    );
    const VRFCoordinatorV2Mock = await ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      VRFCoordinatorV2MockDepl.address
    );

    const fundAmount = networkConfig[chainId].fundAmount;
    const transaction = await VRFCoordinatorV2Mock.createSubscription();
    //* seems like addConsumer is not needed in mock testing
    const transactionReceipt = await transaction.wait(1);
    if (!transactionReceipt.events) return;
    subscriptionId = ethers.BigNumber.from(
      transactionReceipt.events[0].topics[1]
    );
    await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, fundAmount);
    priceFeedAddr = priceFeed.address;
    vrfCoordinatorAddr = VRFCoordinatorV2Mock.address;
  } else {
    (priceFeedAddr = networkConfig[chainId].ethUsdPriceFeed),
    (vrfCoordinatorAddr = networkConfig[chainId].vrfCoordinator);
    subscriptionId = BigNumber.from(process.env.VRF_SUBSCRIPTION_ID);
  }

  const waitBlockConfirmations = developmentChains.includes(network.name)
    ? 1
    : VERIFICATION_BLOCK_CONFIRMATIONS;

  console.log("\n\tSubscriptionId", subscriptionId, subscriptionId._hex, "\n");
  const args = [
    priceFeedAddr,
    vrfCoordinatorAddr,
    entranceFeeInUSD,
    subscriptionId,
  ];

  const lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: waitBlockConfirmations,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(lottery.address, args, "contracts/Lottery.sol:Lottery");
  }

  const lotteryContract = await ethers.getContract("Lottery");
  const timeLock = await ethers.getContract("TimeLock");
  log(`Transferring ownership...`)
  const transferTx = await lotteryContract.transferOwnership(timeLock.address);
  await transferTx.wait(1);
  log(`Ownership of Lottery contract transferred to TimeLock contract at ${timeLock.address}`);
};

export default func;
func.tags = ["lottery"];
// func.dependencies = ["mocks"]
