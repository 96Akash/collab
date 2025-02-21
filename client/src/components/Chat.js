import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./Chat.css";

const ChatBox = ({ roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    console.log(`🔹 ChatBox Loaded - Username: ${username}, Room ID: ${roomId}`);

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);

      socketRef.current.on("connect", () => {
        console.log("🟢 Connected to chat server");
        socketRef.current.emit("JOIN_CHAT", { roomId, username });
      });

      socketRef.current.on("CHAT_HISTORY", (history) => {
        console.log("📜 Loading chat history:", history);
        setMessages(history);
      });

      socketRef.current.on("RECEIVE_MESSAGE", (data) => {
        console.log("📩 New message received:", data);
        setMessages((prev) => [...prev, data]);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("LEAVE_CHAT", { roomId, username });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socketRef.current) {
      const messageData = {
        roomId,
        username,
        message: messageInput.trim(),
        timestamp: new Date().toLocaleTimeString(),
        className: "message-item", // ✅ Add a class for styling
      };
  
      console.log("📤 Sending message:", messageData);
      socketRef.current.emit("SEND_MESSAGE", messageData);
      setMessageInput("");
    }
  };

 


  return (
    <div className="chatbox-container">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message-item ${msg.username === username ? "sent" : "received"}`}>
            <div className="message-header">
              <span className="username">{msg.username}</span>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <div className="message-content">{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="message-input-form">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          className="message-input"
          autoFocus
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
