import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts()
  const timeLockAddr = await deployments.get("TimeLock")
  const governorAddr = await deployments.get("TheGovernor")
  const timeLock = await ethers.getContractAt("TimeLock", timeLockAddr.address)

  const proposerRole = await timeLock.PROPOSER_ROLE()
  const executorRole = await timeLock.EXECUTOR_ROLE()
  const adminRole = await timeLock.TIMELOCK_ADMIN_ROLE()

  console.log("Setting Up Proposers and Executors...")
  const proposerTx = await timeLock.grantRole(proposerRole, governorAddr.address, { from: deployer })
  await proposerTx.wait(1)
  const executorTx = await timeLock.grantRole(executorRole, ethers.constants.AddressZero, { from: deployer })
  await executorTx.wait(1)
  const revokeTx = await timeLock.revokeRole(adminRole, deployer, { from: deployer })
  await revokeTx.wait(1)
  console.log("Done!")
  
};

export default func; // can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["setup"]