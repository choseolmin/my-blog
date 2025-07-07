import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer';
import { HDNode } from '@ethersproject/hdnode';
import { ethers } from 'ethers';



// Buffer를 전역 객체에 추가
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}
window.Buffer = Buffer;

const NETWORKS = {
  KAIA: {
    name: 'KAIA',
    rpcUrl: 'https://public-en-kairos.node.kaia.io',
    explorerUrl: 'https://kairos.kaiascan.io/tx/',
    symbol: 'KAIA'
  }
};

const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<Uint8Array | string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [copyAddressSuccess, setCopyAddressSuccess] = useState<boolean>(false);
  const [privateKey, setPrivateKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newPrivateKey, setNewPrivateKey] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS.KAIA);
  const [web3, setWeb3] = useState<Web3>(new Web3(NETWORKS.KAIA.rpcUrl));
  const [showWalletOptions, setShowWalletOptions] = useState<boolean>(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonic, setMnemonic] = useState<string>('');
  const [previewAddress, setPreviewAddress] = useState<string | null>(null);

  // 컴포넌트 마운트 시 자동으로 지갑 가져오기
  useEffect(() => {
    // 초기 지갑 가져오기 로직 제거
    setShowWalletOptions(true);
  }, [web3]);

  const changeNetwork = (network: typeof NETWORKS.KAIA) => {
    setSelectedNetwork(network);
    setWeb3(new Web3(network.rpcUrl));
    setBalance(null);
    setTxHash(null);
  };

  const createWallet = async () => {
    try {
      // 니모닉 생성
      const mnemonic = bip39.generateMnemonic();
      
      // 니모닉으로부터 지갑 생성
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      
      // 상태 업데이트
      setMnemonic(mnemonic);
      setWallet({
        address: wallet.address,
        privateKey: wallet.privateKey
      });
      setBalance(null);
      setTxHash(null);
      setIsCreating(false);
      setShowWalletOptions(false);

      // 잔액 조회
      try {
        await getBalance(wallet.address);
      } catch (error) {
        console.error('잔액 조회 실패:', error);
      }
    } catch (error) {
      console.error('지갑 생성 실패:', error);
      alert('지갑 생성에 실패했습니다. 다시 시도해주세요.');
      setIsCreating(false);
    }
  };

  const importWallet = async () => {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        alert('유효하지 않은 니모닉입니다.');
        return;
      }

      // 니모닉으로부터 지갑 생성
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      
      setWallet({
        address: wallet.address,
        privateKey: wallet.privateKey
      } );
      setBalance(null);
      setTxHash(null);
      setMnemonic('');
      setIsImporting(false);
      setShowWalletOptions(false);
      getBalance(wallet.address);
    } catch (error) {
      console.error('지갑 가져오기 실패:', error);
      alert('지갑 가져오기에 실패했습니다.');
    }
  };

  const getBalance = async (address: string) => {
    try {
      const balanceWei = await web3.eth.getBalance(address);
      setBalance(web3.utils.fromWei(balanceWei, 'ether'));
    } catch (error) {
      console.error('잔액 조회 실패:', error);
      setBalance('0'); // 에러 발생 시 잔액을 0으로 설정
    }
  };

// 트랜잭션 전송 함수
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

    const signedTx = await web3.eth.accounts.signTransaction(tx, wallet.privateKey);

    // ✅ 수정된 부분: undefined 방지
    if (!signedTx.rawTransaction) {
      throw new Error('서명된 트랜잭션이 생성되지 않았습니다.');
    }

    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
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

  const copyMnemonic = async () => {
    if (mnemonic) {
      try {
        await navigator.clipboard.writeText(mnemonic);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      }
    }
  };

  const copyAddress = async () => {
    if (wallet) {
      try {
        await navigator.clipboard.writeText(wallet.address);
        setCopyAddressSuccess(true);
        setTimeout(() => setCopyAddressSuccess(false), 2000);
      } catch (err) {
        console.error('복사 실패:', err);
      }
    }
  };

  const previewWallet = async (mnemonic: string) => {
    try {
      if (!mnemonic.trim()) {
        setPreviewAddress(null);
        return;
      }

      // 니모닉 유효성 검사
      if (!bip39.validateMnemonic(mnemonic)) {
        setPreviewAddress('유효하지 않은 니모닉입니다.');
        return;
      }

      // 니모닉으로부터 지갑 주소 생성
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      setPreviewAddress(wallet.address);
    } catch (error) {
      console.error('지갑 미리보기 실패:', error);
      setPreviewAddress('지갑 주소를 생성할 수 없습니다.');
    }
  };

  return (
    <div className="blog-container">
      <h2>🦊 블록체인 지갑</h2>

      {showWalletOptions ? (
        <div className="wallet-actions">
          <button onClick={() => {
            setIsCreating(true);
            setIsImporting(false);
          }} className="wallet-button">
            새 지갑 생성
          </button>
          <button onClick={() => {
            setIsImporting(true);
            setIsCreating(false);
          }} className="wallet-button">
            기존 지갑 가져오기
          </button>
        </div>
      ) : null}

      {isCreating ? (
        <div className="create-wallet">
          <p>새로운 지갑을 생성하시겠습니까?</p>
          <p className="warning-text">⚠️ 생성된 지갑의 니모닉 키는 안전한 곳에 보관하세요!</p>
          <div className="import-buttons">
            <button onClick={createWallet}>지갑 생성</button>
            <button onClick={() => {
              setIsCreating(false);
              setShowWalletOptions(true);
            }}>취소</button>
          </div>
        </div>
      ) : isImporting ? (
        <div className="import-wallet">
          <input
            type="text"
            placeholder="니모닉 키를 입력하세요"
            value={mnemonic}
            onChange={(e) => {
              setMnemonic(e.target.value);
              previewWallet(e.target.value);
            }}
          />
          {previewAddress && (
            <div className="preview-address">
              <p><strong>지갑 주소:</strong> {previewAddress}</p>
            </div>
          )}
          <div className="import-buttons">
            <button onClick={importWallet}>가져오기</button>
            <button onClick={() => {
              setIsImporting(false);
              setShowWalletOptions(true);
              setPreviewAddress(null);
            }}>취소</button>
          </div>
        </div>
      ) : wallet && !showWalletOptions ? (
        <div>
          <div className="wallet-info">
            <p className="address-private-section">
              <strong>주소:</strong> {wallet.address}
              <button onClick={copyAddress} className="copy-btn">
                {copyAddressSuccess ? '복사됨!' : '복사'}
              </button>
            </p>
            {mnemonic && (
              <div className="private-key-section address-private-section">
                <strong>니모닉 키:</strong>
                <div className="key-display">
                  <span>{showMnemonic ? mnemonic : '••••••••••••••••'}</span>
                  <button onClick={() => setShowMnemonic(!showMnemonic)} className="toggle-visibility">
                    {showMnemonic ? '👁️' : '👁️‍🗨️'}
                  </button>
                  <button onClick={copyMnemonic} className="copy-btn">
                    복사
                  </button>
                </div>
              </div>
            )}
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