import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { verify } from "../helper-functions";
import {
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";
import { network } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  const governanceToken = await deployments.get("GovernanceToken");
  const timeLock = await deployments.get("TimeLock");

  const args = [governanceToken.address, timeLock.address, 1, 45818, 4, 0];
  const governor = await deploy("TheGovernor", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: developmentChains.includes(network.name)
      ? 1
      : VERIFICATION_BLOCK_CONFIRMATIONS,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(governor.address, args, "contracts/onchain_governance/TheGovernor.sol:TheGovernor");
  }
};

export default func; // export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["TheGovernor"];
