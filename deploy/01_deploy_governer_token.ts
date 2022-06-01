import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} from "../helper-hardhat.config";
import { network } from "hardhat";
import { verify } from "../helper-functions";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const governanceToken = await deploy("GovernanceToken", {
    from: deployer,
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
    await verify(governanceToken.address, [], "contracts/onchain_governance/GovernanceToken.sol:GovernanceToken");
  }
};

export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["GToken", "dao"];
