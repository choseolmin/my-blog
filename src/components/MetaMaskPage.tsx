import React, { useState } from 'react';
import Web3 from 'web3';

const WALLETS = [
  { name: 'MetaMask', value: 'metamask' },
  { name: 'Rabby', value: 'rabby' },
];

const MetaMaskPage: React.FC = () => {
  const [wallet, setWallet] = useState<string>('metamask');
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [connecting, setConnecting] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');

  const getProvider = () => {
    if (wallet === 'metamask') return window.ethereum;
    if (wallet === 'rabby') return (window as any).rabby;
    return window.ethereum;
  };

  const getWeb3 = () => {
    return new Web3(getProvider());
  };

  const connectWallet = async () => {
    setStatus('');
    setConnecting(true);
    setAccount('');
    setBalance('');
    try {
      const provider = getProvider();
      if (!provider) {
        setStatus(wallet === 'metamask' ? 'MetaMask가 설치되어 있지 않습니다.' : 'Rabby Wallet이 설치되어 있지 않습니다.');
        setConnecting(false);
        return;
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setStatus('지갑에서 계정을 가져오지 못했습니다.');
        setConnecting(false);
        return;
      }

      const account = accounts[0];
      setAccount(account);
      const web3 = getWeb3();
      const bal = await web3.eth.getBalance(account);
      setBalance(web3.utils.fromWei(bal, 'ether'));
      setStatus('지갑이 성공적으로 연결되었습니다.');
    } catch (e: any) {
      console.error(e);
      setStatus('지갑 연결에 실패했습니다.');
    }
    setConnecting(false);
  };

  const sendEther = async () => {
    setStatus('');
    setSending(true);
    setTxHash('');
    try {
      const provider = getProvider();
      if (!provider) {
        setStatus(wallet === 'metamask' ? 'MetaMask가 설치되어 있지 않습니다.' : 'Rabby Wallet이 설치되어 있지 않습니다.');
        setSending(false);
        return;
      }
      if (!Web3.utils.isAddress(toAddress.trim())) {
        setStatus('유효한 받는 사람 주소를 입력하세요.');
        setSending(false);
        return;
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setStatus('유효한 금액을 입력하세요.');
        setSending(false);
        return;
      }
      const web3 = getWeb3();
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const fromAccount = accounts[0];
      const receipt = await web3.eth.sendTransaction({
        from: fromAccount,
        to: toAddress.trim(),
        value: web3.utils.toWei(amount, 'ether'),
      });
      setStatus('이더 전송이 성공적으로 완료되었습니다!');
      setTxHash(receipt.transactionHash);
      const bal = await web3.eth.getBalance(fromAccount);
      setBalance(web3.utils.fromWei(bal, 'ether'));
    } catch (e: any) {
      console.error(e);
      setStatus('이더 전송 실패: ' + (e?.message || '자세한 오류는 콘솔 참고'));
    }
    setSending(false);
  };

  // 버튼 색상 동적 결정
  const buttonColor = wallet === 'rabby' ? '#1976d2' : '#f6851b';

  return (
    <div style={{ maxWidth: 420, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #eee' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="wallet-select" style={{ fontWeight: 700, fontSize: 16 }}>지갑 선택:</label>
        <select
          id="wallet-select"
          value={wallet}
          onChange={e => {
            setWallet(e.target.value);
            setAccount('');
            setBalance('');
            setStatus('');
            setTxHash('');
          }}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 16 }}
        >
          {WALLETS.map(w => (
            <option key={w.value} value={w.value}>{w.name}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        {/* Wallet(지갑) 아이콘 */}
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 12 }}>
          <rect x="2" y="6" width="20" height="14" rx="3" fill="#1976d2"/>
          <rect x="2" y="6" width="20" height="14" rx="3" stroke="#1976d2" strokeWidth="2"/>
          <circle cx="18" cy="13" r="2" fill="#fff"/>
          <rect x="2" y="10" width="20" height="2" fill="#fff"/>
        </svg>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 24 }}>지갑 연동</h2>
      </div>
      <button onClick={connectWallet} disabled={connecting} style={{ width: '100%', padding: 12, borderRadius: 8, background: buttonColor, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', marginBottom: 20 }}>
        {connecting ? '연결 중...' : `${WALLETS.find(w=>w.value===wallet)?.name} 연결`}
      </button>
      {account && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 8 }}><b>지갑 주소:</b> <span style={{ wordBreak: 'break-all' }}>{account}</span></div>
          <div><b>잔액:</b> {balance} KAIA</div>
        </div>
      )}
      {status && <div style={{ color: status.includes('성공') ? '#388e3c' : '#d32f2f', marginBottom: 16, whiteSpace: 'pre-line' }}>{status}</div>}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="받는 사람 주소"
          value={toAddress}
          onChange={e => setToAddress(e.target.value)}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #ddd', fontSize: 16, marginBottom: 10, boxSizing: 'border-box' }}
        />
        <input
          type="number"
          placeholder="금액"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
        />
      </div>
      <button onClick={sendEther} disabled={sending || !account} style={{ width: '100%', padding: 12, borderRadius: 8, background: buttonColor, color: '#fff', fontWeight: 700, fontSize: 16, border: 'none' }}>
        {sending ? '전송 중...' : '카이로스 전송'}
      </button>
      {txHash && (
        <div style={{ marginTop: 18, wordBreak: 'break-all', fontSize: 15 }}>
          <b>트랜잭션 해시:</b> <a href={`https://kairos.kaiascan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2' }}>{txHash}</a>
        </div>
      )}
    </div>
  );
};

export default MetaMaskPage;
