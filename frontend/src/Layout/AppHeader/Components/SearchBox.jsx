import React, { useState } from 'react';

export default function SearchBox() {
  const [keyword, setKeyword] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && keyword.trim()) {
      // Có thể mở rộng tìm kiếm toàn hệ thống
      console.log('Search query:', keyword);
    }
  };

  return (
    <div className="apple-header-search-container">
      <div className="apple-header-search-wrapper">
        <span className="search-icon-svg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </span>
        <input
          type="text"
          className="apple-header-search-input"
          placeholder="Tìm học sinh, lớp, thực đơn..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {keyword && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => setKeyword('')}
            aria-label="Xóa tìm kiếm"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
