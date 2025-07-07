import React, { useState } from 'react';
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
      const owner = await contract.methods.ownerOf(tokenId).call();
      setOwner(owner);
      let uri = '';
      let meta = null;
      try {
        uri = await contract.methods.tokenURI(tokenId).call();
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
    } catch (e: any) {
      setError('NFT 보유 정보를 불러오지 못했습니다.');
    }
    setLoading(false);
  };

  return (
    <div className="nft-container">
      <h2>🖼️ NFT 조회 페이지</h2>

      {/* NFT 조회 by Token ID */}
      <div className="nft-form">
        <h3>🔎 토큰 ID로 NFT 조회</h3>
        <input
          type="text"
          placeholder="NFT 컨트랙트 주소"
          value={contractAddress}
          onChange={e => setContractAddress(e.target.value)}
        />
        <input
          type="number"
          placeholder="토큰 ID"
          value={tokenId}
          onChange={e => setTokenId(e.target.value)}
        />
        <button onClick={handleQuery} disabled={loading}>
          {loading ? '조회 중...' : 'NFT 조회'}
        </button>
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
      </div>

      {error && <div className="nft-error">{error}</div>}

      {/* 토큰 ID 조회 결과 */}
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

      {/* 지갑 보유 NFT 개수 */}
      {balance !== null && (
        <div className="nft-result">
          <div><b>{walletAddress}</b> 님이 보유한 NFT: {balance} 개</div>
        </div>
      )}
    </div>
  );
};

export default NFTPage;
