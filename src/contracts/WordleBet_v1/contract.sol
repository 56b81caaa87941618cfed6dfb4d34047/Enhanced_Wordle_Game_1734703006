
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WordleBet_v1 is ReentrancyGuard, Ownable {
    struct Game {
        address creator;
        address player;
        uint256 betAmount;
        bytes32 wordHash;
        string creatorGuess;
        string playerGuess;
        bool isActive;
        bool isFinished;
        address winner;
    }

    uint256 public gameIdCounter;
    mapping(uint256 => Game) public games;
    uint256 public constant MINIMUM_BET = 0.01 ether;
    address public immutable feeCollector;
    uint256 public feePercentage = 5; // 5% fee

    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 betAmount);
    event GameAccepted(uint256 indexed gameId, address indexed player);
    event GuessMade(uint256 indexed gameId, address indexed guesser, string guess);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 prize);
    event WithdrawalMade(address indexed player, uint256 amount);
    event FeesCollected(uint256 amount);

    constructor() Ownable() {
        feeCollector = 0x25a5674f3D6Afb27e20820063B4fE2786bcB2e6D;
    }

    function createGame(bytes32 _wordHash) external payable {
        require(msg.value >= MINIMUM_BET, "Bet amount too low");

        uint256 gameId = gameIdCounter;
        games[gameId] = Game({
            creator: msg.sender,
            player: address(0),
            betAmount: msg.value,
            wordHash: _wordHash,
            creatorGuess: "",
            playerGuess: "",
            isActive: true,
            isFinished: false,
            winner: address(0)
        });

        gameIdCounter++;
        emit GameCreated(gameId, msg.sender, msg.value);
    }

    function acceptGame(uint256 _gameId) external payable {
        Game storage game = games[_gameId];
        require(game.isActive && !game.isFinished, "Game is not available");
        require(game.player == address(0), "Game already accepted");
        require(msg.value == game.betAmount, "Bet amount must match");

        game.player = msg.sender;
        emit GameAccepted(_gameId, msg.sender);
    }

    function makeGuess(uint256 _gameId, string calldata _guess) external {
        Game storage game = games[_gameId];
        require(game.isActive && !game.isFinished, "Game is not active");
        require(msg.sender == game.creator || msg.sender == game.player, "Not a participant");

        if (msg.sender == game.creator) {
            require(bytes(game.creatorGuess).length == 0, "Creator already guessed");
            game.creatorGuess = _guess;
        } else {
            require(bytes(game.playerGuess).length == 0, "Player already guessed");
            game.playerGuess = _guess;
        }

        emit GuessMade(_gameId, msg.sender, _guess);

        if (bytes(game.creatorGuess).length > 0 && bytes(game.playerGuess).length > 0) {
            _finishGame(_gameId);
        }
    }

    function _finishGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        game.isActive = false;
        game.isFinished = true;

        bytes32 creatorGuessHash = keccak256(abi.encodePacked(game.creatorGuess));
        bytes32 playerGuessHash = keccak256(abi.encodePacked(game.playerGuess));

        uint256 totalPrize = game.betAmount * 2;
        uint256 fee = (totalPrize * feePercentage) / 100;
        uint256 prizeAfterFee = totalPrize - fee;

        if (creatorGuessHash == game.wordHash && playerGuessHash != game.wordHash) {
            game.winner = game.creator;
        } else if (playerGuessHash == game.wordHash && creatorGuessHash != game.wordHash) {
            game.winner = game.player;
        } else if (creatorGuessHash == game.wordHash && playerGuessHash == game.wordHash) {
            // In case of a tie, split the pot
            uint256 splitPrize = prizeAfterFee / 2;
            payable(game.creator).transfer(splitPrize);
            payable(game.player).transfer(splitPrize);
            payable(feeCollector).transfer(fee);
            emit GameFinished(_gameId, address(0), splitPrize);
            emit FeesCollected(fee);
            return;
        } else {
            // If both guesses are wrong, the contract keeps the funds
            game.winner = address(this);
            payable(feeCollector).transfer(fee);
            emit FeesCollected(fee);
            return;
        }

        payable(game.winner).transfer(prizeAfterFee);
        payable(feeCollector).transfer(fee);
        emit GameFinished(_gameId, game.winner, prizeAfterFee);
        emit FeesCollected(fee);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner()).transfer(balance);
        emit WithdrawalMade(owner(), balance);
    }

    function setFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 10, "Fee percentage too high");
        feePercentage = _newFeePercentage;
    }

    receive() external payable {}
}
