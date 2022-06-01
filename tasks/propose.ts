import { ethers, network } from "hardhat"
import { task } from "hardhat/config"
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types"
import {
  developmentChains,
  governorConfig
} from "../helper-hardhat.config"
import * as fs from "fs"
import { moveBlocks } from "../utils/moveBlocks"
import { TheGovernor } from "../typechain"

const {voting_delay} = governorConfig

task("propose", "Propose a new store value")
    .addParam("func", "The function to call")
    .addParam("description", "The description of the proposal")
    .addParam("args", "The arguments to pass to the function")
    .setAction(async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
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
          await moveBlocks(voting_delay + 1)
        }
        const proposeReceipt = await proposeTx.wait(1)
        // if (!proposeReceipt.events) return
        // const proposalId = proposeReceipt.events[0]?.args.proposalId
        // console.log(`Proposed with proposal ID:\n  ${proposalId}`)
      
        // const proposalState = await governor.state(proposalId)
        // const proposalSnapShot = await governor.proposalSnapshot(proposalId)
        // const proposalDeadline = await governor.proposalDeadline(proposalId)
        // // save the proposalId
        // let proposals = JSON.parse(fs.readFileSync(proposalsFile, "utf8"))
        // proposals[network.config.chainId!.toString()].push(proposalId.toString())
        // fs.writeFileSync(proposalsFile, JSON.stringify(proposals))
      
        // The state of the proposal. 1 is not passed. 0 is passed.
        // console.log(`Current Proposal State: ${proposalState}`)
        // // What block # the proposal was snapshot
        // console.log(`Current Proposal Snapshot: ${proposalSnapShot}`)
        // // The block number the proposal voting expires
        // console.log(`Current Proposal Deadline: ${proposalDeadline}`)
    })

