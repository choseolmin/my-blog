import React, { useState } from 'react';
import { ethers } from 'ethers';
import Web3 from 'web3';

const ABI: any[] = [ /* 생략 - 네가 쓴 ABI 그대로 사용 */ ];

const ERC2612Page: React.FC = () => {
  const [form, setForm] = useState({
    contractAddress: '',
    amount: '',
    feePayer: '',
    feePayerPk: '',
    to: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | React.ReactNode>('');
  const [error, setError] = useState('');
  const [debug, setDebug] = useState<React.ReactNode>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSend = async () => {
    setError('');
    setResult('');
    setLoading(true);
    try {
      const { ethereum } = window as any;
      if (!ethereum) throw new Error('메타마스크 필요');
      await ethereum.request({ method: 'eth_requestAccounts' });
      const [owner]: string[] = await ethereum.request({ method: 'eth_accounts' });

      const { contractAddress, feePayer, feePayerPk, to, amount } = form;
      if (![contractAddress, feePayer, to].every(addr => ethers.utils.isAddress(addr))) {
        throw new Error('주소 올바르게 입력하세요.');
      }
      if (!amount || isNaN(Number(amount))) throw new Error('숫자 잘못됨');

      let privKey = feePayerPk.trim();
      if (!privKey.startsWith('0x')) privKey = '0x' + privKey;

      const provider = new ethers.providers.JsonRpcProvider('https://kaia.blockpi.network/v1/rpc/public');
      const web3 = new Web3('https://kaia.blockpi.network/v1/rpc/public');
      const contract = new ethers.Contract(contractAddress, ABI, provider);
      const web3Contract = new web3.eth.Contract(ABI, contractAddress);

      const [name, version, network, nonce] = await Promise.all([
        contract.name(),
        contract.version ? contract.version() : '1',
        provider.getNetwork(),
        contract.nonces(owner),
      ]);
      const chainId: number = network.chainId;
      const deadline = Math.floor(Date.now() / 1000) + 600;
      const value = ethers.utils.parseUnits(amount, 18);

      const domain = { name, version, chainId, verifyingContract: contractAddress };
      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      };
      const message = { owner, spender: feePayer, value: value.toString(), nonce: nonce.toNumber(), deadline };
      const signature = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [owner, JSON.stringify({ domain, types, primaryType: 'Permit', message })],
      });
      const sig = ethers.utils.splitSignature(signature);

      const allowance = await contract.allowance(owner, feePayer);
      const balance = await contract.balanceOf(owner);

      setDebug(
        <div style={{ fontSize: 13 }}>
          <div>owner: {owner}</div>
          <div>spender: {feePayer}</div>
          <div>to: {to}</div>
          <div>value: {ethers.utils.formatUnits(value, 18)}</div>
          <div>nonce: {nonce.toString()}</div>
          <div>deadline: {deadline}</div>
          <div>chainId: {chainId}</div>
          <div>name: {name}</div>
          <div>version: {version}</div>
          <div>permit sig: v={sig.v}, r={sig.r}, s={sig.s}</div>
          <div>allowance: {ethers.utils.formatUnits(allowance, 18)}</div>
          <div>balance: {ethers.utils.formatUnits(balance, 18)}</div>
        </div>
      );

      const permitData = web3Contract.methods.permit(owner, feePayer, value.toString(), deadline, sig.v, sig.r, sig.s).encodeABI();
      const signedPermit = await web3.eth.accounts.signTransaction({
        to: contractAddress,
        data: permitData,
        gas: 200000,
      }, privKey);
      const permitReceipt = await web3.eth.sendSignedTransaction(signedPermit.rawTransaction!);

      const transferData = web3Contract.methods.transferFrom(owner, to, value.toString()).encodeABI();
      const signedTransfer = await web3.eth.accounts.signTransaction({
        to: contractAddress,
        data: transferData,
        gas: 200000,
      }, privKey);
      const transferReceipt = await web3.eth.sendSignedTransaction(signedTransfer.rawTransaction!);

      setResult(
        <>
          <div>Permit Tx: <a href={`https://kairos.kaiascan.io/tx/${permitReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{permitReceipt.transactionHash}</a></div>
          <div>TransferFrom Tx: <a href={`https://kairos.kaiascan.io/tx/${transferReceipt.transactionHash}`} target="_blank" rel="noopener noreferrer">{transferReceipt.transactionHash}</a></div>
        </>
      );
    } catch (e: any) {
      setError(e.message || e.reason || 'Unknown Error');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16 }}>
      <h2>ERC2612 (Permit) 대시보드</h2>
      {['contractAddress', 'amount', 'feePayer', 'feePayerPk', 'to'].map((field) => (
        <div key={field} style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600 }}>{field}</label>
          <input
            type={field.includes('Pk') ? 'password' : 'text'}
            name={field}
            value={(form as any)[field]}
            onChange={handleChange}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          />
        </div>
      ))}
      <button onClick={handleSend} disabled={loading} style={{ width: '100%', padding: 12, background: '#1976d2', color: '#fff', fontWeight: 700 }}>
        {loading ? '진행 중...' : '전송'}
      </button>
      {result && <div style={{ marginTop: 16 }}>{result}</div>}
      {error && <div style={{ marginTop: 16, color: 'red' }}>{error}</div>}
      {debug && <div style={{ marginTop: 16 }}>{debug}</div>}
    </div>
  );
};

export default ERC2612Page;
