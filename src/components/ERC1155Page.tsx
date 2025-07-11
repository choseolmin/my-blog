import React, { useState } from 'react';
import Web3 from 'web3';

const ERC1155_ABI: any[] = [
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" },
      { "internalType": "uint256", "name": "id", "type": "uint256" }
    ],
    "name": "balanceOf",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address[]", "name": "accounts", "type": "address[]" },
      { "internalType": "uint256[]", "name": "ids", "type": "uint256[]" }
    ],
    "name": "balanceOfBatch",
    "outputs": [ { "internalType": "uint256[]", "name": "", "type": "uint256[]" } ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "data", "type": "bytes" }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const ERC1155Page: React.FC = () => {
  // 공통
  const [contractAddress, setContractAddress] = useState('');
  const [error, setError] = useState('');

  // 1. 토큰ID+지갑주소 balanceOf (메타데이터 조회로 변경)
  // 메타데이터 조회용
  const [metaTokenId, setMetaTokenId] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState('');
  const [metaData, setMetaData] = useState<any>(null);
  const [metaUri, setMetaUri] = useState('');

  // 2. 지갑주소로 여러 토큰ID balanceOfBatch
  const [batchOwner, setBatchOwner] = useState('');
  const [batchTokenIds, setBatchTokenIds] = useState('');
  const [batchResult, setBatchResult] = useState<{id:number, amount:string}[]|null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // 3. 전송
  const [sendTokenId, setSendTokenId] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [txHash, setTxHash] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Web3 인스턴스 (조회는 RPC, 전송은 지갑)
  const rpcWeb3 = new Web3('https://public-en-kairos.node.kaia.io');

  // 1. 토큰ID로 메타데이터 조회
  const handleMeta = async () => {
    setMetaError(''); setMetaData(null); setMetaUri('');
    if (!Web3.utils.isAddress(contractAddress) || !metaTokenId) {
      setMetaError('컨트랙트 주소와 토큰ID를 올바르게 입력하세요.');
      return;
    }
    setMetaLoading(true);
    try {
      const contract = new rpcWeb3.eth.Contract([
        { "inputs": [ { "internalType": "uint256", "name": "id", "type": "uint256" } ], "name": "uri", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }
      ], contractAddress);
      let uri = await contract.methods.uri(metaTokenId).call();
      // {id} 치환
      if (uri.includes('{id}')) {
        uri = uri.replace('{id}', String(metaTokenId));
      }
      setMetaUri(uri);
      if (uri.startsWith('ipfs://')) uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      const res = await fetch(uri);
      if (!res.ok) throw new Error('메타데이터를 불러올 수 없습니다.');
      const json = await res.json();
      setMetaData(json);
    } catch (e:any) {
      setMetaError('메타데이터 조회 실패: ' + (e?.message || ''));
    }
    setMetaLoading(false);
  };

  // 2. balanceOfBatch
  const handleBatch = async () => {
    setError(''); setBatchResult(null);
    if (!Web3.utils.isAddress(contractAddress) || !Web3.utils.isAddress(batchOwner) || !batchTokenIds) {
      setError('컨트랙트, 지갑주소, 토큰ID(쉼표구분)를 모두 입력하세요.');
      return;
    }
    setLoadingBatch(true);
    try {
      const ids = batchTokenIds.split(',').map(s=>s.trim()).filter(Boolean).map(Number);
      const owners = Array(ids.length).fill(batchOwner);
      const contract = new rpcWeb3.eth.Contract(ERC1155_ABI, contractAddress);
      const amounts = await contract.methods.balanceOfBatch(owners, ids).call();
      setBatchResult(ids.map((id, i) => ({id, amount: amounts[i]})));
    } catch (e:any) {
      setError('조회 실패: ' + (e?.message || ''));
    }
    setLoadingBatch(false);
  };

  // 3. 전송
  const handleSend = async () => {
    setSendError(''); setTxHash('');
    if (!window.ethereum) {
      setSendError('메타마스크 등 이더리움 지갑이 필요합니다.');
      return;
    }
    if (!Web3.utils.isAddress(contractAddress) || !Web3.utils.isAddress(sendTo) || !sendTokenId || !sendAmount) {
      setSendError('컨트랙트, 받는사람주소, 토큰ID, 수량을 모두 입력하세요.');
      return;
    }
    setSending(true);
    try {
      const web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];
      const contract = new web3.eth.Contract(ERC1155_ABI, contractAddress);
      const tx = await contract.methods.safeTransferFrom(
        from,
        sendTo,
        Number(sendTokenId),
        Number(sendAmount),
        '0x'
      ).send({ from });
      setTxHash(tx.transactionHash);
    } catch (e:any) {
      setSendError('전송 실패: ' + (e?.message || ''));
    }
    setSending(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 12 }}>
          <path d="M6.92 5H5.14c-.27 0-.5.18-.56.44L3.5 12h2.84l.58-6.56zM19.5 12h-2.84l-.58 6.56h1.78c.27 0 .5-.18.56-.44L19.5 12z" fill="#d32f2f"/>
          <path d="M12 2L8.5 8.5L12 15l3.5-6.5L12 2z" fill="#d32f2f"/>
          <path d="M12 15l-3.5 6.5h7L12 15z" fill="#b71c1c"/>
        </svg>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24 }}>ERC1155 조회/전송</h2>
      </div>
      {/* 컨트랙트 주소 */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600 }}>컨트랙트 주소</label>
        <input type="text" value={contractAddress} onChange={e=>setContractAddress(e.target.value)} placeholder="0x..." style={{ width:'100%', padding:12, borderRadius:8, border:'1.5px solid #ddd', fontSize:16, marginTop:4 }} />
      </div>
      {/* 1. 토큰ID로 메타데이터 조회 */}
      <div style={{ marginBottom: 32, borderBottom:'1px solid #eee', paddingBottom:24 }}>
        <h3 style={{ fontSize:18, margin:'12px 0 8px 0', color:'#d32f2f' }}>토큰ID로 메타데이터 조회</h3>
        <input type="text" value={metaTokenId} onChange={e=>setMetaTokenId(e.target.value)} placeholder="토큰ID (숫자)" style={{ width:'100%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15 }} />
        <button onClick={handleMeta} disabled={metaLoading} style={{ width:'100%', marginTop:10, padding:10, borderRadius:8, background:'#d32f2f', color:'#fff', fontWeight:700, fontSize:16, border:'none' }}>{metaLoading ? '조회 중...' : '토큰 메타데이터 보기'}</button>
        {metaError && <div style={{ color:'#d32f2f', marginTop:8 }}>{metaError}</div>}
        {metaUri && <div style={{ marginTop:8, fontSize:14 }}><b>토큰 URI:</b> <a href={metaUri.startsWith('ipfs://') ? metaUri.replace('ipfs://', 'https://ipfs.io/ipfs/') : metaUri} target="_blank" rel="noopener noreferrer" style={{ color:'#1976d2' }}>{metaUri}</a></div>}
        {metaData && (
          <div style={{ marginTop:16 }}>
            <h4 style={{ marginBottom:8, color:'#d32f2f' }}>메타데이터</h4>
            <div style={{ background:'#f5f5f5', padding:16, borderRadius:8 }}>
              <pre style={{ margin:0, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{JSON.stringify(metaData, null, 2)}</pre>
            </div>
            {metaData.image && (
              <div style={{ marginTop:16 }}>
                <h5 style={{ marginBottom:8 }}>이미지:</h5>
                <img src={metaData.image.startsWith('ipfs://') ? metaData.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : metaData.image} alt="Token" style={{ maxWidth:'100%', maxHeight:300, borderRadius:8 }} onError={e=>{e.currentTarget.style.display='none';}} />
              </div>
            )}
          </div>
        )}
      </div>
      {/* 2. 지갑주소로 여러 토큰ID balanceOfBatch */}
      <div style={{ marginBottom: 32, borderBottom:'1px solid #eee', paddingBottom:24 }}>
        <h3 style={{ fontSize:18, margin:'12px 0 8px 0', color:'#d32f2f' }}>지갑주소로 조회</h3>
        <input type="text" value={batchOwner} onChange={e=>setBatchOwner(e.target.value)} placeholder="지갑주소" style={{ width:'100%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15, marginBottom:8 }} />
        <input type="text" value={batchTokenIds} onChange={e=>setBatchTokenIds(e.target.value)} placeholder="토큰ID 목록 (예: 1,2,3)" style={{ width:'100%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15 }} />
        <button onClick={handleBatch} disabled={loadingBatch} style={{ width:'100%', marginTop:10, padding:10, borderRadius:8, background:'#d32f2f', color:'#fff', fontWeight:700, fontSize:16, border:'none' }}>{loadingBatch ? '조회 중...' : '조회'}</button>
        {batchResult && (
          <div style={{ marginTop:10 }}>
            <b>보유 토큰:</b>
            <ul style={{ margin:'8px 0 0 0', padding:0, listStyle:'none' }}>
              {batchResult.map(r => <li key={r.id}>ID: {r.id} / 수량: {r.amount}</li>)}
            </ul>
          </div>
        )}
      </div>
      {/* 3. 전송 */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize:18, margin:'12px 0 8px 0', color:'#d32f2f' }}>토큰 전송</h3>
        <input type="text" value={sendTokenId} onChange={e=>setSendTokenId(e.target.value)} placeholder="토큰ID (숫자)" style={{ width:'32%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15, marginRight:'2%' }} />
        <input type="text" value={sendAmount} onChange={e=>setSendAmount(e.target.value)} placeholder="수량" style={{ width:'32%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15, marginRight:'2%' }} />
        <input type="text" value={sendTo} onChange={e=>setSendTo(e.target.value)} placeholder="받는사람 주소" style={{ width:'32%', padding:10, borderRadius:8, border:'1.5px solid #ddd', fontSize:15 }} />
        <button onClick={handleSend} disabled={sending} style={{ width:'100%', marginTop:10, padding:10, borderRadius:8, background:'#d32f2f', color:'#fff', fontWeight:700, fontSize:16, border:'none' }}>{sending ? '전송 중...' : '전송'}</button>
        {txHash && <div style={{ marginTop:10 }}><b>트랜잭션 해시:</b> <a href={`https://kairos.kaiascan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color:'#1976d2' }}>{txHash}</a></div>}
        {sendError && <div style={{ color:'#d32f2f', marginTop:8 }}>{sendError}</div>}
      </div>
      {/* 에러 */}
      {error && <div style={{ color:'#d32f2f', marginTop:8 }}>{error}</div>}
    </div>
  );
};

export default ERC1155Page; 