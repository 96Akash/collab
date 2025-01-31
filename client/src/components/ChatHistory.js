import React from 'react';
import './ChatHistory.css';
import ReactMarkdown from 'react-markdown';
import userIcon from '../img/profile.png'; // Add the path to your user icon image
import aiIcon from '../img/chatbot.png';     // Add the path to your AI icon image

const ChatHistory = ({ chatHistory }) => {
  return (
    <div className="chat-container">
      {chatHistory.map((message, index) => (
        <div
          key={index}
          className={`chat-message ${
            message.type === 'user' ? 'chat-user' : 'chat-bot'
          }`}
        >
          <div className="icon-container">
            <img
              src={message.type === 'user' ? userIcon : aiIcon}
              alt={message.type === 'user' ? 'User' : 'AI'}
              className="chat-icon"
            />
          </div>
          <div className="chat-content">
            <ReactMarkdown>{message.message}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;
