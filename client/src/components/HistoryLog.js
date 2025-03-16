import React from 'react';
import './HistoryLog.css';

const HistoryLog = ({ history }) => {
  return (
    <div className="history-log-container">
      <div className="history-log-header">
        <h4>Code Change History</h4>
      </div>
      <div className="history-log-content">
        {history && history.length > 0 ? (
          history.map((entry, index) => (
            <div key={index} className="history-log-entry">
              <div className="history-log-timestamp">{entry.timestamp}</div>
              <div className="history-log-message">
                <strong>{entry.username}</strong> {entry.action}
              </div>
              {entry.codeSnippet && (
                <div className="history-log-code-snippet">
                  <pre>{entry.codeSnippet}</pre>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="history-log-empty">No history yet</div>
        )}
      </div>
    </div>
  );
};

export default HistoryLog;