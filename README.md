<div id="top"></div>

<!-- From https://github.com/othneildrew/Best-README-Template -->

[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
<!--   <a href="#">
    <img src="https://github.com/othneildrew/Best-README-Template/blob/master/images/logo.png?raw=true" alt="Logo" width="80" height="80">
  </a> -->
  :diamond_shape_with_a_dot_inside: :diamond_shape_with_a_dot_inside: :diamond_shape_with_a_dot_inside:

  <h3 align="center">The Lottery Smart Contract</h3>
  <p align="center">
    Lottery that can select a verifiably random winner...
    <br />
    <a href="https://rinkeby.etherscan.io/address/0x03c2f2816c97a7a5d08d05ec87bce65310dc5d58#readContract"><strong>View on Etherscan »</strong></a>
    <br />
    <br />
    <a href="#about-the-project">About</a>
    ·&nbsp;
    <a href="#local-development">Local Development</a>
    ·&nbsp;
    <a href="#usage">Usage</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#local-development">Local Development</a>
      <ul>
        <li><a href="#local-development">Open in Gitpod</a></li>
        <li><a href="#setup">Setup</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#things-to-do">Things to do</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

</br>
<p align="center">
  <img src="https://img.freepik.com/free-vector/lottery-tickets-balls-flying-golden-coins-gambling-business-advertising_1262-13075.jpg?w=740&t=st=1654263292~exp=1654263892~hmac=4d67d752766966e77d7a29da390d04676c43ef10da4c23becac744499f70926f" alt="project_imgage" width="350" height="370" style="object-fit:contain;">
  </br>
 <sub><a href="https://www.freepik.com/vectors/bingo-game">Bingo game vector created by katemangostar - www.freepik.com</a></sub>
</p>
</br>


This Lottery Smart Contract is scheduled to start automatically every 24 hrs ( *if the conditions are met ). This is done by using openzeppelin's [defender autotasks](https://docs.openzeppelin.com/defender/autotasks). After being started players can enter the Lottery. They have to enter a minimum threshold of 50 USD. The price of 50 USD in ETH is calculated in real-time by using [chainlink data feed oracles](https://docs.chain.link/docs/using-chainlink-reference-contracts/).

When a player enters the lottery an event is emitted from the smart contract. I have set up a [defender sentinel](https://docs.openzeppelin.com/defender/sentinel) to listen for this event. The maximum limit of players is 3. ( I have set this to 3, So it's easy to test with fewer accounts ). The sentinel (event listener) triggers the `endLottery` task when the max limit of players is reached.

To end the lottery a random winner has to be selected. But getting a truly random number is not a task for a deterministic system like blockchain. So 
the random number is fetched using [chainlink VRF](https://docs.chain.link/docs/chainlink-vrf/#overview) (Verifiable Random Function). 

<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

* [Hardhat](https://hardhat.org/)
* [Typescript](https://www.typescriptlang.org/)
* [Solidity](https://docs.soliditylang.org/en/v0.8.14/)
* [Ethers.js](https://docs.ethers.io/v5/)
* [Waffle](https://ethereum-waffle.readthedocs.io/en/latest/index.html)
* [OpenZeppelin](https://docs.openzeppelin.com/)
* [Chainlink](https://docs.chain.link/)

<p align="right">(<a href="#top">back to top</a>)</p>




<!-- LOCAL DEVELOPMENT -->
## Local Development

This repo includes deploy scripts, unit tests and staging tests and scripts for executing transactions. You can test locally or in Gitpod. 
</br></br>
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Ak-prog-50/Lottery-with-Chainlink-and-Openzeppelin-Defender)

### Setup

1. env variables
    * [Etherscan API key](https://docs.etherscan.io/) : for verifying of contracts
    * [CoinMarketCap API key](https://coinmarketcap.com/api/documentation/v1/#section/Quick-Start-Guide) : for gas estimation in USD
    * [VRF v2 Subscription Id](https://vrf.chain.link/) : for using chainlink VRF
    * [Truffle dashboard](https://trufflesuite.com/docs/truffle/getting-started/using-the-truffle-dashboard/) : for using metamask instaed of private keys

2. Run Unit Tests
    * Spin up a local blockchain `npx hardhat node`
    * Run tests in local network `npx hardhat test --network localhost`
    * See code coverage `npx hardhat coverage`
   
3. Run Staging Tests
    * Open truffle dashboard `truffle dashboard`
    * Deploy to a live network `npx hardhat deploy --network truffle` </br>
    <i> configured to use Rinkeby network addresses by default (for vrf & price feed addresses ) </i>
    * Run staging test. `npx hardhat test --network truffle`

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

1. Go to [Etherscan](https://rinkeby.etherscan.io/address/0x03c2f2816c97a7a5d08d05ec87bce65310dc5d58#readContract).
2. Check the lottery state ( s_lotteryState : "0" means open, "1" means closed, "2" means selectingWinner)
3. If the lottery is open you can enter. Otherwise has to wait for 24 hrs. Lottery automatically starts every 24 hrs if the lottery is closed.
4. Check the Entrance Fee ( getEntranceFee )
5. Entrance fee is in wei. Convert it to ether.
6. Enter by sending entrance fee. ( enter function )
7. Check the number of participants  ( getParticipantsLen )
8. When the number of participants hit the max limit ( s_maxParticipantsLimit ) the lottery will automatically end and select a winner.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ROADMAP -->
## Things to do

- [x] Automate Lottery using Openzeppelin defender
- [ ] Use chainlink keepers to automate the lottery in a decentralized manner


<p align="right">(<a href="#top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: #
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/akalanka-pathirage/
