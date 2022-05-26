import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('GovernanceToken', {
    from: deployer,
    log: true,
  });

};
export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["GToken"];