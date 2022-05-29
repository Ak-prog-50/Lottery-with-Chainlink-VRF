import { assert, expect } from "chai";
import { network, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat.config";
import { Lottery } from "../../typechain";

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Tests", function () {
      let lottery: Lottery;

      beforeEach(async () => {
        lottery = await ethers.getContract("Lottery");
        await lottery.startLottery();

        const entranceFee = await lottery.getEntranceFee();
        await lottery.enter({ value: entranceFee });

        const [, guy1, guy2] = await ethers.getSigners(); // bypassing named accounts

        await lottery.connect(guy1).enter({ value: entranceFee });
        console.info("\tGuy1 Entered!");
        await lottery.connect(guy2).enter({ value: entranceFee });
        console.info("\tGuy2 Entered!");
      });

      it("Should request random words + choose a winner + pay the winner", async () => {
        await new Promise(async (resolve, reject) => {
          lottery.once("WinnerGotMoney()", async () => {
            console.info("Winner Got Money!");
            try {
              const lotteryState = await lottery.s_lotteryState();
              assert.equal(lotteryState, 1);
              const recentWinner = await lottery.s_recentWinner();
              console.info("\nHere is the recent winner!", recentWinner)
              //@dev also get the randomWords from emitted event!
              resolve(true);
            } catch (err) {
              console.error(err);
              reject();
            }
          });
          await lottery.endLottery();
        });
      });
    });
