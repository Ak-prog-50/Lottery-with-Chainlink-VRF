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
error Lottery__ParticipantCountIsLow();

// error Lottery__NotTheOwner();

contract Lottery is VRFConsumerBaseV2, Ownable {
    enum LotteryState {
        OPEN,
        CLOSED,
        SELECTING_WINNER
    }

    int256 public s_entranceFeeInUsd; // with 8 decimal points. 0.5 USD = 50000000
    // TODO: check if we need to make this immutable
    VRFCoordinatorV2Interface immutable public i_vrfCoordinator;

    mapping(address => uint256) public s_addressToAmountDeposited;
    mapping(address => bool) public s_isParticipant;
    address[] public s_participants;
    address payable public s_recentWinner;
    uint256 public s_requestId;
    uint256 public s_minParticpantsLimit;
    uint256 public s_lotteryEndTimestamp;
    uint32 public s_lotteryDuration = 24 hours; // returns 86400 seconds
    uint64 public s_subscriptionId;
    LotteryState public s_lotteryState;
    AggregatorV3Interface public s_priceFeed;

    bytes32 s_keyHash =
        0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f; //* gas lane key hash (check docs for more info). This is 500 gwei key hash in mumbai testnet.
    uint32 s_callbackGasLimit = 100000; //* gas limit when VRF callback rawFulfillRandomWords func in VRFConsumerBaseV2.
    uint16 s_requestConfirmations = 3; //* number of confirmations VRF node waits for before fulfilling request
    uint32 constant NUM_WORDS = 1; //* number of words(uint256 values) in the random word request

    event WinnerGotMoney(address _recentWinner, uint256[] _randomWords);
    event PlayerEnteredLottery(address _participant, uint256 _amountDeposited);

    constructor(
        uint256 _minParticpantsLimit,
        address _priceFeed,
        address _vrfCoordinator,
        int256 _entranceFeeInUsdinFixedPoint,
        uint64 _subscriptionId
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        s_entranceFeeInUsd = _entranceFeeInUsdinFixedPoint;
        s_priceFeed = AggregatorV3Interface(_priceFeed);
        s_lotteryState = LotteryState.CLOSED; //* default lottery state is closed
        s_subscriptionId = _subscriptionId;
        s_minParticpantsLimit = _minParticpantsLimit;
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
    }

    // checkOpened modifier
    modifier checkOpened() {
        if (s_lotteryState != LotteryState.OPEN)
            revert Lottery__LotteryNotOpen();
        _;
    }

    function getPriceFeedName() external view returns (string memory) {
        return s_priceFeed.description();
    }

    function getLatestRoundData() external view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        return s_priceFeed.latestRoundData();
    }

    function setKeyHash(bytes32 _keyHash) public onlyOwner {
        s_keyHash = _keyHash;
    }

    function setSubscriptionId(uint64 _subscriptionId) public onlyOwner {
        s_subscriptionId = _subscriptionId;
    }

    function setCallbakGasLimit(uint32 _callbackGasLimit) public onlyOwner {
        s_callbackGasLimit = _callbackGasLimit;
    }

    function setRequestConfirmations(uint16 _requestConfirmations) public onlyOwner {
        s_requestConfirmations = _requestConfirmations;
    }

    function setLotteryDuration(uint32 _durationInSecs) public onlyOwner {
        s_lotteryDuration = _durationInSecs;
    }

    // @notice - entranceFeeInUsd should be in fixed point format with 8 digits of precision.    
    function setEntranceFee(int256 _entranceFeeInUsdinFixedPoint) public onlyOwner {
        s_entranceFeeInUsd = _entranceFeeInUsdinFixedPoint;
    }

    function startLottery() external onlyOwner {
        require(s_lotteryState == LotteryState.CLOSED);
        s_lotteryEndTimestamp = block.timestamp + uint256(s_lotteryDuration);
        s_lotteryState = LotteryState.OPEN;
    }

    function endLottery() external onlyOwner {
        //TODO: check if the time stamp is right???
        if (s_participants.length < s_minParticpantsLimit)
            revert Lottery__ParticipantCountIsLow();

        s_lotteryState = LotteryState.SELECTING_WINNER;
        // * requestRandomWords() function returns a uint256 value
        s_requestId = i_vrfCoordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            s_requestConfirmations,
            s_callbackGasLimit,
            NUM_WORDS
        );
    }

    function getEntranceFee() public view returns (uint256) {
        (, int256 price, , , ) = s_priceFeed.latestRoundData(); // * returns Matic/USD rate with 8 decimal places as answer
        uint256 entranceFeeParsed = uint256(s_entranceFeeInUsd);
        // entranceFeeParsed = 11 USD; price = 0.8 USD; ( Matic / USD )
        // 0.8 USD is the 1 matic representation in usd.
        // Divide 11 by 0.8 USD to get how much matic is in 11 usd.

        // entrance fee and price is represented in fixed point format with 8 digits of precision.
        // Technically, 11*10^8 / uint(price) is equal to 11 / 0.8 USD.
        // And that's the amount of matic inside 11 usd. ( costToEnterInMatic )
        // Then can convert that matic amount to wei by multiplying by 10^18.

        // But due to solidity math limitations, we multiply entranceFeeWith8Decimals by 10^18 to get the correct result.
        // Otherwise trying to divide (11 * 10^8) by (0.8 USD * 10^8) will result in 0.

        uint256 costToEnterInWei = (entranceFeeParsed * 10 ** 18) /
            uint256(price);
        return costToEnterInWei;
    }

    function enter() public payable checkOpened {
        if (msg.value < getEntranceFee())
            revert Lottery__SendMoreToEnterLottery();

        // TODO: safeguard for double deposits???
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

    function setMinParticipantsLimit(uint256 _newLimit) public onlyOwner {
        s_minParticpantsLimit = _newLimit;
    }

    function fulfillRandomWords(
        uint256,
        uint256[] memory _randomWords
    ) internal override {
        // * this function is for the callback from the VRF node. Can be called only from the VRF node. (check docs for more info. (request response cycle))
        // TODO: error messages for require statements or convert to revert statements???.
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
        ); //* Calls to_recentWinner( an EOA contract in polygon ) from the lottery contract without specifying function bytes data.
        if (!success) revert Lottery__TransferFailed();

        for (uint256 i = 0; i < s_participants.length; i++) {
            s_isParticipant[s_participants[i]] = false;
        }

        s_participants = new address[](0);
        s_lotteryState = LotteryState.CLOSED;
        emit WinnerGotMoney(s_recentWinner, _randomWords);
    }

    // TODO: check if we need disperse funds function???
}
