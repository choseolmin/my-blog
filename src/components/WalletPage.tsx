import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Web3Account } from 'web3-eth-accounts';

const NETWORKS = {
  KAIA: {
    name: 'KAIA',
    rpcUrl: 'https://public-en-kairos.node.kaia.io',
    explorerUrl: 'https://kairos.kaiascan.io/tx/',
    symbol: 'KAIA'
  }
};

const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Web3Account | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<Uint8Array | string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS.KAIA);
  const [web3, setWeb3] = useState(new Web3(NETWORKS.KAIA.rpcUrl));
  const [showWalletOptions, setShowWalletOptions] = useState<boolean>(true);

  // 컴포넌트 마운트 시 자동으로 지갑 가져오기
  useEffect(() => {
    const importInitialWallet = async () => {
      try {
        const privateKey = '0x4c3f92e8746e766529c19535f4c6edfb3052e18d59133fda5eda2cd97de600b1';
        const importedWallet = web3.eth.accounts.privateKeyToAccount(privateKey);
        setWallet(importedWallet);
        // 잔액 자동 조회
        const balanceWei = await web3.eth.getBalance(importedWallet.address);
        setBalance(web3.utils.fromWei(balanceWei, 'ether'));
      } catch (error) {
        console.error('초기 지갑 가져오기 실패:', error);
      }
    };

    importInitialWallet();
  }, [web3]);

  const changeNetwork = (network: typeof NETWORKS.KAIA) => {
    setSelectedNetwork(network);
    setWeb3(new Web3(network.rpcUrl));
    setBalance(null);
    setTxHash(null);
  };

  const createWallet = () => {
    try {
      if (!newAddress || !newPrivateKey) {
        alert('주소와 프라이빗 키를 모두 입력해주세요.');
        return;
      }

      const account = web3.eth.accounts.privateKeyToAccount(newPrivateKey);
      
      if (account.address.toLowerCase() !== newAddress.toLowerCase()) {
        alert('입력한 주소와 프라이빗 키가 일치하지 않습니다.');
        return;
      }

      setWallet(account);
      setBalance(null);
      setTxHash(null);
      setIsCreating(false);
      setNewAddress('');
      setNewPrivateKey('');
      setShowWalletOptions(false);
      getBalance(account.address);
    } catch (error) {
      console.error('지갑 생성 실패:', error);
      alert('유효하지 않은 주소 또는 프라이빗 키입니다.');
    }
  };

  const importWallet = () => {
    try {
      const importedWallet = web3.eth.accounts.privateKeyToAccount(privateKey);
      setWallet(importedWallet);
      setBalance(null);
      setTxHash(null);
      setPrivateKey('');
      setIsImporting(false);
      setShowWalletOptions(false);
      getBalance(importedWallet.address);
    } catch (error) {
      console.error('지갑 가져오기 실패:', error);
      alert('유효하지 않은 프라이빗 키입니다.');
    }
  };

  const getBalance = async (address: string) => {
    try {
      const balanceWei = await web3.eth.getBalance(address);
      setBalance(web3.utils.fromWei(balanceWei, 'ether'));
    } catch (error) {
      console.error('잔액 조회 실패:', error);
    }
  };

  const sendTransaction = async () => {
    if (!wallet || !recipient || !amount) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const value = web3.utils.toWei(amount, 'ether');
      const gasPrice = await web3.eth.getGasPrice();
      const tx = {
        from: wallet.address,
        to: recipient,
        value,
        gas: 21000,
        gasPrice,
      };

      const signedTx = await web3.eth.accounts.signTransaction(
        tx,
        wallet.privateKey
      );
      const receipt = await web3.eth.sendSignedTransaction(
        signedTx.rawTransaction
      );

      setTxHash(receipt.transactionHash);
      getBalance(wallet.address);
    } catch (error) {
      console.error('트랜잭션 실패:', error);
      alert('트랜잭션 전송에 실패했습니다.');
    }
  };

  const copyPrivateKey = async () => {
    if (wallet) {
      try {
        await navigator.clipboard.writeText(wallet.privateKey);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      }
    }
  };

  return (
    <div className="blog-container">
      <h2>🦊 블록체인 지갑</h2>

      {showWalletOptions ? (
        <div className="wallet-actions">
          <button onClick={() => setIsCreating(true)} className="wallet-button">
            새 지갑 생성
          </button>
          <button onClick={() => setIsImporting(true)} className="wallet-button">
            기존 지갑 가져오기
          </button>
        </div>
      ) : null}

      {isCreating ? (
        <div className="create-wallet">
          <input
            type="text"
            placeholder="지갑 주소를 입력하세요"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />
          <input
            type="password"
            placeholder="프라이빗 키를 입력하세요"
            value={newPrivateKey}
            onChange={(e) => setNewPrivateKey(e.target.value)}
          />
          <div className="import-buttons">
            <button onClick={createWallet}>생성</button>
            <button onClick={() => setIsCreating(false)}>취소</button>
          </div>
        </div>
      ) : isImporting ? (
        <div className="import-wallet">
          <input
            type="password"
            placeholder="프라이빗 키를 입력하세요"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
          />
          <div className="import-buttons">
            <button onClick={importWallet}>가져오기</button>
            <button onClick={() => setIsImporting(false)}>취소</button>
          </div>
        </div>
      ) : wallet && !showWalletOptions ? (
        <div>
          <div className="wallet-info">
            <p className="address-private-section">
              <strong>주소:</strong> {wallet.address}
            </p>
            <div className="private-key-section address-private-section">
              <strong>프라이빗 키:</strong>
              <button onClick={copyPrivateKey} className="copy-btn">
                복사
              </button>
              {copySuccess && <span className="copy-success">✔ 복사됨!</span>}
            </div>
          </div>

          <button onClick={() => getBalance(wallet.address)}>잔액 조회</button>
          {balance !== null && (
            <p>
              <strong>잔액:</strong> {balance} {selectedNetwork.symbol}
            </p>
          )}

          <h3>💸 송금</h3>
          <div className="send-transaction">
            <input
              type="text"
              placeholder="받는 주소"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="text"
              placeholder={`보낼 금액 (${selectedNetwork.symbol})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button onClick={sendTransaction}>송금</button>

          {txHash && (
            <p>
              ✅ <strong>트랜잭션 해시:</strong>{' '}
              <a
                href={`${selectedNetwork.explorerUrl}${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash}
              </a>
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default WalletPage; 