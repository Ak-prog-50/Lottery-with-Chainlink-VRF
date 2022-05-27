import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { MIN_DELAY } from '../helper-hardhat.config'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('TimeLock', {
    from: deployer,
    args: [MIN_DELAY, [], []],
    log: true,
  });

};

export default func;// export default func; //can use whatever name in here. Hardhat deploy will import the export as "func"
func.tags = ["Timelock"];