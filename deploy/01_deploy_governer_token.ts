import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const governanceToken = await deploy("GovernanceToken", {
    from: deployer,
    log: true,
  });

  // await delegate(governanceToken.address, deployer)
};

const delegate = async (governanceTokenAddr: string, delegatedAcc: string) => {
  const governanceToken = await ethers.getContractAt("GovernanceToken", governanceTokenAddr);
  const tx = await governanceToken.delegate(delegatedAcc)
  await tx.wait(1)
  console.log(`Num of Checkpoints for ${delegatedAcc}: ${await governanceToken.numCheckpoints(delegatedAcc)}`)
};

export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["GToken"];
