import * as fs from "fs";
import { TaskArguments, HardhatRuntimeEnvironment, Network } from "hardhat/types";
import { task } from "hardhat/config";
import { developmentChains, governorConfig } from "../helper-hardhat.config";
import { moveBlocks } from "../utils/moveBlocks";
import { TheGovernor } from "../typechain";

//! seems like there's a problem with voteway

const { proposals_file, voting_period } = governorConfig;

// 0 = Against, 1 = For, 2 = Abstain for this example
export async function vote(
  proposalId: string,
  voteWay: number,
  reason: string,
  ethers: any,
  network: Network
) {
  console.log("Voting...");
  const governor:TheGovernor = await ethers.getContract("TheGovernor");
  const voteTx = await governor.castVoteWithReason(proposalId, voteWay, reason);
  const voteTxReceipt = await voteTx.wait(1);
  if (!voteTxReceipt.events) return;
  console.log(voteTxReceipt.events[0].args!.reason);
  const proposalState = await governor.state(proposalId);
  console.log(`Current Proposal State: ${proposalState}`);
  if (developmentChains.includes(network.name)) {
    await moveBlocks(voting_period + 1, network);
  }
}

task("vote", "Vote on a proposal")
  .addOptionalParam("index", "The proposal index to vote on")
  .setAction( async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        const { ethers, network } = hre;
        const chainId = network.config.chainId;
        if (!chainId) {
        console.log("No chainId found");
        return;
        }

        const { index } = taskArgs;
        const proposals = JSON.parse(fs.readFileSync(proposals_file, "utf8"));
        // You could swap this out for the ID you want to use too
        const proposalId = proposals[chainId].at(parseInt(index));
        // 0 = Against, 1 = For, 2 = Abstain for this example
        const voteWay = 1;
        const reason = "I lika do da cha cha";
        await vote(proposalId, voteWay, reason, ethers, network);
    });