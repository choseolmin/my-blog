import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import './ExplorerPage.css';
import { AbiItem } from 'web3-utils';

const ERC20_ABI: AbiItem[] = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" }
    ],
    name: "Approval",
    type: "event"
  }
];
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
  txCount: number;
}

interface ContractInfo {
  address: string;
  code: string;
  codeLength: number;
  abi?: any[];
  functions?: any[];
  events?: any[];
  error?: string;
  isVerified?: boolean;
  isProxy?: boolean;
  implementation?: string;
  constructorArgs?: string;
  sourceCode?: string;
}

interface ContractCall {
  functionName: string;
  inputs: any[];
  outputs: any[];
}

interface TransactionHistory {
  hash: string;
  method: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
}

interface EventLog {
  blockNumber: number;
  transactionHash: string;
  returnValues: any;
  event: string;
  signature: string;
  raw: {
    data: string;
    topics: string[];
  };
}

// 이벤트 객체 타입 정의
interface EventObject {
  returnValues?: {
    [key: string]: any;
  };
  blockNumber: number;
  transactionHash: string;
  [key: string]: any;
}

const NETWORKS = {
  ETHEREUM: {
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    symbol: 'ETH'
  }
};

// BigInt를 문자열로 변환하는 함수
const convertBigIntToString = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = convertBigIntToString(obj[key]);
    }
    return result;
  }
  
  return obj;
};

