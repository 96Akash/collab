import React, { useState, useEffect, useRef } from 'react';
import './HistoryLog.css';

const HistoryLog = ({ history }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const logRef = useRef(null);
  const [groupedHistory, setGroupedHistory] = useState({});

  // Group history entries by day
  useEffect(() => {
    if (!history?.length) return;
    
    const grouped = history.reduce((acc, entry) => {
      // Create a date string from the timestamp
      const date = new Date();
      const dateString = date.toLocaleDateString();
      
      if (!acc[dateString]) {
        acc[dateString] = [];
      }
      acc[dateString].push(entry);
      return acc;
    }, {});
    
    setGroupedHistory(grouped);
  }, [history]);

  // Scroll to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [history]);

  const filterHistory = () => {
    if (!history) return [];
    
    return history.filter(entry => {
      // Filter by action type
      const matchesFilter = filter === 'all' || 
                          (filter === 'added' && entry.action === 'added code') ||
                          (filter === 'removed' && entry.action === 'removed code') ||
                          (filter === 'edited' && entry.action === 'edited the code');
      
      // Filter by search term
      const matchesSearch = search === '' || 
                          entry.username.toLowerCase().includes(search.toLowerCase()) ||
                          entry.action.toLowerCase().includes(search.toLowerCase()) ||
                          (entry.codeSnippet && entry.codeSnippet.toLowerCase().includes(search.toLowerCase()));
      
      return matchesFilter && matchesSearch;
    });
  };

  const getActionIcon = (action) => {
    if (action === 'added code') return '➕';
    if (action === 'removed code') return '➖';
    if (action === 'edited the code') return '✏️';
    return '🔄';
  };

  const getActionColor = (action) => {
    if (action === 'added code') return 'text-success';
    if (action === 'removed code') return 'text-danger';
    if (action === 'edited the code') return 'text-warning';
    return 'text-info';
  };

  const formatCodeSnippet = (snippet) => {
    if (!snippet) return '';
    
    const lines = snippet.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('+ ')) {
        return <div key={index} className="added-line">{line}</div>;
      } else if (line.startsWith('- ')) {
        return <div key={index} className="removed-line">{line}</div>;
      }
      return <div key={index}>{line}</div>;
    });
  };

  const handleEntryClick = (entry) => {
    setSelectedEntry(selectedEntry === entry ? null : entry);
  };

  const filteredHistory = filterHistory();

  return (
    <div className="history-log">
      <div className="history-header">
        <h3>Code History</h3>
        <div className="history-controls">
          <div className="filter-group">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="form-select form-select-sm"
            >
              <option value="all">All Actions</option>
              <option value="added">Added Code</option>
              <option value="removed">Removed Code</option>
              <option value="edited">Edited Code</option>
            </select>
          </div>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control form-control-sm"
            />
          </div>
        </div>
      </div>

      <div className="history-content" ref={logRef}>
        {filteredHistory.length === 0 ? (
          <div className="no-history">No history entries found</div>
        ) : (
          filteredHistory.map((entry, index) => (
            <div 
              key={index} 
              className={`history-entry ${selectedEntry === entry ? 'selected' : ''}`}
              onClick={() => handleEntryClick(entry)}
            >
              <div className="entry-header">
                <span className="entry-icon">{getActionIcon(entry.action)}</span>
                <span className={`entry-action ${getActionColor(entry.action)}`}>{entry.action}</span>
                <span className="entry-username">{entry.username}</span>
                <span className="entry-time">{entry.timestamp}</span>
              </div>
              {selectedEntry === entry && (
                <div className="entry-details">
                  <div className="code-snippet">
                    {formatCodeSnippet(entry.codeSnippet)}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryLog;