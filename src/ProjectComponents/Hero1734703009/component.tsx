import React from 'react';
import * as ethers from 'ethers';

const contractAddress = '0x1625d8B9A57c747515566b52Fe3aE1277b98567b';
const chainId = 17000;

const abi = [
  "function createGame(bytes32 _wordHash) external payable",
  "function acceptGame(uint256 _gameId) external payable",
  "function makeGuess(uint256 _gameId, string calldata _guess) external",
  "function games(uint256) public view returns (address creator, address player, uint256 betAmount, bytes32 wordHash, string memory creatorGuess, string memory playerGuess, bool isActive, bool isFinished, address winner)"
];

const WordleBetGame: React.FC = () => {
import React from 'react';
import * as ethers from 'ethers';

const contractAddress = '0x1625d8B9A57c747515566b52Fe3aE1277b98567b';
const chainId = 17000;

const abi = [
  "function createGame(bytes32 _wordHash) external payable",
  "function acceptGame(uint256 _gameId) external payable",
  "function makeGuess(uint256 _gameId, string calldata _guess) external",
  "function games(uint256) public view returns (address creator, address player, uint256 betAmount, bytes32 wordHash, string memory creatorGuess, string memory playerGuess, bool isActive, bool isFinished, address winner)"
];

const WordleBetGame: React.FC = () => {
  const [provider, setProvider] = React.useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = React.useState<ethers.Signer | null>(null);
  const [contract, setContract] = React.useState<ethers.Contract | null>(null);
  const [gameId, setGameId] = React.useState<string>('');
  const [betAmount, setBetAmount] = React.useState<string>('');
  const [guess, setGuess] = React.useState<string>('');
  const [gameStatus, setGameStatus] = React.useState<string>('');
  const [playerGuesses, setPlayerGuesses] = React.useState<Array<{word: string, result: number[]}>>([]); // Changed to match contract struct

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        if (network.chainId !== chainId) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: ethers.utils.hexValue(chainId) }],
            });
          } catch (switchError) {
            console.error('Failed to switch to the correct network:', switchError);
            return;
          }
        }
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
        setProvider(provider);
        setSigner(signer);
        setContract(contract);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      console.error('Ethereum wallet is not detected');
    }
  };

  const executeWithRetry = async (operation: () => Promise<any>) => {
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        return await operation();
      } catch (err: any) {
        if (!err.message.toLowerCase().includes('network') || i === MAX_RETRIES - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  };

  const createGame = async () => {
    if (!contract || !signer) {
      await connectWallet();
      return;
    }
    try {
      // No need for wordHash parameter as the contract selects the word
      const estimatedGas = await executeWithRetry(() => 
        contract.estimateGas.createGame({ value: ethers.utils.parseEther(betAmount) })
      );
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => 
        contract.createGame({ value: ethers.utils.parseEther(betAmount), gasLimit: gasWithBuffer })
      );
      const receipt = await tx.wait();
      
      // Get gameId from event
      const event = receipt.events?.find(e => e.event === 'GameCreated');
      if (event) {
        setGameId(event.args.gameId.toString());
        setGameStatus(`Game created successfully! Game ID: ${event.args.gameId.toString()}`);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      setGameStatus('Failed to create game. Check console for details.');
    }
  };

  const acceptGame = async () => {
    if (!contract || !signer) {
      await connectWallet();
      return;
    }
    try {
      const game = await contract.games(gameId);
      const betAmountWei = game.betAmount;
      
      const estimatedGas = await executeWithRetry(() => 
        contract.estimateGas.acceptGame(gameId, { value: betAmountWei })
      );
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => 
        contract.acceptGame(gameId, { value: betAmountWei, gasLimit: gasWithBuffer })
      );
      await tx.wait();
      setGameStatus('Game accepted successfully!');
    } catch (error) {
      console.error('Error accepting game:', error);
      setGameStatus('Failed to accept game. Check console for details.');
    }
  };

  const submitGuess = async () => {
    if (!contract || !signer) {
      await connectWallet();
      return;
    }
    try {
      // Validate guess length
      if (guess.length !== 5) {
        setGameStatus('Guess must be exactly 5 letters!');
        return;
      }

      const estimatedGas = await executeWithRetry(() => 
        contract.estimateGas.submitGuess(gameId, guess.toLowerCase())
      );
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => 
        contract.submitGuess(gameId, guess.toLowerCase(), { gasLimit: gasWithBuffer })
      );
      await tx.wait();
      setGameStatus('Guess submitted successfully!');
      
      // Update guesses display
      await updateGameGuesses();
      setGuess('');
    } catch (error) {
      console.error('Error submitting guess:', error);
      setGameStatus('Failed to submit guess. Check console for details.');
    }
  };

  const updateGameGuesses = async () => {
    if (!contract || !signer) return;
    
    try {
      const address = await signer.getAddress();
      const guesses = await contract.getGameGuesses(gameId, address);
      setPlayerGuesses(guesses);
    } catch (error) {
      console.error('Error updating guesses:', error);
    }
  };

  const getGameStatus = async () => {
    if (!contract) {
      await connectWallet();
      return;
    }
    try {
      const game = await contract.games(gameId);
      const status = `
        Creator: ${game.creator}
        Challenger: ${game.challenger || 'Not joined yet'}
        Bet Amount: ${ethers.utils.formatEther(game.betAmount)} ETH
        Creator Attempts: ${game.creatorAttempts.toString()}
        Challenger Attempts: ${game.challengerAttempts.toString()}
        Active: ${game.isActive}
        Completed: ${game.isCompleted}
        Winner: ${game.winner || 'No winner yet'}
      `;
      setGameStatus(status);
      await updateGameGuesses();
    } catch (error) {
      console.error('Error getting game status:', error);
      setGameStatus('Failed to get game status. Check console for details.');
    }
  };

  // Render color squares for guess results
  const renderGuessResult = (result: number[]) => {
    return (
      <div className="flex gap-1">
        {result.map((r, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded ${
              r === 2 ? 'bg-green-500' : r === 1 ? 'bg-yellow-500' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen p-5">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-5">
        <h1 className="text-3xl font-bold mb-5">WordleBet Game</h1>
        
        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">Create Game</h2>
          <input
            type="text"
            placeholder="Bet Amount (ETH)"
            className="w-full p-2 mb-2 border rounded"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
          />
          <button onClick={createGame} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Create Game
          </button>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">Accept Game</h2>
          <input
            type="text"
            placeholder="Game ID"
            className="w-full p-2 mb-2 border rounded"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <button onClick={acceptGame} className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">
            Accept Game
          </button>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">Make Guess</h2>
          <input
            type="text"
            placeholder="Game ID"
            className="w-full p-2 mb-2 border rounded"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter 5-letter guess"
            className="w-full p-2 mb-2 border rounded"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            maxLength={5}
          />
          <button onClick={submitGuess} className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">
            Submit Guess
          </button>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">Get Game Status</h2>
          <input
            type="text"
            placeholder="Game ID"
            className="w-full p-2 mb-2 border rounded"
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <button onClick={getGameStatus} className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600">
            Get Status
          </button>
        </div>

        <div className="mt-5 p-3 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Game Status:</h2>
          <pre className="whitespace-pre-wrap">{gameStatus}</pre>
        </div>

        <div className="mt-5 p-3 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Your Guesses:</h2>
          {playerGuesses.map((guessObj, index) => (
            <div key={index} className="flex items-center justify-between mb-2 p-2 bg-white rounded">
              <span className="font-mono">{guessObj.word}</span>
              {renderGuessResult(guessObj.result)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { Footer as WordleBetGame };