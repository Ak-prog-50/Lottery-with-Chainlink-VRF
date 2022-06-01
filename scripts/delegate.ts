import { ethers, getNamedAccounts } from "hardhat"
// https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Votes
/*This extension keeps a history (checkpoints) of each account’s vote power. 
Vote power can be delegated either by calling the delegate function directly, 
or by providing a signature to be used with delegateBySig. 
Voting power can be queried through the public accessors getVotes and getPastVotes.

By default, token balance does not account for voting power. 
This makes transfers cheaper. The downside is that it requires users to 
delegate to themselves in order to activate checkpoints and have their voting power tracked.*/

const delegate = async () => {
    const governanceToken = await ethers.getContract("GovernanceToken");
    const { deployer } = await getNamedAccounts()
    const tx = await governanceToken.delegate(deployer);
    await tx.wait(1);
    console.log(
      `Num of Checkpoints for ${deployer}: ${await governanceToken.numCheckpoints(
        deployer
      )}`
    );
  };

delegate().then(_ => console.log("Vote Power Delegated!")).catch(err => console.error(err))

