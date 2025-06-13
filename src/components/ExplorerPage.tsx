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

interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
}

interface TokenTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  hash: string;
  timestamp: number;
}

interface AddressInfo {
  address: string;
  balance: string;
  isContract: boolean;
  code: string | null;
  tokenBalances: TokenBalance[];
}

interface ContractInfo {
  address: string;
  code: string;
  codeLength: number;
  abi?: any[];
  functions?: any[];
  events?: any[];
  error?: string;
}

interface ContractCall {
  functionName: string;
  inputs: any[];
  outputs: any[];
}

// ERC20 토큰 ABI
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "from", "type": "address"},
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": false, "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  }
];

const NETWORKS = {
  ETHEREUM: {
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH'
  }
};

const ExplorerPage: React.FC = () => {
  const [web3, setWeb3] = useState<Web3>(new Web3(NETWORKS.ETHEREUM.rpcUrl));
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ETHEREUM');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [blockInfo, setBlockInfo] = useState<any>(null);
  const [txHash, setTxHash] = useState<string>('');
  const [txInfo, setTxInfo] = useState<any>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);
  const [address, setAddress] = useState<string>('');
  const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null);
  const [addressTxs, setAddressTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [tokenTransfers, setTokenTransfers] = useState<TokenTransfer[]>([]);
  const [networkLoad, setNetworkLoad] = useState<{
    pendingTxs: number;
    avgBlockTime: number;
    gasPrice: string;
    lastUpdate: Date;
  }>({
    pendingTxs: 0,
    avgBlockTime: 0,
    gasPrice: '0',
    lastUpdate: new Date()
  });
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [functionInputs, setFunctionInputs] = useState<any[]>([]);
  const [functionResult, setFunctionResult] = useState<any>(null);
  const [contractEvents, setContractEvents] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('');

  useEffect(() => {
    getLatestBlock();
    getNetworkStats();
    // 30초마다 네트워크 상태 업데이트 (10초에서 30초로 변경)
    const interval = setInterval(getNetworkStats, 30000);
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
      console.log('트랜잭션 해시:', hash);
      
      // 해시 형식 검증
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        console.error('잘못된 트랜잭션 해시 형식');
        setTxInfo(null);
        setTxReceipt(null);
        return;
      }

      // Etherscan API를 통해 트랜잭션 정보 가져오기
      console.log('Etherscan API로 트랜잭션 정보 조회 시작...');
      const txResponse = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${hash}&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`);
      const txData = await txResponse.json();
      console.log('Etherscan 트랜잭션 응답:', txData);

      if (txData.result) {
        const tx = txData.result;
        console.log('트랜잭션 정보:', tx);

        // Etherscan API를 통해 트랜잭션 영수증 가져오기
        console.log('Etherscan API로 트랜잭션 영수증 조회 시작...');
        const receiptResponse = await fetch(`https://api.etherscan.io/api?module=proxy&action=eth_getTransactionReceipt&txhash=${hash}&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`);
        const receiptData = await receiptResponse.json();
        console.log('Etherscan 영수증 응답:', receiptData);

        let receipt = null;
        if (receiptData.result) {
          receipt = receiptData.result;
          console.log('트랜잭션 영수증:', receipt);
        }

        // ERC20 토큰 전송 확인
        let tokenTransfer = null;
        if (receipt && receipt.logs && receipt.logs.length > 0) {
          console.log('로그 분석 시작...');
          for (const log of receipt.logs) {
            try {
              if (!log.topics || log.topics.length < 3) {
                console.log('로그 토픽 부족:', log);
                continue;
              }
              
              console.log('로그 분석:', log);
              const contract = new web3.eth.Contract(ERC20_ABI, log.address);
              // Transfer 이벤트의 시그니처
              const transferEventSignature = web3.utils.sha3('Transfer(address,address,uint256)');
              console.log('Transfer 이벤트 시그니처:', transferEventSignature);
              console.log('로그 토픽[0]:', log.topics[0]);
              
              if (log.topics[0] === transferEventSignature) {
                console.log('Transfer 이벤트 발견');
                const from = web3.eth.abi.decodeParameter('address', log.topics[1] as string);
                const to = web3.eth.abi.decodeParameter('address', log.topics[2] as string);
                const value = web3.eth.abi.decodeParameter('uint256', log.data as string) as string;
                
                console.log('디코딩된 값:', { from, to, value });
                
                tokenTransfer = {
                  tokenAddress: log.address,
                  from,
                  to,
                  value: web3.utils.fromWei(value, 'ether'),
                  hash: receipt.transactionHash,
                  timestamp: Number(receipt.blockNumber)
                };
                break;
              }
            } catch (error) {
              console.error('ERC20 이벤트 디코딩 실패:', error);
            }
          }
        }

        // Wei를 Ether로 변환하는 함수
        const weiToEther = (wei: string) => {
          try {
            if (!wei) return '0';
            const weiNum = parseInt(wei, 16);
            const ether = weiNum / 1e18;
            return ether.toFixed(18);
          } catch (error) {
            console.error('Wei 변환 실패:', error);
            return '0';
          }
        };

        // Gas 가격을 Gwei로 변환하는 함수
        const weiToGwei = (wei: string) => {
          try {
            if (!wei) return '0';
            const weiNum = parseInt(wei, 16);
            const gwei = weiNum / 1e9;
            return gwei.toFixed(9);
          } catch (error) {
            console.error('Gas 가격 변환 실패:', error);
            return '0';
          }
        };

        // 트랜잭션 정보 변환
        const formattedTx = {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: weiToEther(tx.value),
          gas: tx.gas ? parseInt(tx.gas, 16) : 0,
          gasPrice: weiToGwei(tx.gasPrice),
          nonce: tx.nonce ? parseInt(tx.nonce, 16) : 0,
          input: tx.input || '0x',
          r: tx.r || '0x',
          s: tx.s || '0x',
          v: tx.v || '0x',
          tokenTransfer
        };

        console.log('포맷된 트랜잭션 정보:', formattedTx);
        setTxInfo(formattedTx);
        setTxReceipt(receipt);
        
        console.log('트랜잭션 정보 설정 완료');
      } else {
        throw new Error('트랜잭션을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('트랜잭션 정보 조회 실패:', error);
      setTxInfo(null);
      setTxReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  const getAddressInfo = async (address: string) => {
    try {
      console.log('주소 조회 시작:', address);
      console.log('현재 네트워크:', selectedNetwork);
      console.log('RPC URL:', NETWORKS[selectedNetwork as keyof typeof NETWORKS].rpcUrl);
      
      setLoading(true);
      const balance = await web3.eth.getBalance(address);
      console.log('기본 잔액 조회 성공:', balance);
      
      const code = await web3.eth.getCode(address);
      console.log('컨트랙트 코드 조회 성공:', code);
      
      const isContract = code !== '0x';
      
      // 최근 트랜잭션 조회 (최대 10개)
      const block = await web3.eth.getBlock('latest');
      console.log('최신 블록 조회 성공:', block.number);
      
      const txs: any[] = [];
      const tokenTransfers: TokenTransfer[] = [];
      
      for (let i = 0; i < 10; i++) {
        const blockInfo = await web3.eth.getBlock(Number(block.number) - i, true);
        if (blockInfo.transactions && Array.isArray(blockInfo.transactions)) {
          const blockTxs = (blockInfo.transactions as any[]).filter((tx) => 
            tx.from.toLowerCase() === address.toLowerCase() || 
            tx.to?.toLowerCase() === address.toLowerCase()
          );
          txs.push(...blockTxs);
          if (txs.length >= 10) break;
        }
      }
      console.log('트랜잭션 조회 완료:', txs.length);

      // ERC20 토큰 잔액 조회 (네트워크별 토큰 주소)
      const commonTokens = {
        ETHEREUM: {
          'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        }
      };

      const tokenBalances: TokenBalance[] = [];
      const networkTokens = commonTokens[selectedNetwork as keyof typeof commonTokens];
      
      console.log('현재 네트워크:', selectedNetwork);
      console.log('조회할 토큰들:', networkTokens);
      
      for (const [symbol, tokenAddress] of Object.entries(networkTokens)) {
        try {
          console.log(`${symbol} 토큰 조회 시작:`, tokenAddress);
          const contract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
          
          // balanceOf 함수 호출 방식 변경
          const data = contract.methods.balanceOf(address).encodeABI();
          const result = await web3.eth.call({
            to: tokenAddress,
            data: data
          });
          
          const balance = web3.eth.abi.decodeParameter('uint256', result) as string;
          console.log(`${symbol} 잔액:`, balance);
          
          if (balance && balance !== '0') {
            const formattedBalance = web3.utils.fromWei(balance, 'ether');
            console.log(`${symbol} 포맷된 잔액:`, formattedBalance);
            
            tokenBalances.push({
              symbol,
              address: tokenAddress,
              balance: formattedBalance
            });
          }
        } catch (error) {
          console.error(`${symbol} 잔액 조회 실패:`, error);
        }
      }

      console.log('최종 토큰 잔액:', tokenBalances);

      const newAddressInfo: AddressInfo = {
        address,
        balance: web3.utils.fromWei(balance, 'ether'),
        isContract,
        code: isContract ? code : null,
        tokenBalances
      };
      
      console.log('설정할 주소 정보:', newAddressInfo);
      setAddressInfo(newAddressInfo);
      setAddressTxs(txs.slice(0, 10));
      setTokenTransfers(tokenTransfers);
      
      // 상태 업데이트 확인
      setTimeout(() => {
        console.log('현재 addressInfo 상태:', addressInfo);
      }, 100);
      
    } catch (error) {
      console.error('주소 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // addressInfo 상태 변경 감지
  useEffect(() => {
    console.log('addressInfo가 변경됨:', addressInfo);
  }, [addressInfo]);

  const getNetworkStats = async () => {
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const block = await web3.eth.getBlock('latest');
      const prevBlock = await web3.eth.getBlock(Number(block.number) - 1);
      const blockTime = Number(block.timestamp) - Number(prevBlock.timestamp);
      
      // 트랜잭션 속도 분석을 위한 최근 5개 블록만 조회 (10개에서 5개로 감소)
      let totalBlockTime = 0;
      let totalTransactions = 0;
      let blockCount = 0;
      
      for (let i = 0; i < 5; i++) {
        try {
          const currentBlock = await web3.eth.getBlock(Number(block.number) - i, true);
          const prevBlock = await web3.eth.getBlock(Number(block.number) - i - 1);
          if (currentBlock && prevBlock) {
            totalBlockTime += Number(currentBlock.timestamp) - Number(prevBlock.timestamp);
            totalTransactions += currentBlock.transactions.length;
            blockCount++;
          }
          // 각 요청 사이에 1초 대기
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('블록 타임 계산 중 오류:', error);
          break;
        }
      }
      
      const avgBlockTime = blockCount > 0 ? totalBlockTime / blockCount : 0;
      const avgTransactionsPerBlock = blockCount > 0 ? totalTransactions / blockCount : 0;
      
      // 네트워크 부하 추정 (블록당 평균 트랜잭션 수를 기반으로)
      const estimatedNetworkLoad = Math.round(avgTransactionsPerBlock * (15 / avgBlockTime));
      
      setNetworkLoad({
        pendingTxs: estimatedNetworkLoad,
        avgBlockTime,
        gasPrice: web3.utils.fromWei(gasPrice, 'gwei'),
        lastUpdate: new Date()
      });
      
      setNetworkStats({
        gasPrice: web3.utils.fromWei(gasPrice, 'gwei'),
        blockTime,
        lastBlock: block.number,
        pendingTxs: estimatedNetworkLoad
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
        setContractInfo({
          address: '',
          code: '',
          codeLength: 0,
          error: '올바른 이더리움 주소 형식이 아닙니다.'
        });
        return;
      }

      const code = await web3.eth.getCode(address);
      console.log('컨트랙트 코드:', code);
      
      if (code === '0x') {
        console.log('스마트 컨트랙트가 아님');
        setContractInfo({
          address,
          code,
          codeLength: 0,
          error: '해당 주소는 스마트 컨트랙트가 아닙니다.'
        });
        return;
      }

      // Etherscan API를 통해 ABI 가져오기
      try {
        const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`);
        const data = await response.json();
        console.log('Etherscan API 응답:', data);
        
        if (data.status === '1' && data.result) {
          const abi = JSON.parse(data.result);
          console.log('파싱된 ABI:', abi);
          
          const functions = abi.filter((item: any) => item.type === 'function');
          const events = abi.filter((item: any) => item.type === 'event');
          
          console.log('추출된 함수:', functions);
          console.log('추출된 이벤트:', events);
          
          setContractInfo({
            address,
            code,
            codeLength: code.length - 2,
            abi,
            functions,
            events
          });
        } else {
          console.log('ABI 정보 없음, 기본 정보만 표시');
          setContractInfo({
            address,
            code,
            codeLength: code.length - 2
          });
        }
      } catch (error) {
        console.error('ABI 조회 실패:', error);
        setContractInfo({
          address,
          code,
          codeLength: code.length - 2
        });
      }
    } catch (error) {
      console.error('컨트랙트 정보 조회 실패:', error);
      setContractInfo({
        address: '',
        code: '',
        codeLength: 0,
        error: '컨트랙트 정보 조회 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const callContractFunction = async () => {
    if (!contractInfo?.abi || !selectedFunction) return;

    try {
      setLoading(true);
      const contract = new web3.eth.Contract(contractInfo.abi, contractInfo.address);
      const functionABI = contractInfo.abi.find((item: any) => 
        item.type === 'function' && item.name === selectedFunction
      );

      if (!functionABI) {
        setFunctionResult({ error: '함수를 찾을 수 없습니다.' });
        return;
      }

      let result;
      if (functionABI.stateMutability === 'view' || functionABI.stateMutability === 'pure') {
        result = await contract.methods[selectedFunction](...functionInputs).call();
      } else {
        result = await contract.methods[selectedFunction](...functionInputs).send();
      }

      setFunctionResult(result);
    } catch (error) {
      console.error('함수 호출 실패:', error);
      setFunctionResult({ error: '함수 호출 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const getContractEvents = async () => {
    if (!contractInfo?.abi || !eventFilter) return;

    try {
      setLoading(true);
      const contract = new web3.eth.Contract(contractInfo.abi, contractInfo.address);
      const eventABI = contractInfo.abi.find((item: any) => 
        item.type === 'event' && item.name === eventFilter
      );

      if (!eventABI) {
        setContractEvents([]);
        return;
      }

      const events = await contract.getPastEvents(eventFilter, {
        fromBlock: 'latest',
        toBlock: 'latest'
      });

      setContractEvents(events);
    } catch (error) {
      console.error('이벤트 조회 실패:', error);
      setContractEvents([]);
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
      <h2>🔍 이더리움 익스플로러</h2>
      
      <div className="explorer-section">
        <h3>네트워크 선택</h3>
        <div className="network-selector">
          <select 
            value={selectedNetwork} 
            onChange={(e) => changeNetwork(e.target.value)}
          >
            <option value="ETHEREUM">Ethereum</option>
          </select>
        </div>
      </div>

      <div className="explorer-section">
        <h3>네트워크 상태 모니터링</h3>
        <div className="info-box" style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>트랜잭션 속도</h4>
              <p><strong>평균 블록 타임:</strong> {networkLoad.avgBlockTime.toFixed(2)}초</p>
              <p><strong>초당 트랜잭션:</strong> {networkLoad.avgBlockTime > 0 ? (15 / networkLoad.avgBlockTime).toFixed(2) : 0} TPS</p>
            </div>
            <div>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>네트워크 부하</h4>
              <p><strong>대기 중인 트랜잭션:</strong> {networkLoad.pendingTxs}개</p>
              <p><strong>현재 Gas 가격:</strong> {networkLoad.gasPrice} Gwei</p>
            </div>
            <div>
              <h4 style={{ color: '#333', marginBottom: '10px' }}>상태</h4>
              <p><strong>최신 블록:</strong> {networkStats?.lastBlock || '로딩 중...'}</p>
              <p><strong>마지막 업데이트:</strong> {networkLoad.lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

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
            <p>상태: {txReceipt ? (txReceipt.status ? '성공' : '실패') : '보류 중'}</p>
            <p>보내는 주소: {txInfo.from}</p>
            <p>받는 주소: {txInfo.to}</p>
            <p>금액: {txInfo.value} {NETWORKS[selectedNetwork as keyof typeof NETWORKS].symbol}</p>
            <p>Gas 가격: {txInfo.gasPrice} Gwei</p>
            <p>Gas 한도: {txInfo.gas}</p>
            {txReceipt && (
              <>
                <p>Gas 사용량: {txReceipt.gasUsed}</p>
                <p>블록 번호: {txReceipt.blockNumber}</p>
                <p>블록 해시: {txReceipt.blockHash}</p>
              </>
            )}
            {txInfo.tokenTransfer && (
              <div className="token-transfer-info">
                <h4>토큰 전송 정보</h4>
                <p>토큰 주소: {txInfo.tokenTransfer.tokenAddress}</p>
                <p>보내는 주소: {txInfo.tokenTransfer.from}</p>
                <p>받는 주소: {txInfo.tokenTransfer.to}</p>
                <p>전송량: {txInfo.tokenTransfer.value} 토큰</p>
              </div>
            )}
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
          <div className="info-box" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '15px', color: '#333' }}>주소 정보</h4>
            <div style={{ marginBottom: '10px' }}>
              <p><strong>주소:</strong> {addressInfo.address}</p>
              <p><strong>잔액:</strong> {addressInfo.balance} {NETWORKS[selectedNetwork as keyof typeof NETWORKS].symbol}</p>
              {addressInfo.isContract && (
                <p style={{ color: '#666' }}>스마트 컨트랙트 주소입니다.</p>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: '#333' }}>토큰 잔액</h4>
              {addressInfo.tokenBalances && addressInfo.tokenBalances.length > 0 ? (
                addressInfo.tokenBalances.map((token: TokenBalance, index: number) => (
                  <div key={index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <p><strong>{token.symbol}:</strong> {token.balance}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#666' }}>보유한 토큰이 없습니다.</p>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: '#333' }}>최근 트랜잭션</h4>
              {addressTxs && addressTxs.length > 0 ? (
                addressTxs.map((tx, index) => (
                  <div key={index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <p><strong>해시:</strong> {tx.hash}</p>
                    <p><strong>타입:</strong> {tx.from.toLowerCase() === address.toLowerCase() ? '송금' : '입금'}</p>
                    <p><strong>금액:</strong> {tx.value} {NETWORKS[selectedNetwork as keyof typeof NETWORKS].symbol}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#666' }}>트랜잭션 내역이 없습니다.</p>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: '#333' }}>토큰 전송 내역</h4>
              {tokenTransfers && tokenTransfers.length > 0 ? (
                tokenTransfers.map((transfer, index) => (
                  <div key={index} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <p><strong>토큰 주소:</strong> {transfer.tokenAddress}</p>
                    <p><strong>타입:</strong> {transfer.from.toLowerCase() === address.toLowerCase() ? '송금' : '입금'}</p>
                    <p><strong>금액:</strong> {transfer.value} 토큰</p>
                    <p><strong>트랜잭션 해시:</strong> {transfer.hash}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: '#666' }}>토큰 전송 내역이 없습니다.</p>
              )}
            </div>
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
                
                {contractInfo.abi && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>ABI 정보</h4>
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '15px', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(contractInfo.abi, null, 2)}
                    </pre>
                  </div>
                )}

                {contractInfo.functions && contractInfo.functions.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>함수 호출</h4>
                    <select 
                      value={selectedFunction}
                      onChange={(e) => setSelectedFunction(e.target.value)}
                      style={{ marginBottom: '10px', padding: '5px' }}
                    >
                      <option value="">함수 선택</option>
                      {contractInfo.functions.map((func: any, index: number) => (
                        <option key={index} value={func.name}>
                          {func.name}
                        </option>
                      ))}
                    </select>

                    {selectedFunction && (
                      <div>
                        <button 
                          onClick={callContractFunction}
                          style={{ marginTop: '10px' }}
                        >
                          함수 호출
                        </button>
                        {functionResult && (
                          <div style={{ marginTop: '10px' }}>
                            <h5>결과:</h5>
                            <pre style={{ 
                              backgroundColor: '#f5f5f5', 
                              padding: '10px', 
                              borderRadius: '4px' 
                            }}>
                              {JSON.stringify(functionResult, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {contractInfo.events && contractInfo.events.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4>이벤트 조회</h4>
                    <select 
                      value={eventFilter}
                      onChange={(e) => setEventFilter(e.target.value)}
                      style={{ marginBottom: '10px', padding: '5px' }}
                    >
                      <option value="">이벤트 선택</option>
                      {contractInfo.events.map((event: any, index: number) => (
                        <option key={index} value={event.name}>
                          {event.name}
                        </option>
                      ))}
                    </select>

                    {eventFilter && (
                      <div>
                        <button 
                          onClick={getContractEvents}
                          style={{ marginTop: '10px' }}
                        >
                          이벤트 조회
                        </button>
                        {contractEvents.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <h5>이벤트 목록:</h5>
                            {contractEvents.map((event, index) => (
                              <div 
                                key={index}
                                style={{ 
                                  marginBottom: '10px',
                                  padding: '10px',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: '4px'
                                }}
                              >
                                <p><strong>트랜잭션 해시:</strong> {event.transactionHash}</p>
                                <p><strong>블록 번호:</strong> {event.blockNumber}</p>
                                <p><strong>이벤트 데이터:</strong></p>
                                <pre style={{ 
                                  backgroundColor: '#fff', 
                                  padding: '10px', 
                                  borderRadius: '4px',
                                  marginTop: '5px'
                                }}>
                                  {JSON.stringify(event.returnValues, null, 2)}
                                </pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <details style={{ marginTop: '20px' }}>
                  <summary>바이트코드 보기</summary>
                  <pre className="bytecode" style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '15px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}>
                    {contractInfo.code}
                  </pre>
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