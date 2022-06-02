import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import {
  developmentChains,
  governorConfig
} from "../helper-hardhat.config"
import * as fs from "fs"
import { moveBlocks } from "../utils/moveBlocks"
import { TheGovernor } from "../typechain"

const { voting_delay, proposals_file } = governorConfig

task("propose", "Propose a new store value")
    .addParam("func", "The function to call")
    .addOptionalParam("description", "The description of the proposal")
    .addOptionalParam("args", "The arguments to pass to the function")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) =>{
        const { ethers, network } = hre
        const chainId = network.config.chainId
        if (!chainId) { console.log("No chainId found"); return }

        const {func, description, args} = taskArgs
        const governor:TheGovernor = await ethers.getContract("TheGovernor")
        const lottery = await ethers.getContract("Lottery")
        const encodedFunctionCall = lottery.interface.encodeFunctionData(func, args)
        console.log(`Proposing ${func} on ${lottery.address} with ${args}`)
        console.log(`Proposal Description:\n  ${description}`)
        const proposeTx = await governor.propose(
          [lottery.address],
          [0],
          [encodedFunctionCall],
          description
        )
        // If working on a development chain, we will push forward till we get to the voting period.
        if (developmentChains.includes(network.name)) {
          await moveBlocks(voting_delay + 1, network)
        }
        const proposeReceipt = await proposeTx.wait(1)
        if (!proposeReceipt.events) return
        const proposalId = proposeReceipt.events[0].args?.proposalId
        console.log(`Proposed with proposal ID:\n  ${proposalId}`)
      
        const proposalState = await governor.state(proposalId)  // Proposalstate enum in IGovernor.sol
        const proposalSnapShot = await governor.proposalSnapshot(proposalId) // Block number used to retrieve user’s voting power and quorum
        const proposalDeadline = await governor.proposalDeadline(proposalId) // eqls to propsalSnapshot + voting_period

        // save the proposalId
        let proposals = JSON.parse(fs.readFileSync(proposals_file, "utf8"))
        if (!proposals[chainId] || !proposals[chainId].length) {
          proposals[chainId.toString()] = [proposalId.toString()]
        }
        else{
          proposals[chainId.toString()].push(proposalId.toString())
        }
        fs.writeFileSync(proposals_file, JSON.stringify(proposals))
      
        // The state of the proposal.
        console.log(`Current Proposal State: ${proposalState}`)
        // What block # the proposal was snapshot
        console.log(`Current Proposal Snapshot: ${proposalSnapShot}`)
        // The block number the proposal voting expires
        console.log(`Current Proposal Deadline: ${proposalDeadline}`)
    })

