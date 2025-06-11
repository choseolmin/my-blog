import React, { useState, useEffect } from 'react';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="scroll-buttons">
      <button
        className={`scroll-button ${isVisible ? 'visible' : ''}`}
        onClick={scrollToTop}
        title="맨 위로"
      >
        ↑
      </button>
      <button
        className="scroll-button"
        onClick={scrollToBottom}
        title="맨 아래로"
      >
        ↓
      </button>
    </div>
  );
};

export default ScrollToTop; 