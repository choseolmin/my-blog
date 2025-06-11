import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

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

export default CommentPage; 