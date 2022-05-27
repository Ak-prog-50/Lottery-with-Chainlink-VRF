import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const governanceToken = await deployments.get("GovernanceToken");
  const timeLock = await deployments.get("TimeLock");

  await deploy("TheGovernor", {
    from: deployer,
    args: [governanceToken.address, timeLock.address, 1, 45818, 4, 0],
    log: true,
  });
};

export default func; // export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["TheGovernor"];
