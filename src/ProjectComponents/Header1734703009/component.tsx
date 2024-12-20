import React from 'react';
import { ethers } from 'ethers';

const Header: React.FC = () => {
  const [contractAddress, setContractAddress] = React.useState<string>('');

  const deployContract = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const contractFactory = new ethers.ContractFactory(
        [
          "event WordSelected(string word)",
          "function selectWord() public",
          "function getWord() public view returns (string memory)"
        ],
        `
        pragma solidity ^0.8.0;

        contract WordleContract {
            string private word;
            string[] private wordList = ["APPLE", "HOUSE", "PLANT", "SMILE", "BEACH"];

            event WordSelected(string word);

            function selectWord() public {
                uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % wordList.length;
                word = wordList[randomIndex];
                emit WordSelected(word);
            }

            function getWord() public view returns (string memory) {
                return word;
            }
        }
        `,
        signer
      );

      const contract = await contractFactory.deploy();
      await contract.deployed();

      setContractAddress(contract.address);
      console.log("Contract deployed to:", contract.address);
    } catch (error) {
      console.error("Error deploying contract:", error);
    }
  };

  return (
    <header className="bg-blue-500 text-white p-4 w-full h-full">
      <div className="container mx-auto flex justify-between items-center h-full">
        <div className="text-2xl font-bold">WordlePlus</div>
        <div className="flex items-center">
          <button
            onClick={deployContract}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center"
          >
            <i className='bx bx-cube-alt mr-2'></i>
            Deploy Contract
          </button>
          {contractAddress && (
            <div className="ml-4 text-sm">
              Contract Address: {contractAddress}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { Header as component };