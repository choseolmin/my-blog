import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import './App.css';
import CommentPage from './components/CommentPage';
import ThemeToggle from './components/ThemeToggle';
import WalletPage from './components/WalletPage';
import ScrollToTop from './components/ScrollToTop';
import ExplorerPage from './components/ExplorerPage';
import SmartContractPage from './components/SmartContractPage';
import NFTPage from './components/NFTPage';
import Sidebar from './components/Sidebar';
import MetaMaskPage from './components/MetaMaskPage';
import ERC1155Page from './components/ERC1155Page';
import ERC2612Page from './components/ERC2612Page';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <ThemeToggle />
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/about" replace />} />
            <Route path="/about" element={<CommentPage />} />
            <Route path="/school" element={<CommentPage />} />
            <Route path="/work" element={<CommentPage />} />
            <Route path="/family" element={<CommentPage />} />
            <Route path="/friends" element={<CommentPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/explorer" element={<ExplorerPage />} />
            <Route path="/smart-contract" element={<SmartContractPage />} />
            <Route path="/nft" element={<NFTPage />} />
            <Route path="/metamask" element={<MetaMaskPage />} />
            <Route path="/erc1155" element={<ERC1155Page />} />
            <Route path="/erc2612" element={<ERC2612Page />} />
          </Routes>
          <ScrollToTop />
        </div>
      </div>
    </Router>
  );
};

export default App;
