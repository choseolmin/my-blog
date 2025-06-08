import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import './App.css';

const ThemeToggle: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <button 
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {isDarkMode ? (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
        </svg>
      )}
    </button>
  );
};

const ScrollToTop: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '40px', 
      right: '40px', 
      display: 'flex', 
      flexDirection: 'column',
      gap: '20px',
      zIndex: 1000
    }}>
      <button 
        onClick={scrollToTop} 
        style={{ 
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          border: '3px solid #2E7D32',
          backgroundColor: '#4CAF50',
          color: 'white',
          fontSize: '32px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#45a049';
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#4CAF50';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }}
      >
        ↑
      </button>
      <button 
        onClick={scrollToBottom}
        style={{ 
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          border: '3px solid #2E7D32',
          backgroundColor: '#4CAF50',
          color: 'white',
          fontSize: '32px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#45a049';
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#4CAF50';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }}
      >
        ↓
      </button>
    </div>
  );
};

const CommentPage: React.FC = () => {
  const [comments, setComments] = useState<Array<{text: string, timestamp: string}>>([]);
  const [input, setInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const location = useLocation();

  useEffect(() => {
    const storedComments = localStorage.getItem(`comments-${location.pathname}`);
    if (storedComments) {
      try {
        const parsedComments = JSON.parse(storedComments);
        // 기존 데이터 형식 마이그레이션
        const migratedComments = Array.isArray(parsedComments) 
          ? parsedComments.map(comment => 
              typeof comment === 'string' 
                ? { 
                    text: comment, 
                    timestamp: new Date().toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })
                  }
                : comment
            )
          : [];
        setComments(migratedComments);
        // 마이그레이션된 데이터 저장
        if (migratedComments.length > 0) {
          localStorage.setItem(`comments-${location.pathname}`, JSON.stringify(migratedComments));
        }
      } catch (error) {
        console.error('Error parsing comments:', error);
        setComments([]);
      }
    } else {
      setComments([]);
    }
  }, [location.pathname]);

  const saveComments = (newComments: Array<{text: string, timestamp: string}>) => {
    localStorage.setItem(`comments-${location.pathname}`, JSON.stringify(newComments));
  };

  const addComment = () => {
    if (input.trim() === "") return;

    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const newComments = [...comments, { text: input.trim(), timestamp }];
    setComments(newComments);
    saveComments(newComments);
    setInput("");
  };

  const deleteComment = (index: number) => {
    const newComments = comments.filter((_, i) => i !== index);
    setComments(newComments);
    saveComments(newComments);
  };

  const filteredComments = comments.filter(comment => 
    comment && comment.text && comment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="blog-container">
      {location.pathname === '/about' ? (
        <>
          <h2 className="about-title">대나무 숲 블로그</h2>
          <div className="about-image">
            <img src="https://t4.ftcdn.net/jpg/02/96/25/53/360_F_296255302_5Ukto7ViJj9SCNTyoUpfyw5b2mGzEusA.jpg" alt="대나무 이미지" />
          </div>
          <div className="about-description">
            <p>이 블로그는 대나무 숲 블로그로 누구나, 어떤 주제로든 글을 작성 할 수 있습니다.<br />또 누구나 작성한 글을 수정 및 삭제 할 수 있습니다.<br />사이트에는 작성한 사람의 어떠한 신상정보도 기록 되지 않으므로 편하게 작성 해주셔도 됩니다.</p>
            <p>제작자 문의 이메일: <a href="mailto:josm100@naver.com">josm100@naver.com</a></p>
          </div>
        </>
      ) : (
        <>
          <h2>대나무 숲 블로그의 {location.pathname === '/school' ? '학교' :
            location.pathname === '/work' ? '직장' :
            location.pathname === '/family' ? '가족' :
            location.pathname === '/friends' ? '친구' :
            location.pathname === '/lover' ? '연인' : ''} 입니다.<br />
            {location.pathname === '/school' ? '학교' :
            location.pathname === '/work' ? '직장' :
            location.pathname === '/family' ? '가족' :
            location.pathname === '/friends' ? '친구' :
            location.pathname === '/lover' ? '연인' : ''}에 대해 자유롭게 이야기 해주세요.</h2>
          <div className="search-container">
            <input
              type="text"
              placeholder="댓글 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery("")}
                title="검색어 지우기"
              >
                ×
              </button>
            )}
          </div>
          <div className="comment-form">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="댓글을 입력하세요..."
            />
            <button onClick={addComment}>댓글 작성</button>
          </div>
          <div className="comments">
            {filteredComments.map((comment, index) => (
              <div key={index} className="comment">
                <div className="comment-content">
                  <span className="comment-text">{comment.text}</span>
                  <span className="comment-time">{comment.timestamp}</span>
                </div>
                <button onClick={() => deleteComment(index)}>삭제</button>
              </div>
            ))}
            {filteredComments.length === 0 && searchQuery && (
              <div className="no-results">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </>
      )}
      <footer>
        ⓒ 2025 대나무 숲 블로그 · 만든이: 조설민
      </footer>
      <ScrollToTop />
    </div>
  );
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      ),
      label: '소개',
      path: '/about'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>
        </svg>
      ),
      label: '학교',
      path: '/school'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
        </svg>
      ),
      label: '직장',
      path: '/work'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05.02.01.03.03.04 1.14.84 1.97 1.97 1.97 3.41V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
      label: '가족',
      path: '/family'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05.02.01.03.03.04 1.14.84 1.97 1.97 1.97 3.41V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
      label: '친구',
      path: '/friends'
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      label: '연인',
      path: '/lover'
    }
  ];

  return (
    <div className="sidebar">
      {menuItems.map((item, index) => (
        <button
          key={index}
          className={`sidebar-button ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="app-container">
        <ThemeToggle />
        <Sidebar />
        <Routes>
          <Route path="/" element={<Navigate to="/about" replace />} />
          <Route path="/about" element={<CommentPage />} />
          <Route path="/school" element={<CommentPage />} />
          <Route path="/work" element={<CommentPage />} />
          <Route path="/family" element={<CommentPage />} />
          <Route path="/friends" element={<CommentPage />} />
          <Route path="/lover" element={<CommentPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
