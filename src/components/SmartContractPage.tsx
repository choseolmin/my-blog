import React, { useState, useEffect } from 'react';
import detectEthereumProvider from '@metamask/detect-provider';
import Web3 from 'web3';
import './SmartContractPage.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SmartContractPage: React.FC = () => {
  const [account, setAccount] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedAddress, setDeployedAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const contractName = "HelloWorld";
  const contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HelloWorld {
    string public message = "Hello, Sepolia!";
    
    function setMessage(string memory newMessage) public {
        message = newMessage;
    }
}`;

  const abi: any[] = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "message",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "string", "name": "newMessage", "type": "string" }],
      "name": "setMessage",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  const bytecode = "0x608060405234801561001057600080fd5b506040516101003803806101008339818101604052602081101561003357600080fd5b505160005560c6806100446000396000f3fe608060405260043610601c5760003560e01c806306fdde03146021578063c47f0027146039575b600080fd5b60276049565b604051808260ff1660ff16815260200191505060405180910390f35b60556004803603810190603f91906069565b605b565b005b60005481565b8060008190555050565b60008135905060718160a3565b92915050565b600060208284031215608a57600080fd5b60006094848285016064565b9150509291505056fea2646970667358221220e0b6d986d312bcb00d54b0b4ec038f9ebc47c289858fa64eb3b8966c3bbd76fe64736f6c63430008140033";

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    const provider = await detectEthereumProvider();
    if (provider && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }
  };

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError('');
      const provider = await detectEthereumProvider();
      if (!provider) {
        setError('MetaMask를 설치해주세요!');
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setSuccess('MetaMask 연결 성공!');
    } catch (err: any) {
      setError('연결 오류: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setSuccess('');
    setError('');
  };

  const handleDeploy = async () => {
    if (!account) {
      setError('지갑을 먼저 연결해주세요.');
      return;
    }

    setIsDeploying(true);
    setError('');
    setSuccess('');

    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(abi);
      const deployTx = contract.deploy({ data: bytecode });

      const gas = await deployTx.estimateGas();
      const deployed = await deployTx.send({
        from: account,
        gas: Math.floor(gas * 1.2)
      });

      setDeployedAddress(deployed.options.address);
      setSuccess('컨트랙트가 성공적으로 배포되었습니다!');
    } catch (err: any) {
      setError('배포 실패: ' + (err.message || err.toString()));
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="smart-contract-container">
      <h2>🧱 스마트 컨트랙트 배포 (Sepolia)</h2>

      <div className="wallet-section">
        <h3>지갑 연결</h3>
        {!account ? (
          <button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? '연결 중...' : 'MetaMask 연결'}
          </button>
        ) : (
          <div>
            <p><strong>✅ 연결된 계정:</strong> {account}</p>
            <button onClick={disconnectWallet}>연결 해제</button>
          </div>
        )}
      </div>

      <div className="contract-form">
        <h3>📜 배포될 스마트 컨트랙트 코드</h3>
        <pre style={{
          backgroundColor: "#f4f4f4",
          padding: "16px",
          borderRadius: "8px",
          whiteSpace: "pre-wrap",
          border: "1px solid #ccc"
        }}>
          {contractCode}
        </pre>

        <button onClick={handleDeploy} disabled={isDeploying || !account} style={{ marginTop: "20px" }}>
          {isDeploying ? '배포 중...' : '컨트랙트 배포'}
        </button>
      </div>

      {deployedAddress && (
        <div className="deployed-address">
          <h4>📦 배포 주소</h4>
          <p>{deployedAddress}</p>
        </div>
      )}

      {error && <p className="error-message">❌ {error}</p>}
      {success && <p className="success-message">✅ {success}</p>}
    </div>
  );
};

export default SmartContractPage;
