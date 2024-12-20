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
  const [wordHash, setWordHash] = React.useState<string>('');
  const [betAmount, setBetAmount] = React.useState<string>('');
  const [guess, setGuess] = React.useState<string>('');
  const [gameStatus, setGameStatus] = React.useState<string>('');
  const [playerGuesses, setPlayerGuesses] = React.useState<Array<{guess: string, correctness: string}>>([]);

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
      const estimatedGas = await executeWithRetry(() => contract.estimateGas.createGame(wordHash, { value: ethers.utils.parseEther(betAmount) }));
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => contract.createGame(wordHash, { value: ethers.utils.parseEther(betAmount), gasLimit: gasWithBuffer }));
      await tx.wait();
      setGameStatus('Game created successfully!');
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
      const estimatedGas = await executeWithRetry(() => contract.estimateGas.acceptGame(gameId, { value: ethers.utils.parseEther(betAmount) }));
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => contract.acceptGame(gameId, { value: ethers.utils.parseEther(betAmount), gasLimit: gasWithBuffer }));
      await tx.wait();
      setGameStatus('Game accepted successfully!');
    } catch (error) {
      console.error('Error accepting game:', error);
      setGameStatus('Failed to accept game. Check console for details.');
    }
  };

  const makeGuess = async () => {
    if (!contract || !signer) {
      await connectWallet();
      return;
    }
    try {
      const estimatedGas = await executeWithRetry(() => contract.estimateGas.makeGuess(gameId, guess));
      const gasWithBuffer = estimatedGas.mul(120).div(100);
      const tx = await executeWithRetry(() => contract.makeGuess(gameId, guess, { gasLimit: gasWithBuffer }));
      await tx.wait();
      setGameStatus('Guess submitted successfully!');
      
      // Update player guesses
      const updatedGuesses = [...playerGuesses, { guess, correctness: 'Pending' }];
      setPlayerGuesses(updatedGuesses);
      setGuess('');
    } catch (error) {
      console.error('Error making guess:', error);
      setGameStatus('Failed to submit guess. Check console for details.');
    }
  };

  const getGameStatus = async () => {
    if (!contract) {
      await connectWallet();
      return;
    try {
      const game = await contract.games(gameId);
      setGameStatus(`Creator: ${game.creator}, Player: ${game.player}, Bet Amount: ${ethers.utils.formatEther(game.betAmount)} ETH, Is Active: ${game.isActive}, Is Finished: ${game.isFinished}, Winner: ${game.winner}`);
      
      // Update player guesses with correctness
      const updatedGuesses = playerGuesses.map((guessObj, index) => ({
        ...guessObj,
        correctness: index === 0 ? game.creatorGuess : game.playerGuess
      }));
      setPlayerGuesses(updatedGuesses);
    } catch (error) {
      console.error('Error getting game status:', error);
      setGameStatus('Failed to get game status. Check console for details.');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen p-5">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-5">
        <h1 className="text-3xl font-bold mb-5">WordleBet Game</h1>
        
        <div className="mb-5">
          <h2 className="text-xl font-semibold mb-2">Create Game</h2>
          <input
            type="text"
            placeholder="Word Hash"
            className="w-full p-2 mb-2 border rounded"
            value={wordHash}
            onChange={(e) => setWordHash(e.target.value)}
          />
          <input
            type="text"
            placeholder="Bet Amount (ETH)"
            className="w-full p-2 mb-2 border rounded"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
          />
          <button onClick={createGame} className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Create Game</button>
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
          <input
            type="text"
            placeholder="Bet Amount (ETH)"
            className="w-full p-2 mb-2 border rounded"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
          />
          <button onClick={acceptGame} className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600">Accept Game</button>
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
            placeholder="Guess"
            className="w-full p-2 mb-2 border rounded"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
          />
          <button onClick={makeGuess} className="w-full bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600">Submit Guess</button>
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
          <button onClick={getGameStatus} className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600">Get Status</button>
        </div>
        <div className="mt-5 p-3 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Game Status:</h2>
          <p>{gameStatus}</p>
        </div>

        <div className="mt-5 p-3 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Player Guesses:</h2>
          {playerGuesses.map((guessObj, index) => (
            <div key={index} className="flex items-center mb-2">
              <i className={`bx ${guessObj.correctness === 'Correct' ? 'bx-check text-green-500' : 'bx-x text-red-500'} mr-2`}></i>
              <span>{guessObj.guess}</span>
              <span className="ml-2 text-sm text-gray-500">({guessObj.correctness})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
};

export { WordleBetGame as component };
