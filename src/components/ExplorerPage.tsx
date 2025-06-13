import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

interface Transaction {
  hash: string;
  from: string;
  to?: string;
  value: string;
  gas: number;
  gasPrice: string;
  nonce: number;
  input: string;
  r: string;
  s: string;
  v: string;
}

const NETWORKS = {
  KAIA: {
    name: 'KAIA',
    rpcUrl: 'https://public-en-kairos.node.kaia.io',
    explorerUrl: 'https://kairos.kaiascan.io',
    symbol: 'KAIA'
  },
  ETHEREUM: {
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH'
  }
};

const ExplorerPage: React.FC = () => {
  const [web3, setWeb3] = useState<Web3>(new Web3(NETWORKS.KAIA.rpcUrl));
  const [selectedNetwork, setSelectedNetwork] = useState<string>('KAIA');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [txInfo, setTxInfo] = useState<any>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [addressInfo, setAddressInfo] = useState<any>(null);
  const [addressTxs, setAddressTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractInfo, setContractInfo] = useState<any>(null);

  useEffect(() => {
    getLatestBlock();
    getNetworkStats();
    // 10초마다 네트워크 상태 업데이트
    const interval = setInterval(getNetworkStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getLatestBlock = async () => {
    try {
      const latestBlock = await web3.eth.getBlockNumber();
      setBlockNumber(Number(latestBlock));
    } catch (error) {
      console.error('최신 블록 조회 실패:', error);
    }
  };

  const getBlockInfo = async (blockNumber: number) => {
    try {
      setLoading(true);
      const block = await web3.eth.getBlock(blockNumber, true);
      setBlockInfo(block);
    } catch (error) {
      console.error('블록 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionInfo = async (hash: string) => {
    try {
      setLoading(true);
      const tx = await web3.eth.getTransaction(hash);
      setTxInfo(tx);
    } catch (error) {
      console.error('트랜잭션 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAddressInfo = async (address: string) => {
    try {
      setLoading(true);
      const balance = await web3.eth.getBalance(address);
      const code = await web3.eth.getCode(address);
      const isContract = code !== '0x';
      
      // 최근 트랜잭션 조회 (최대 10개)
      const block = await web3.eth.getBlock('latest');
      const txs: Transaction[] = [];
      for (let i = 0; i < 10; i++) {
        const blockInfo = await web3.eth.getBlock(Number(block.number) - i, true);
        if (blockInfo.transactions && Array.isArray(blockInfo.transactions)) {
          const blockTxs = (blockInfo.transactions as unknown as Transaction[]).filter((tx) => 
            tx.from.toLowerCase() === address.toLowerCase() || 
            tx.to?.toLowerCase() === address.toLowerCase()
          );
          txs.push(...blockTxs);
          if (txs.length >= 10) break;
        }
      }

      setAddressInfo({
        address,
        balance: web3.utils.fromWei(balance, 'ether'),
        isContract,
        code: isContract ? code : null
      });
      setAddressTxs(txs.slice(0, 10));
    } catch (error) {
      console.error('주소 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkStats = async () => {
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const block = await web3.eth.getBlock('latest');
      const prevBlock = await web3.eth.getBlock(Number(block.number) - 1);
      const blockTime = Number(block.timestamp) - Number(prevBlock.timestamp);
      
      setNetworkStats({
        gasPrice: web3.utils.fromWei(gasPrice, 'gwei'),
        blockTime,
        lastBlock: block.number,
        pendingTxs: await web3.eth.getPendingTransactions()
      });
    } catch (error) {
      console.error('네트워크 상태 조회 실패:', error);
    }
  };

  const getContractInfo = async (address: string) => {
    try {
      setLoading(true);
      console.log('입력된 주소:', address);
      console.log('현재 네트워크:', selectedNetwork);
      console.log('RPC URL:', NETWORKS[selectedNetwork as keyof typeof NETWORKS].rpcUrl);
      
      // 주소 형식 검증
      if (!web3.utils.isAddress(address)) {
        console.log('주소 형식 검증 실패');
        setContractInfo({ error: '올바른 이더리움 주소 형식이 아닙니다.' });
        return;
      }

      const code = await web3.eth.getCode(address);
      console.log('컨트랙트 코드:', code);
      
      if (code === '0x') {
        console.log('스마트 컨트랙트가 아님');
        setContractInfo({ error: '해당 주소는 스마트 컨트랙트가 아닙니다.' });
        return;
      }

      // 컨트랙트 ABI는 별도로 가져와야 합니다
      setContractInfo({
        address,
        code,
        codeLength: code.length - 2, // '0x' 제외한 길이
        // 여기에 ABI 정보를 추가할 수 있습니다
      });
      console.log('컨트랙트 정보 설정 완료');
    } catch (error) {
      console.error('컨트랙트 정보 조회 실패:', error);
      setContractInfo({ error: '컨트랙트 정보 조회 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const changeNetwork = (network: string) => {
    setWeb3(new Web3(NETWORKS[network as keyof typeof NETWORKS].rpcUrl));
    setSelectedNetwork(network);
  };

  return (
    <div className="blog-container">
      <h2>🔍 블록체인 익스플로러</h2>
      
      <div className="explorer-section">
        <h3>네트워크 선택</h3>
        <div className="network-selector">
          <select 
            value={selectedNetwork} 
            onChange={(e) => changeNetwork(e.target.value)}
          >
            <option value="KAIA">KAIA</option>
            <option value="ETHEREUM">Ethereum</option>
          </select>
        </div>
      </div>

      {networkStats && (
        <div className="explorer-section">
          <h3>네트워크 상태</h3>
          <div className="info-box">
            <p>현재 Gas Price: {networkStats.gasPrice} Gwei</p>
            <p>평균 블록 타임: {networkStats.blockTime}초</p>
            <p>대기 중인 트랜잭션: {networkStats.pendingTxs.length}개</p>
          </div>
        </div>
      )}

      <div className="explorer-section">
        <h3>최신 블록</h3>
        {blockNumber && (
          <p>현재 블록 높이: {blockNumber}</p>
        )}
        <div className="search-box">
          <input
            type="number"
            placeholder="블록 번호 입력"
            onChange={(e) => getBlockInfo(Number(e.target.value))}
          />
        </div>
        {blockInfo && (
          <div className="info-box">
            <h4>블록 정보</h4>
            <p>블록 해시: {blockInfo.hash}</p>
            <p>타임스탬프: {new Date(Number(blockInfo.timestamp) * 1000).toLocaleString()}</p>
            <p>트랜잭션 수: {blockInfo.transactions.length}</p>
          </div>
        )}
      </div>

      <div className="explorer-section">
        <h3>트랜잭션 조회</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="트랜잭션 해시 입력"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <button onClick={() => getTransactionInfo(txHash)}>조회</button>
        </div>
        {txInfo && (
          <div className="info-box">
            <h4>트랜잭션 정보</h4>
            <p>해시: {txInfo.hash}</p>
            <p>보내는 주소: {txInfo.from}</p>
            <p>받는 주소: {txInfo.to}</p>
            <p>금액: {web3.utils.fromWei(txInfo.value, 'ether')} {NETWORKS[selectedNetwork as keyof typeof NETWORKS].symbol}</p>
          </div>
        )}
      </div>

      <div className="explorer-section">
        <h3>주소 조회</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="지갑 주소 입력"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button onClick={() => getAddressInfo(address)}>조회</button>
        </div>
        {addressInfo && (
          <div className="info-box">
            <h4>주소 정보</h4>
            <p>주소: {addressInfo.address}</p>
            <p>잔액: {addressInfo.balance} {NETWORKS[selectedNetwork as keyof typeof NETWORKS].symbol}</p>
          </div>
        )}
      </div>

      <div className="explorer-section">
        <h3>스마트 컨트랙트 조회</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="컨트랙트 주소 입력"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
          <button onClick={() => getContractInfo(contractAddress)}>조회</button>
        </div>
        {contractInfo && (
          <div className="info-box">
            {contractInfo.error ? (
              <div className="error-message">
                <p>{contractInfo.error}</p>
              </div>
            ) : (
              <>
                <h4>컨트랙트 정보</h4>
                <p>주소: {contractInfo.address}</p>
                <p>바이트코드 길이: {contractInfo.codeLength} bytes</p>
                <details>
                  <summary>바이트코드 보기</summary>
                  <pre className="bytecode">{contractInfo.code}</pre>
                </details>
              </>
            )}
          </div>
        )}
      </div>

      {loading && <div className="loading">로딩 중...</div>}
    </div>
  );
};

export default ExplorerPage; 