const ExplorerPage: React.FC = () => {
  const [web3, setWeb3] = useState<Web3>(new Web3(NETWORKS.ETHEREUM.rpcUrl));
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ETHEREUM');
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [blockInput, setBlockInput] = useState<string>('');
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
  const [functionInputs, setFunctionInputs] = useState<{[key: string]: string}>({});
  const [functionResult, setFunctionResult] = useState<any>(null);
  const [contractEvents, setContractEvents] = useState<any[]>([]);
  const [eventFilter, setEventFilter] = useState<any>({});
  const [txHistory, setTxHistory] = useState<TransactionHistory[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [blockError, setBlockError] = useState<string>('');
  const [txError, setTxError] = useState<string>('');
  const [addressError, setAddressError] = useState<string>('');
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

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
      setBlockError('');
      if (!blockNumber || blockNumber < 0) {
        setBlockError('올바른 블록 번호를 입력해주세요.');
        return;
      }
      setLoading(true);
      const block = await web3.eth.getBlock(blockNumber, true);
      if (!block) {
        setBlockError('존재하지 않는 블록 번호입니다.');
        return;
      }
      setBlockInfo(block);
    } catch (error) {
      console.error('블록 정보 조회 실패:', error);
      setBlockError('블록 정보 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionInfo = async (hash: string) => {
    try {
      setTxError('');
      if (!hash) {
        setTxError('트랜잭션 해시를 입력해주세요.');
        return;
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        setTxError('올바른 트랜잭션 해시 형식이 아닙니다.');
        return;
      }
      setLoading(true);
      console.log('트랜잭션 해시:', hash);
      
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
                const value = web3.eth.abi.decodeParameter('uint256', log.data as string) as unknown as string;

                
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
      setTxError('트랜잭션 정보 조회에 실패했습니다.');
      setTxInfo(null);
      setTxReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  const getAddressInfo = async (address: string, page: number = 1) => {
    try {
      setAddressError('');
      if (!address) {
        setAddressError('주소를 입력해주세요.');
        return;
      }
      if (!web3.utils.isAddress(address)) {
        setAddressError('올바른 이더리움 주소 형식이 아닙니다.');
        return;
      }
      setLoading(true);
      console.log('주소 조회 시작:', address);
      
      // Etherscan API를 통해 트랜잭션 히스토리 가져오기
      const txHistoryResponse = await fetch(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=15&sort=desc&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`
      );
      const txHistoryData = await txHistoryResponse.json();
      console.log('트랜잭션 히스토리 응답:', txHistoryData);
      
      if (txHistoryData.status === '1' && txHistoryData.result) {
        const formattedHistory = txHistoryData.result.map((tx: any) => ({
          hash: tx.hash,
          method: tx.input === '0x' ? 'Transfer' : 'Contract Interaction',
          blockNumber: parseInt(tx.blockNumber),
          timestamp: parseInt(tx.timeStamp) * 1000,
          from: tx.from,
          to: tx.to,
          value: web3.utils.fromWei(tx.value, 'ether'),
          gasUsed: tx.gasUsed,
          gasPrice: web3.utils.fromWei(tx.gasPrice, 'gwei')
        }));

        if (page === 1) {
          setTxHistory(formattedHistory);
        } else {
          setTxHistory(prev => [...prev, ...formattedHistory]);
        }

        // 전체 트랜잭션 수 계산
        const totalTxs = txHistoryData.result.length;
        const hasMore = totalTxs === 15; // 현재 페이지가 가득 차있으면 더 있는 것으로 간주
        setTotalPages(hasMore ? currentPage + 1 : currentPage);

        const balance = await web3.eth.getBalance(address);
        const code = await web3.eth.getCode(address);
        const isContract = code !== '0x';

        const newAddressInfo: AddressInfo = {
          address,
          balance: web3.utils.fromWei(balance, 'ether'),
          isContract,
          code: isContract ? code : null,
          tokenBalances: [],
          txCount: txHistoryData.result.length
        };

        setAddressInfo(newAddressInfo);
      }
    } catch (error) {
      console.error('주소 정보 조회 실패:', error);
      setAddressError('주소 정보 조회에 실패했습니다.');
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

      // Etherscan API를 통해 컨트랙트 정보 가져오기
      try {
        const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`);
        const data = await response.json();
        console.log('Etherscan API 응답:', data);
        
        if (data.status === '1' && data.result[0]) {
          const contractData = data.result[0];
          console.log('컨트랙트 데이터:', {
            ABI: contractData.ABI,
            Proxy: contractData.Proxy,
            Implementation: contractData.Implementation,
            SourceCode: contractData.SourceCode ? '소스코드 있음' : '소스코드 없음'
          });

          let abi;
          if (contractData.Proxy === '1' && contractData.Implementation) {
            // 프록시 컨트랙트인 경우 구현 컨트랙트의 ABI 가져오기
            const implResponse = await fetch(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractData.Implementation}&apikey=N5AWI7NMY4M5ZDDEZ6MW2MAGZ41ETVW41A`);
            const implData = await implResponse.json();
            
            if (implData.status === '1' && implData.result[0]) {
              const implContractData = implData.result[0];
              abi = implContractData.ABI !== 'Contract source code not verified' ? JSON.parse(implContractData.ABI) : null;
            }
          } else {
            abi = contractData.ABI !== 'Contract source code not verified' ? JSON.parse(contractData.ABI) : null;
          }

          // ERC20 기본 이벤트 추가
          if (abi) {
            const hasTransferEvent = abi.some((item: any) => item.type === 'event' && item.name === 'Transfer');
            const hasApprovalEvent = abi.some((item: any) => item.type === 'event' && item.name === 'Approval');
            
            if (!hasTransferEvent) {
              abi.push(ERC20_ABI[1]); // Transfer 이벤트 추가
            }
            if (!hasApprovalEvent) {
              abi.push(ERC20_ABI[2]); // Approval 이벤트 추가
            }
          }

          const functions = abi ? abi.filter((item: any) => item.type === 'function') : [];
          const events = abi ? abi.filter((item: any) => item.type === 'event') : [];
          
          setContractInfo({
            address,
            code,
            codeLength: code.length - 2,
            abi,
            functions,
            events,
            isVerified: contractData.SourceCode !== '',
            isProxy: contractData.Proxy === '1',
            implementation: contractData.Implementation,
            constructorArgs: contractData.ConstructorArguments,
            sourceCode: contractData.SourceCode
          });
        } else {
          setContractInfo({
            address,
            code,
            codeLength: code.length - 2,
            error: '컨트랙트 정보를 가져올 수 없습니다.'
          });
        }
      } catch (error) {
        console.error('컨트랙트 정보 조회 실패:', error);
        setContractInfo({
          address,
          code,
          codeLength: code.length - 2,
          error: '컨트랙트 정보 조회 중 오류가 발생했습니다.'
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

  const handleFunctionSelect = (functionName: string) => {
    setSelectedFunction(functionName);
    const functionABI = contractInfo?.abi?.find((item: any) => 
      item.type === 'function' && item.name === functionName
    );
    
    // 함수 선택 시 입력 필드 초기화
    if (functionABI?.inputs) {
      const inputs: {[key: string]: string} = {};
      functionABI.inputs.forEach((input: any) => {
        inputs[input.name] = '';
      });
      setFunctionInputs(inputs);
    } else {
      setFunctionInputs({});
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
        setFunctionResult({ 
          status: 'error',
          message: '함수를 찾을 수 없습니다.',
          details: '컨트랙트에 해당 함수가 정의되어 있지 않습니다.'
        });
        return;
      }

      // 입력값 검증
      const requiredInputs = functionABI.inputs || [];
      const missingInputs = requiredInputs.filter((input: any) => !functionInputs[input.name]);
      
      if (missingInputs.length > 0) {
        setFunctionResult({
          status: 'error',
          message: '필수 인자가 누락되었습니다.',
          details: `다음 인자가 필요합니다: ${missingInputs.map((input: any) => input.name).join(', ')}`
        });
        return;
      }

      let result;
      if (functionABI.stateMutability === 'view' || functionABI.stateMutability === 'pure') {
        try {
          // 입력값을 배열로 변환
          const inputValues = requiredInputs.map((input: any) => functionInputs[input.name]);
          result = await contract.methods[selectedFunction](...inputValues).call();
          // BigInt 값을 문자열로 변환
          result = convertBigIntToString(result);
          setFunctionResult({
            status: 'success',
            data: result
          });
        } catch (error: any) {
          if (error.message.includes('revert')) {
            setFunctionResult({
              status: 'error',
              message: '함수 호출이 revert되었습니다.',
              details: '컨트랙트의 조건이 맞지 않아 함수가 실행되지 않았습니다.'
            });
          } else {
            setFunctionResult({
              status: 'error',
              message: '함수 호출에 실패했습니다.',
              details: error.message
            });
          }
        }
      } else {
        setFunctionResult({
          status: 'error',
          message: '읽기 전용 함수만 호출할 수 있습니다.',
          details: 'view 또는 pure 함수만 호출 가능합니다.'
        });
      }
    } catch (error: any) {
      console.error('함수 호출 실패:', error);
      setFunctionResult({
        status: 'error',
        message: '함수 호출 중 오류가 발생했습니다.',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 이벤트 조회 공통 함수
  const fetchEventsWithLimit = async (
    contract: any,
    eventName: string,
    fromBlock: number,
    toBlock: number,
    maxEvents: number = 100,
    filter?: {
      from?: string;
      to?: string;
      value?: string;
      [key: string]: any;
    }
  ) => {
    const step = 1000; // 블록 간격
    const events: EventObject[] = [];
    const MAX_BLOCKS = 5000; // 최대 조회 블록 수 제한

    // 조회할 블록 범위 제한
    const actualFromBlock = Math.max(fromBlock, toBlock - MAX_BLOCKS);
    
    console.log('이벤트 조회 시작:', {
      event: eventName,
      fromBlock: actualFromBlock,
      toBlock,
      step,
      maxEvents,
      filter,
      maxBlocks: MAX_BLOCKS
    });

    // 블록 범위를 나누어 조회
    for (let start = actualFromBlock; start <= toBlock; start += step) {
      // 이미 충분한 이벤트를 수집했다면 중단
      if (events.length >= maxEvents) {
        console.log(`최대 이벤트 수(${maxEvents}개)에 도달하여 조회를 중단합니다.`);
        break;
      }

      const end = Math.min(start + step - 1, toBlock);
      try {
        console.log(`블록 ${start}부터 ${end}까지 조회 중...`);
        const part = await contract.getPastEvents(eventName, {
          fromBlock: start,
          toBlock: end
        });
        // BigInt 값을 문자열로 변환
        const convertedPart = part.map((event: any) => convertBigIntToString(event));
        
        // 필터 조건 적용
        let filteredPart = convertedPart;
        if (filter) {
          filteredPart = convertedPart.filter((event: EventObject) => {
            if (!event.returnValues) return false;
            
            // 모든 필터 조건 검사
            return Object.entries(filter).every(([key, value]) => {
              if (!value) return true; // 값이 없으면 필터링하지 않음
              return event.returnValues?.[key]?.toLowerCase() === value.toLowerCase();
            });
          });
          console.log(`필터링 후 ${filteredPart.length}개의 이벤트 남음`);
        }
        
        // 남은 이벤트 수만큼만 추가
        const remainingSlots: number = maxEvents - events.length;
        const eventsToAdd: EventObject[] = filteredPart.slice(0, remainingSlots);
        events.push(...eventsToAdd);
        
        console.log(`${eventsToAdd.length}개의 이벤트 추가 (총 ${events.length}개)`);
        
        // 이미 충분한 이벤트를 수집했다면 중단
        if (events.length >= maxEvents) {
          break;
        }
      } catch (error: any) {
        console.error(`블록 ${start}부터 ${end}까지 조회 실패:`, error.message);
        // 에러가 발생해도 계속 진행
      }
      // RPC 부하 방지를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return events;
  };

  const getEventLogs = async () => {
    if (!contractInfo?.abi || !selectedEvent) return;

    try {
      setLoading(true);
      console.log('이벤트 로그 조회 시작:', {
        event: selectedEvent,
        contractAddress: contractInfo.address,
        isProxy: contractInfo.isProxy,
        implementation: contractInfo.implementation
      });

      // 프록시 컨트랙트인 경우 구현 컨트랙트 주소 사용
      const targetAddress = contractInfo.implementation || contractInfo.address;
      const contract = new web3.eth.Contract(contractInfo.abi, targetAddress);
      
      const eventABI = contractInfo.abi.find((item: any) => 
        item.type === 'event' && item.name === selectedEvent
      );

      if (!eventABI) {
        console.log('이벤트 ABI를 찾을 수 없음:', selectedEvent);
        setEventLogs([{ 
          status: 'error',
          message: '이벤트를 찾을 수 없습니다.',
          details: `이벤트 ${selectedEvent}의 ABI를 찾을 수 없습니다.`
        }]);
        return;
      }

      console.log('이벤트 ABI:', eventABI);

      // 블록 범위 설정
      const latestBlock = Number(await web3.eth.getBlockNumber());
      const fromBlock = Math.max(0, latestBlock - 10000); // 최근 10000개 블록
      const MAX_EVENTS = 100; // 최대 이벤트 수 제한

      // 필터 조건 설정 (예: Transfer 이벤트의 경우)
      const filter = selectedEvent === 'Transfer' ? {
        from: address, // 현재 조회 중인 주소
        to: address
      } : undefined;

      // 공통 함수를 사용하여 이벤트 조회
      const events = await fetchEventsWithLimit(
        contract,
        selectedEvent,
        fromBlock,
        latestBlock,
        MAX_EVENTS,
        filter
      );

      console.log('전체 조회된 이벤트:', events);

      if (events.length === 0) {
        setEventLogs([{ 
          status: 'info',
          message: '최근 5000개 블록에서 이벤트가 발생하지 않았습니다.',
          details: {
            eventName: selectedEvent,
            fromBlock,
            toBlock: latestBlock,
            contractAddress: targetAddress,
            isProxy: contractInfo.isProxy,
            implementation: contractInfo.implementation,
            filter
          }
        }]);
      } else {
        // 이벤트 데이터를 더 읽기 쉽게 포맷팅
        const formattedEvents = events.map((event) => {
          if (typeof event === 'string') {
            return { 
              status: 'error',
              message: event 
            };
          }

          // 이벤트 값 포맷팅
          const formattedValues: any = {};
          if (event.returnValues) {
            Object.entries(event.returnValues).forEach(([key, value]) => {
              // 숫자 값인 경우 wei를 ether로 변환
              if (typeof value === 'string' && /^\d+$/.test(value) && key === 'value') {
                formattedValues[key] = web3.utils.fromWei(value, 'ether');
              } else {
                formattedValues[key] = value;
              }
            });
          }

          return {
            status: 'success',
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            returnValues: formattedValues,
            timestamp: new Date().toISOString()
          };
        });
        setEventLogs(formattedEvents);
      }
    } catch (error: any) {
      console.error('이벤트 로그 조회 실패:', error);
      setEventLogs([{ 
        status: 'error',
        message: '이벤트 로그 조회에 실패했습니다.',
        details: error.message || '알 수 없는 오류'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const changeNetwork = (network: string) => {
    setWeb3(new Web3(NETWORKS[network as keyof typeof NETWORKS].rpcUrl));
    setSelectedNetwork(network);
  };

  const loadMoreTransactions = async () => {
    if (isLoadingMore || currentPage >= totalPages) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    await getAddressInfo(address, nextPage);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  };

  return (
    <div className="explorer-container">
      <h2>이더리움 익스플로러</h2>
      
      {/* 네트워크 상태 */}
      <div className="explorer-section">
        <h3>네트워크 상태</h3>
        <div className="info-box">
          <p><strong>최신 블록:</strong> {blockNumber}</p>
          <p><strong>대기 중인 트랜잭션:</strong> {networkLoad.pendingTxs}</p>
          <p><strong>평균 블록 시간:</strong> {networkLoad.avgBlockTime.toFixed(2)}초</p>
          <p><strong>현재 가스 가격:</strong> {networkLoad.gasPrice} Gwei</p>
          <p><strong>마지막 업데이트:</strong> {networkLoad.lastUpdate.toLocaleString()}</p>
        </div>
      </div>

      {/* 블록 조회 */}
      <div className="explorer-section">
        <h3>블록 조회</h3>
        <div className="search-box">
          <input
            type="number"
            placeholder="블록 번호 입력"
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
          />
          <button onClick={() => {
            const blockNum = parseInt(blockInput);
            if (!isNaN(blockNum)) {
              getBlockInfo(blockNum);
            } else {
              setBlockError('올바른 블록 번호를 입력해주세요.');
            }
          }}>조회</button>
        </div>
        {blockError && <p className="error-message">{blockError}</p>}
        {blockInfo && (
          <div className="info-box">
            <h4>블록 정보</h4>
            <p><strong>블록 번호:</strong> {blockInfo.number}</p>
            <p><strong>타임스탬프:</strong> {new Date(Number(blockInfo.timestamp) * 1000).toLocaleString()}</p>
            <p><strong>해시:</strong> {blockInfo.hash}</p>
            <p><strong>트랜잭션 수:</strong> {blockInfo.transactions.length}</p>
          </div>
        )}
      </div>

      {/* 트랜잭션 조회 */}
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
        {txError && <p className="error-message">{txError}</p>}
        {txInfo && (
          <div className="info-box">
            <h4>트랜잭션 정보</h4>
            <p><strong>해시:</strong> {txInfo.hash}</p>
            <p><strong>From:</strong> {txInfo.from}</p>
            <p><strong>To:</strong> {txInfo.to}</p>
            <p><strong>Value:</strong> {txInfo.value} ETH</p>
            <p><strong>Gas Price:</strong> {txInfo.gasPrice} Gwei</p>
            {txInfo.tokenTransfer && (
              <div className="token-transfer">
                <h4>토큰 전송 정보</h4>
                <p><strong>토큰 주소:</strong> {txInfo.tokenTransfer.tokenAddress}</p>
                <p><strong>From:</strong> {txInfo.tokenTransfer.from}</p>
                <p><strong>To:</strong> {txInfo.tokenTransfer.to}</p>
                <p><strong>Value:</strong> {txInfo.tokenTransfer.value}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 주소 조회 */}
      <div className="explorer-section">
        <h3>주소 조회</h3>
        <div className="search-box">
          <input
            type="text"
            placeholder="지갑 주소 입력"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button onClick={() => {
            setCurrentPage(1);
            setTotalPages(1);
            getAddressInfo(address);
          }}>조회</button>
        </div>
        {addressError && <p className="error-message">{addressError}</p>}
        {addressInfo && (
          <div className="info-box">
            <div className="info-section">
              <h4>주소 정보</h4>
              <p><strong>주소:</strong> {addressInfo.address}</p>
              <p><strong>잔액:</strong> {parseFloat(addressInfo.balance).toFixed(4)} ETH</p>
              <p><strong>계정 유형:</strong> {addressInfo.isContract ? '컨트랙트' : '일반 계정'}</p>
              <p><strong>트랜잭션 수:</strong> {addressInfo.txCount}</p>
            </div>

            <div className="info-section">
              <h4>트랜잭션 히스토리</h4>
              {txHistory.length > 0 ? (
                <>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>트랜잭션 해시</th>
                          <th>메소드</th>
                          <th>블록 번호</th>
                          <th>시간</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Value (ETH)</th>
                          <th>Gas Used</th>
                          <th>Gas Price (Gwei)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txHistory.map((tx, index) => (
                          <tr key={index}>
                            <td>
                              <a 
                                href={`${NETWORKS[selectedNetwork as keyof typeof NETWORKS].explorerUrl}/tx/${tx.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tx-link"
                              >
                                {tx.hash.substring(0, 10)}...{tx.hash.substring(58)}
                              </a>
                            </td>
                            <td>{tx.method}</td>
                            <td>
                              <a 
                                href={`${NETWORKS[selectedNetwork as keyof typeof NETWORKS].explorerUrl}/block/${tx.blockNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block-link"
                              >
                                {tx.blockNumber}
                              </a>
                            </td>
                            <td>{new Date(tx.timestamp).toLocaleString()}</td>
                            <td>
                              <a 
                                href={`${NETWORKS[selectedNetwork as keyof typeof NETWORKS].explorerUrl}/address/${tx.from}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="address-link"
                              >
                                {tx.from.substring(0, 6)}...{tx.from.substring(38)}
                              </a>
                            </td>
                            <td>
                              <a 
                                href={`${NETWORKS[selectedNetwork as keyof typeof NETWORKS].explorerUrl}/address/${tx.to}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="address-link"
                              >
                                {tx.to.substring(0, 6)}...{tx.to.substring(38)}
                              </a>
                            </td>
                            <td>{parseFloat(tx.value).toFixed(4)}</td>
                            <td>{tx.gasUsed}</td>
                            <td>{parseFloat(tx.gasPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {currentPage < totalPages && (
                    <div className="load-more">
                      <button
                        onClick={loadMoreTransactions}
                        disabled={isLoadingMore}
                        className="load-more-button"
                      >
                        {isLoadingMore ? '로딩 중...' : '더 보기'}
                      </button>
                      <p className="transaction-count">
                        현재 {txHistory.length}개 트랜잭션 표시 중
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="no-transactions">트랜잭션 내역이 없습니다.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 컨트랙트 조회 */}
      <div className="explorer-section">
        <h3>컨트랙트 조회</h3>
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
            <h4>컨트랙트 정보</h4>
            <p><strong>주소:</strong> {contractInfo.address}</p>
            <p><strong>코드 길이:</strong> {contractInfo.codeLength} bytes</p>
            <p><strong>검증 상태:</strong> {contractInfo.isVerified ? '검증됨' : '미검증'}</p>
            {contractInfo.error && <p className="error">{contractInfo.error}</p>}
            
            {/* 바이트코드 표시 */}
            <div className="contract-section">
              <h4>바이트코드</h4>
              <div className="code-box">
                <div className="code-header">
                  <span>코드 길이: {contractInfo.codeLength} bytes</span>
                  <button 
                    className="copy-button"
                    onClick={() => {
                      navigator.clipboard.writeText(contractInfo.code);
                      alert('바이트코드가 클립보드에 복사되었습니다.');
                    }}
                  >
                    복사
                  </button>
                </div>
                <div className="code-content">
                  <pre>{contractInfo.code}</pre>
                </div>
              </div>
            </div>
            
            {/* ABI 표시 */}
            {contractInfo.abi && (
              <div className="contract-section">
                <h4>ABI</h4>
                <div className="code-box">
                  <div className="code-header">
                    <span>ABI</span>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        if (contractInfo.abi) {
                          navigator.clipboard.writeText(JSON.stringify(contractInfo.abi, null, 2));
                          alert('ABI가 클립보드에 복사되었습니다.');
                        }
                      }}
                    >
                      복사
                    </button>
                  </div>
                  <div className="code-content">
                    <pre>{JSON.stringify(contractInfo.abi, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* 소스코드 표시 */}
            {contractInfo.sourceCode && (
              <div className="contract-section">
                <h4>소스코드</h4>
                <div className="code-box">
                  <div className="code-header">
                    <span>소스코드</span>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        if (contractInfo.sourceCode) {
                          navigator.clipboard.writeText(contractInfo.sourceCode);
                          alert('소스코드가 클립보드에 복사되었습니다.');
                        }
                      }}
                    >
                      복사
                    </button>
                  </div>
                  <div className="code-content">
                    <pre>{contractInfo.sourceCode}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* 생성자 인자 표시 */}
            {contractInfo.constructorArgs && (
              <div className="contract-section">
                <h4>생성자 인자</h4>
                <div className="code-box">
                  <div className="code-header">
                    <span>생성자 인자</span>
                    <button 
                      className="copy-button"
                      onClick={() => {
                        if (contractInfo.constructorArgs) {
                          navigator.clipboard.writeText(contractInfo.constructorArgs);
                          alert('생성자 인자가 클립보드에 복사되었습니다.');
                        }
                      }}
                    >
                      복사
                    </button>
                  </div>
                  <div className="code-content">
                    <pre>{contractInfo.constructorArgs}</pre>
                  </div>
                </div>
              </div>
            )}
            
            {/* 함수 호출 섹션 */}
            {contractInfo.functions && contractInfo.functions.length > 0 && (
              <div className="contract-section">
                <h4>함수 호출</h4>
                <div className="function-call">
                  <select 
                    value={selectedFunction}
                    onChange={(e) => handleFunctionSelect(e.target.value)}
                  >
                    <option value="">함수 선택</option>
                    {contractInfo.functions
                      .filter((func: any) => func.stateMutability === 'view' || func.stateMutability === 'pure')
                      .map((func: any, index: number) => (
                        <option key={index} value={func.name}>
                          {func.name} ({func.inputs?.map((input: any) => input.name).join(', ')})
                        </option>
                      ))}
                  </select>
                  
                  {selectedFunction && contractInfo.abi && (
                    <div className="function-inputs">
                      {contractInfo.abi
                        .find((item: any) => item.type === 'function' && item.name === selectedFunction)
                        ?.inputs?.map((input: any, index: number) => (
                          <div key={index} className="input-group">
                            <label>{input.name} ({input.type}):</label>
                            <input
                              type="text"
                              value={functionInputs[input.name] || ''}
                              onChange={(e) => setFunctionInputs(prev => ({
                                ...prev,
                                [input.name]: e.target.value
                              }))}
                              placeholder={`${input.name} 입력`}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                  
                  <button 
                    onClick={callContractFunction}
                    disabled={!selectedFunction}
                  >
                    호출
                  </button>
                </div>
                {functionResult && (
                  <div className={`code-box ${functionResult.status === 'error' ? 'error-box' : ''}`}>
                    <pre>{JSON.stringify(functionResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
            
            {/* 이벤트 로그 섹션 */}
            {contractInfo.events && contractInfo.events.length > 0 && (
              <div className="contract-section">
                <h4>이벤트 로그</h4>
                <div className="event-logs">
                  <select 
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                  >
                    <option value="">이벤트 선택</option>
                    {contractInfo.events.map((event: any, index: number) => (
                      <option key={index} value={event.name}>
                        {event.name} ({event.inputs?.map((input: any) => input.name).join(', ')})
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={getEventLogs}
                    disabled={!selectedEvent}
                  >
                    조회
                  </button>
                </div>
                {eventLogs.length > 0 && (
                  <div className="code-box">
                    <pre>{JSON.stringify(eventLogs, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorerPage; 