// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.6.0 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol"; //* vrf coordinator contract interface
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; //* base contract for any VRF consumer
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Lottery__TransferFailed();
error Lottery__SendMoreToEnterLottery();
error Lottery__LotteryNotOpen();
error Lottery__ParticipantLimitExceeded();

// error Lottery__NotTheOwner();

contract Lottery is VRFConsumerBaseV2, Ownable {
    enum LotteryState {
        OPEN,
        CLOSED,
        SELECTING_WINNER
    }

    int8 public s_entranceFeeInUsd; // 50 USD
    VRFCoordinatorV2Interface immutable i_vrfCoordinator;

    mapping(address => uint256) public s_addressToAmountDeposited;
    mapping(address => bool) public s_isParticipant;
    address[] public s_participants;
    address payable public s_recentWinner;
    uint256 public s_requestId;
    uint256 public s_maxParticpantsLimit;
    uint256 public s_lotteryEndTimestamp;
    uint32 public s_lotteryDuration = 24 hours; // returns 86400 seconds
    uint64 s_subscriptionId;
    LotteryState public s_lotteryState;
    AggregatorV3Interface internal s_priceFeed;

    // TODO: setters for these???
    bytes32 constant KEY_HASH =
        0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f; //* gas lane key hash (check docs for more info)
    uint32 constant CALLBACK_GAS_LIMIT = 100000; //* gas limit when VRF callback rawFulfillRandomWords func in VRFConsumerBaseV2.
    uint16 constant REQUEST_CONFIRMATIONS = 3; //* number of confirmations VRF node waits for before fulfilling request
    uint32 constant NUM_WORDS = 1; //* number of words(uint256 values) in the random word request

    event WinnerGotMoney(address _recentWinner, uint256[] _randomWords);
    event PlayerEnteredLottery(address _participant, uint256 _amountDeposited);

    constructor(
        address _priceFeed,
        address _vrfCoordinator,
        int8 _entranceFeeInUsd,
        uint64 _subscriptionId,
        uint256 _maxParticpantsLimit
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        s_entranceFeeInUsd = _entranceFeeInUsd;
        s_priceFeed = AggregatorV3Interface(_priceFeed);
        s_lotteryState = LotteryState.CLOSED; //* default lottery state is closed
        s_subscriptionId = _subscriptionId;
        s_maxParticpantsLimit = _maxParticpantsLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    }

    // checkOpened modifier
    modifier checkOpened() {
        if (s_lotteryState != LotteryState.OPEN)
            revert Lottery__LotteryNotOpen();
        _;
    }

    function setLotteryDuration(uint32 _durationInSecs) public onlyOwner {
        s_lotteryDuration = _durationInSecs;
    }

    function setEntranceFee(int8 _entranceFeeInUsd) public onlyOwner {
        s_entranceFeeInUsd = _entranceFeeInUsd;
    }

    function startLottery() external onlyOwner {
        require(s_lotteryState == LotteryState.CLOSED);
        s_lotteryEndTimestamp = block.timestamp + uint256(s_lotteryDuration);
        s_lotteryState = LotteryState.OPEN;
    }

    function endLottery() external onlyOwner checkOpened {
        //TODO: check if the time is right???
        require(s_participants.length > 0, "No participants");

        s_lotteryState = LotteryState.SELECTING_WINNER;
        // * requestRandomWords() function returns a uint256 value
        s_requestId = i_vrfCoordinator.requestRandomWords(
            KEY_HASH,
            s_subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
    }

    function getEntranceFee() public view returns (uint256) {
        (, int256 price, , , ) = s_priceFeed.latestRoundData(); // * returns ETH/USD rate with 8 decimal places as answer
        uint256 entranceFeeParsed = uint256(uint8(s_entranceFeeInUsd));
        // entranceFeeParsed = 50; price = 1200;
        // 1200 is the 1 eth representation in usd.
        // Divide 50 by 1200 to get how much eth is in 50 usd.

        // multiply 50 by 10^8 to match the 8 decimal places of the price.
        // Technically, 50*10^8 / uint(price) is equal to 50 / 1200.
        // And that's the amount of eth inside 50 usd. ( Cost to enter in eth = 0.04166666 )
        // Then can convert that eth amount to wei by multiplying by 10^18.

        // But due to solidity math limitations, we multiply 50 by 10^8 and 10^18 to get the correct result.
        // Otherwise trying to divide (50 * 10^8) by (1200 * 10^8) will result in 0.

        uint256 costToEnterInWei = (entranceFeeParsed * 10 ** 8 * 10 ** 18) /
            uint256(price);
        return costToEnterInWei;
    }

    function enter() public payable checkOpened {
        if (msg.value < getEntranceFee())
            revert Lottery__SendMoreToEnterLottery();

        if (s_participants.length >= s_maxParticpantsLimit)
            revert Lottery__ParticipantLimitExceeded();
        if (!s_isParticipant[msg.sender]) {
            s_participants.push(msg.sender);
        }
        s_addressToAmountDeposited[msg.sender] = msg.value; // gives the recent Amount deposited
        s_isParticipant[msg.sender] = true;
        emit PlayerEnteredLottery(msg.sender, msg.value);
    }

    function getParticipantsLen() public view returns (uint256) {
        return uint256(s_participants.length);
    }

    function setMaxParticipantsLimit(uint256 _newLimit) public onlyOwner {
        s_maxParticpantsLimit = _newLimit;
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory _randomWords
    ) internal override {
        // * this function is for the callback from the VRF node. Can be called only from the VRF node. (check docs for more info. (request response cycle))
        require(s_lotteryState == LotteryState.SELECTING_WINNER);
        require(_randomWords[0] > 0);
        require(_randomWords.length > 0);

        uint256 indexOfWinner = _randomWords[0] % s_participants.length;
        require(indexOfWinner < s_participants.length);

        s_recentWinner = payable(s_participants[indexOfWinner]); // participants array is not payable.

        // This will transfer 20 percent to the owner.
        (bool sucessOwnerCut, ) = payable(owner()).call{
            value: (address(this).balance * 20) / 100
        }("");
        if (!sucessOwnerCut) revert Lottery__TransferFailed();
        (bool success, ) = s_recentWinner.call{value: address(this).balance}(
            ""
        ); //* Calls to_recentWinner(an account contract in etheruem) from the lottery contract without specifying function bytes data.
        if (!success) revert Lottery__TransferFailed();

        for (uint256 i = 0; i < s_participants.length; i++) {
            s_isParticipant[s_participants[i]] = false;
        }

        s_participants = new address[](0);
        s_lotteryState = LotteryState.CLOSED;
        emit WinnerGotMoney(s_recentWinner, _randomWords);
    }
}
