import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import ACTIONS from "../Actions";

const socket = io("http://localhost:5000"); // Update with your server URL

const ChatBot = ({ username }) => {
  const { roomId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Listen for incoming messages
    socket.on(ACTIONS.RECEIVE_MESSAGE, (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off(ACTIONS.RECEIVE_MESSAGE);
    };
  }, []);

  const sendMessage = () => {
    if (message.trim() !== "") {
      const chatMessage = {
        roomId,
        username,
        message,
      };
      socket.emit(ACTIONS.SEND_MESSAGE, chatMessage);
      setMessage(""); // Clear input field after sending
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chat-header">Live Chat</div>

      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.username === username ? "self" : ""}`}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBot;
