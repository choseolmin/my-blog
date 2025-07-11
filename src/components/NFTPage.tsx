import React, { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import './NFTPage.css';

const ERC721_ABI = [
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'transferFrom',
    outputs: [],
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' }
    ],
    name: 'Transfer',
    type: 'event'
  },
];

const NFTPage: React.FC = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [owner, setOwner] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownedTokens, setOwnedTokens] = useState<{ tokenId: string, tokenURI: string, image?: string }[]>([]);
  const [transferTokenId, setTransferTokenId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferResult, setTransferResult] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const contractRef = useRef<any>(null);

  // WebSocketProvider로 contractRef 생성 (이벤트 리스닝용)
  useEffect(() => {
    const wsProvider = new Web3.providers.WebsocketProvider('wss://base-sepolia.infura.io/ws/v3/b7497c1d6ddf4d94a13ca50026bc2f93');
    if (Web3.utils.isAddress(contractAddress.trim())) {
      const web3ws = new Web3(wsProvider);
      contractRef.current = new web3ws.eth.Contract(ERC721_ABI as any, contractAddress.trim());
    } else {
      contractRef.current = null;
    }
    return () => {
      wsProvider.disconnect();
    };
  }, [contractAddress]);

  // transfer 이벤트 리스닝 (컨트랙트 주소, 토큰ID, 지갑주소 변경 시마다)
  useEffect(() => {
    if (!contractRef.current) return;
    const contract = contractRef.current;
    // 토큰ID 조회용 이벤트
    let tokenIdListener: any;
    if (tokenId) {
      tokenIdListener = contract.events.Transfer({ filter: { tokenId: Number(tokenId) } })
        .on('data', () => {
          handleQuery(); // 토큰ID 조회 자동 갱신
        });
    }
    // 지갑주소 조회용 이벤트
    let walletListener: any;
    if (walletAddress) {
      walletListener = contract.events.Transfer({ filter: { to: walletAddress } })
        .on('data', () => {
          handleQueryByWallet(); // 지갑주소로 들어오는 NFT 실시간 반영
        });
    }
    return () => {
      if (tokenIdListener && tokenIdListener.unsubscribe) tokenIdListener.unsubscribe();
      if (walletListener && walletListener.unsubscribe) walletListener.unsubscribe();
    };
  }, [contractAddress, tokenId, walletAddress]);

  const handleQuery = async () => {
    setError('');
    setOwner('');
    setTokenURI('');
    setMetadata(null);
    if (!window.ethereum) {
      setError('MetaMask가 설치되어 있지 않습니다.');
      return;
    }
    if (!Web3.utils.isAddress(contractAddress.trim())) {
      setError('유효한 컨트랙트 주소를 입력하세요.');
      return;
    }
    if (!tokenId || isNaN(Number(tokenId))) {
      setError('유효한 토큰 ID를 입력하세요.');
      return;
    }
    setLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(ERC721_ABI as any, contractAddress.trim());
      const owner = await contract.methods.ownerOf(Number(tokenId)).call();
      setOwner(owner);
      let uri = '';
      let meta = null;
      try {
        uri = await contract.methods.tokenURI(Number(tokenId)).call();
        setTokenURI(uri);
        // IPFS 변환
        let fetchUrl = uri;
        if (uri.startsWith('ipfs://')) {
          fetchUrl = 'https://ipfs.io/ipfs/' + uri.replace('ipfs://', '');
        }
        // CORS 프록시 적용 (임시)
        fetchUrl = 'https://corsproxy.io/?url=' + encodeURIComponent(fetchUrl);
        // 메타데이터 fetch
        const res = await fetch(fetchUrl);
        if (res.ok) {
          meta = await res.json();
          setMetadata(meta);
        } else {
          setMetadata({ error: '메타데이터를 불러오지 못했습니다.' });
        }
      } catch (e) {
        setTokenURI('지원되지 않음');
        setMetadata(null);
      }
    } catch (e: any) {
      setError('NFT 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
  };

  const handleQueryByWallet = async () => {
    setError('');
    setBalance(null);
    setOwnedTokens([]);
    if (!window.ethereum) {
      setError('MetaMask가 설치되어 있지 않습니다.');
      return;
    }
    if (!Web3.utils.isAddress(contractAddress) || !Web3.utils.isAddress(walletAddress)) {
      setError('유효한 컨트랙트 주소와 지갑 주소를 입력하세요.');
      return;
    }

    setLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(ERC721_ABI as any, contractAddress);
      const balance = await contract.methods.balanceOf(walletAddress).call();
      setBalance(Number(balance));
      // tokenId 목록 추정: 일반적으로 ERC-721은 tokenOfOwnerByIndex 함수가 필요하지만, 표준 ABI에 없음
      // 대부분의 표준 컨트랙트는 tokenOfOwnerByIndex를 구현함
      // ABI에 추가 시도
      const tokenOfOwnerByIndexABI = {
        constant: true,
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'index', type: 'uint256' }
        ],
        name: 'tokenOfOwnerByIndex',
        outputs: [{ name: 'tokenId', type: 'uint256' }],
        type: 'function',
      };
      const contractWithIndex = new web3.eth.Contract([...ERC721_ABI, tokenOfOwnerByIndexABI] as any, contractAddress);
      const tokens: { tokenId: string, tokenURI: string, image?: string }[] = [];
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await contractWithIndex.methods.tokenOfOwnerByIndex(walletAddress, i).call();
          let uri = '';
          let image = undefined;
          try {
            uri = await contract.methods.tokenURI(Number(tokenId)).call();
            // 메타데이터에서 image 추출
            let fetchUrl = uri;
            if (uri.startsWith('ipfs://')) {
              fetchUrl = 'https://ipfs.io/ipfs/' + uri.replace('ipfs://', '');
            }
            fetchUrl = 'https://corsproxy.io/?url=' + encodeURIComponent(fetchUrl);
            const res = await fetch(fetchUrl);
            if (res.ok) {
              const meta = await res.json();
              if (meta && meta.image) {
                image = meta.image.startsWith('ipfs://')
                  ? `https://ipfs.io/ipfs/${meta.image.replace('ipfs://', '')}`
                  : meta.image;
              }
            }
          } catch (e) {
            uri = '지원되지 않음';
          }
          tokens.push({ tokenId, tokenURI: uri, image });
        } catch (e) {
          // tokenOfOwnerByIndex 미지원 시 break
          break;
        }
      }
      setOwnedTokens(tokens);
    } catch (e: any) {
      setError('NFT 보유 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
  };

  // NFT 전송 함수: MetaMask 연동 방식으로 복원
  const handleTransfer = async () => {
    setError('');
    setTransferResult(null);
    setIsTransferring(true);
    if (!window.ethereum) {
      setError('MetaMask가 설치되어 있지 않습니다.');
      setIsTransferring(false);
      return;
    }
    if (!Web3.utils.isAddress(contractAddress.trim())) {
      setError('유효한 컨트랙트 주소를 입력하세요.');
      setIsTransferring(false);
      return;
    }
    if (!transferTokenId || isNaN(Number(transferTokenId))) {
      setError('유효한 토큰 ID를 입력하세요.');
      setIsTransferring(false);
      return;
    }
    if (!Web3.utils.isAddress(transferTo.trim())) {
      setError('유효한 받는 사람 주소를 입력하세요.');
      setIsTransferring(false);
      return;
    }
    setLoading(true);
    try {
      const web3 = new Web3(window.ethereum);
      // 현재 계정 가져오기
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      const contract = new web3.eth.Contract(ERC721_ABI as any, contractAddress.trim());
      // transferFrom(from, to, tokenId)
      await contract.methods.transferFrom(from, transferTo.trim(), Number(transferTokenId)).send({ from });
      setTransferResult('NFT 전송이 성공적으로 완료되었습니다!');
      // 전송 후 자동 갱신
      handleQuery();
      handleQueryByWallet();
    } catch (e: any) {
      console.error('🔥 전송 실패:', e);
      setError(`NFT 전송 실패: ${e?.message || '자세한 오류는 콘솔 참고'}`);
    }
    setLoading(false);
    setIsTransferring(false);
  };

  return (
    <div className="nft-container">
      <h2>🖼️ NFT 조회 페이지</h2>
      {/* NFT 컨트랙트 주소 입력창 - 페이지 상단에 고정 */}
      <input
        type="text"
        placeholder="NFT 컨트랙트 주소"
        value={contractAddress}
        onChange={e => setContractAddress(e.target.value)}
        style={{ width: '100%', marginBottom: 20, padding: 12, borderRadius: 8, border: '1.5px solid #ddd', fontSize: 16 }}
      />

      {/* NFT 조회 by Token ID */}
      <div className="nft-form">
        <h3>🔎 토큰 ID로 NFT 조회</h3>
        {/* 컨트랙트 주소 입력창 제거됨 */}
        <input
          type="number"
          placeholder="토큰 ID"
          value={tokenId}
          onChange={e => setTokenId(e.target.value)}
        />
        <button onClick={handleQuery} disabled={loading}>
          {loading ? '조회 중...' : 'NFT 조회'}
        </button>
        {/* 토큰 ID 조회 결과 */}
        {error && owner === '' && (
          <div className="nft-error">{error}</div>
        )}
        {owner && (
          <div className="nft-result">
            <div><b>소유자:</b> {owner}</div>
            <div><b>Token URI:</b> {tokenURI || '없음'}</div>
            {/* 메타데이터 이미지 */}
            {metadata && metadata.image && (
              <img className="nft-image" src={metadata.image.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${metadata.image.replace('ipfs://', '')}` : metadata.image} alt="NFT 미리보기" />
            )}
            {/* tokenURI가 이미지 파일이면 바로 미리보기 */}
            {!metadata && tokenURI && /\.(png|jpg|jpeg|gif|webp)$/i.test(tokenURI) && (
              <img className="nft-image" src={tokenURI.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}` : tokenURI} alt="NFT 이미지" />
            )}
            {metadata && (
              <div style={{width: '100%', marginTop: 12, textAlign: 'left'}}>
                <b>메타데이터:</b>
                <pre style={{background:'#f4f4f4', borderRadius:8, padding:12, fontSize:13, overflowX:'auto'}}>{JSON.stringify(metadata, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NFT 조회 by Wallet Address */}
      <div className="nft-form">
        <h3>👛 지갑 주소로 NFT 조회</h3>
        <input
          type="text"
          placeholder="지갑 주소"
          value={walletAddress}
          onChange={e => setWalletAddress(e.target.value)}
        />
        <button onClick={handleQueryByWallet} disabled={loading}>
          {loading ? '조회 중...' : '보유 NFT 조회'}
        </button>
        {/* 지갑 보유 NFT 개수 및 보유 토큰 목록 */}
        {error && balance === null && (
          <div className="nft-error">{error}</div>
        )}
        {balance !== null && (
          <div className="nft-result">
            <div><b>{walletAddress}</b> 님이 보유한 NFT: {balance} 개</div>
            {ownedTokens.length > 0 && (
              <div style={{width:'100%', marginTop:12}}>
                <b>보유 토큰 목록:</b>
                <ul style={{paddingLeft:18, marginTop:8}}>
                  {ownedTokens.map(t => (
                    <li key={t.tokenId} style={{marginBottom:16}}>
                      Token ID: <b>{t.tokenId}</b><br/>
                      Token URI: <a href={t.tokenURI} target="_blank" rel="noopener noreferrer">{t.tokenURI}</a><br/>
                      {t.image && (
                        <img className="nft-image" src={t.image} alt="NFT 미리보기" style={{marginTop:6, maxWidth:120, maxHeight:120, borderRadius:8, border:'1px solid #eee'}} />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NFT 전송 기능 */}
      <div className="nft-form" style={{marginTop:32}}>
        <h3>📤 NFT 전송</h3>
        <input
          type="number"
          placeholder="전송할 토큰 ID"
          value={transferTokenId}
          onChange={e => setTransferTokenId(e.target.value)}
        />
        <input
          type="text"
          placeholder="받는 사람(상대방) 주소"
          value={transferTo}
          onChange={e => setTransferTo(e.target.value)}
        />
        <button onClick={handleTransfer} disabled={loading || isTransferring}>
          {isTransferring ? '전송 중...' : 'NFT 전송'}
        </button>
        {/* 전송 결과/에러 */}
        {error && transferResult === null && (
          <div className="nft-error">{error}</div>
        )}
        {transferResult && <div style={{color:'#388e3c', marginTop:10, fontWeight:'bold', wordBreak:'break-all'}}>{transferResult}</div>}
      </div>
    </div>
  );
};

export default NFTPage;
