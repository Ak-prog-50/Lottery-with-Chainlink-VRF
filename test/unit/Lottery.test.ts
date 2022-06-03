import { assert, expect } from "chai";
import { network, deployments, ethers, getNamedAccounts } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", function () {
      let lottery: Lottery;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;

      beforeEach(async () => {
        await deployments.fixture(["mocks", "lottery"]);
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        lottery = await ethers.getContract("Lottery");
        console.log(lottery.address, "lottery address");
        await lottery.startLottery();

        const entranceFee = await lottery.getEntranceFee();
        await lottery.enter({ value: entranceFee });

        const [, guy1, guy2] = await ethers.getSigners(); // bypassing named accounts

        await lottery.connect(guy1).enter({ value: entranceFee });
        await lottery.connect(guy2).enter({ value: entranceFee });
      });

      it("Should test the entrance fee and enter func()", async () => {
        const entranceFee = await lottery.getEntranceFee();
        const { deployer } = await getNamedAccounts();
        const [, guy1, guy2] = await ethers.getSigners();
        console.log(
          "\t",
          deployer,
          guy1.address,
          guy2.address,
          "deployer, guy1, guy2"
        );

        // console.log(entranceFee.toString(), "entry fee")
        // console.log(deployer, typeof(deployer), "deployer")
        // console.log("\n", typeof(await lottery.s_participants(0)), "Participant zero")
        // console.log((await lottery.s_addressToAmountDeposited(deployer)).toString(), "Amount funded")
        expect(await lottery.s_participants(0)).to.equal(deployer);
        expect(await lottery.s_addressToAmountDeposited(deployer)).to.equal(
          entranceFee
        );
        expect(await lottery.s_participants(1)).to.equal(guy1.address);
        expect(await lottery.s_addressToAmountDeposited(guy1.address)).to.equal(
          entranceFee
        );
        expect(await lottery.s_participants(2)).to.equal(guy2.address);
        expect(await lottery.s_addressToAmountDeposited(guy2.address)).to.equal(
          entranceFee
        );

        await expect(lottery.enter()).to.be.revertedWith(
          "Lottery__SendMoreToEnterLottery"
        )
      });

      it("Should successfully request random words", async () => {
        await expect(lottery.endLottery()).to.emit(
          vrfCoordinatorV2Mock,
          "RandomWordsRequested"
        );
      });

      it("Should successfully request random words and get a result", async () => {
        const [, , guy2] = await ethers.getSigners();
        const lotteryBalanceBeforeEnding = await ethers.provider.getBalance(
          lottery.address
        );
        const winnerBalanceBeforeEnding = await ethers.provider.getBalance(
          guy2.address
        ); //* recent winner is predictable in the mock.

        await lottery.endLottery();
        const s_requestId = await lottery.s_requestId();
        //   console.log(s_requestId.toString(), "s_requestId")

        // simulate callback from the oracle network
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(s_requestId, lottery.address)
        ).to.emit(lottery, "WinnerGotMoney");
        //   const som = await vrfCoordinatorV2Mock.fulfillRandomWords(s_requestId, lottery.address)
        //   const somtx = await som.wait(1)
        //   console.log("\n",somtx)
        //   console.log('\nLog Topics',somtx.logs[1].topics)
        //   console.log('\n', somtx.events[1].args)
        //   console.log('\n', somtx.events[1].args.s_requestId.toString())
        //   console.log('\n', somtx.events[1].args.outputSeed.toString())
        //   console.log('\n', somtx.events[1].args.payment.toString())

        assert((await lottery.s_participants.length) === 0);
        //   console.log(await lottery.lotteryState(), "lotteryState ( 1 means closed )")
        //   console.log(await lottery.s_participants.length, "s_participants length")
        //   //*     uint256[] memory words = new uint256[](req.numWords);
        //   //*       for (uint256 i = 0; i < req.numWords; i++) {
        //   //*         words[i] = uint256(keccak256(abi.encode(_requestId, i)));
        //   //*     }    LINE 71 -74 IN VRFCoordinatorV2Mock.sol
        //   //NOTES: Due to above mock vrf always returns the same random number based on the s_requestId & index
        const s_recentWinner = await lottery.s_recentWinner();
        expect(s_recentWinner).to.equal(guy2.address);

        const winnerBalanceAfterEnding = await ethers.provider.getBalance(
          s_recentWinner
        );
        const lotteryBalanceAfterEnding = await ethers.provider.getBalance(
          lottery.address
        );
        assert(lotteryBalanceAfterEnding.toString() === "0");
        expect(winnerBalanceAfterEnding).to.equal(
          winnerBalanceBeforeEnding.add(lotteryBalanceBeforeEnding)
        );
        console.log("\n\n");
        console.log(
          ethers.utils.formatEther(winnerBalanceBeforeEnding),
          "winner balance before ending lottery!"
        );
        console.log(
          ethers.utils.formatEther(winnerBalanceAfterEnding),
          "winner balance after ending lottery!"
        );
        console.log(
          ethers.utils.formatEther(lotteryBalanceBeforeEnding),
          "lottery balance before ending lottery!"
        );
        console.log(
          ethers.utils.formatEther(lotteryBalanceAfterEnding),
          "lottery balance after ending lottery!"
        );
        console.log("\n");
      });

      it("Should not be able to enter after particpant limit exceeds", async () => {
        const [, , , guy3] = await ethers.getSigners();
        await expect(
          lottery.connect(guy3).enter({ value: await lottery.getEntranceFee() })
        ).to.be.revertedWith("Lottery__ParticipantLimitExceeded");
      })
    });
