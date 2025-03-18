import React, { useState, useRef, useEffect } from "react";
import Client from "./Client";
import Editor from "./Editor";
import ChatSection from "./ChatBotSection";
import InputModal from "./InputModel";
import io from "socket.io-client";
import ACTIONS from "../Actions";
import ChatBox from "./Chat";
import HistoryLog from "./HistoryLog";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import "./EditorPage.css";

const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

function EditorPage() {
  const location = useLocation();
  const socketRef = useRef(null);
  const { roomId } = useParams();
  const [showHistory, setShowHistory] = useState(false); 
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState('viewer');
  const [isHost, setIsHost] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('python3');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [output, setOutput] = useState('');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [tempCode, setTempCode] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [history, setHistory] = useState([]); 

  const codeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      if (!location.state?.username) {
        reactNavigator('/');
        return;
      }

      socketRef.current = await io(process.env.REACT_APP_BACKEND_URL || "http://localhost:5000");

      function handleErrors(e) {
        console.log('socket error', e);
        toast.error('Socket connection failed, try again later.');
        reactNavigator('/');
      }

      socketRef.current.on('connect_error', (err) => handleErrors(err));
      socketRef.current.on('connect_failed', (err) => handleErrors(err));

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for joined event
      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId, isFirstUser ,isReconnecting }) => {
        // Update clients list
        setClients(clients);
        
        // Find the current client by socket ID
        const currentClient = clients.find(client => client.socketId === socketRef.current.id);
        if (currentClient) {
          // Set current user's role and host status based on client data
          setCurrentUserRole(currentClient.role);
          setIsHost(currentClient.isHost);

          // Show appropriate welcome message based on role system
          if (username === location.state?.username) {
            if (isReconnecting) {
              // Reconnecting user
              toast.success('Reconnected to the room.');
              if (currentClient.isHost) {
                toast.success('You are still the host of this room.');
              }
            } else if (isFirstUser) {
              // First user is both host and admin
              setCurrentUserRole('admin');
              setIsHost(true);
              toast.success('Welcome! You are the host of this room.');
            } else if (currentClient.role === 'admin') {
              // Non-host admin
              toast.success('You are an admin now.');
            } else {
              // Viewer
              toast.success('You are a viewer. You can view the code.');
            }
          } else {
            // Another user joined
            if (isReconnecting) {
              toast.success(`${username} reconnected to the room.`);
            } else {
              toast.success(`${username} joined the room.`);
            }
            // Add system message for user joining
             // Add system message for user joining
      const timestamp = new Date().toLocaleTimeString();
      const joinMessage = isReconnecting 
      ? `${username} reconnected to the room as ${currentClient.role}`
      : `${username} joined the room as ${currentClient.role}`;
      
      // Add directly to messages array for immediate display
      setMessages(prev => [...prev, {
        username: 'System',
        message: joinMessage,
        timestamp,
        isSystemMessage: true
      }]);
          }
        }
      });
      socketRef.current.on(ACTIONS.UPDATE_USERS, ({ clients }) => {
        console.log("📢 Updating users list:", clients);
        if (clients && Array.isArray(clients)) {
          // Create a new array to ensure React detects the change
          setClients(prevClients => {
            console.log("Previous clients:", prevClients, "New clients:", clients);
            return [...clients];
          });
        }
      });

    
    socketRef.current.on("HOST_CHANGED", ({ previousHost, newHost,clients }) => {
      console.log(`🎙 Host changed: ${previousHost} ➝ ${newHost}`);
  
      if (clients && Array.isArray(clients)) {
        setClients([...clients]);
      }
      if (newHost === location.state?.username) {
          toast.success('You are now the host of this room.');
          setIsHost(true);
          setCurrentUserRole('admin'); // Host should also be admin
      }
  
      setMessages(prev => [...prev, {
          username: 'System',
          message: `${newHost} is now the host.`,
          timestamp: new Date().toLocaleTimeString(),
          isSystemMessage: true
      }]);
  });
  
      
      // Listen for chat messages
      socketRef.current.on("RECEIVE_MESSAGE", (data) => {
    console.log("📩 Received message:", data);

    setMessages(prev => {
        const newMessages = [...prev, {
            username: data.username,
            message: data.message,
            timestamp: data.timestamp,
            isSystemMessage: data.username === "System"
        }];
        console.log("📜 Updated messages array:", newMessages);
        return newMessages;
    });
});
socketRef.current.on("UPDATE_HISTORY", (historyLog) => {
  console.log("📜 Received history log:", historyLog);
  setHistory(historyLog);
});

   

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ username, clients }) => {
        console.log(`❌ ${username} left the room. Received clients:`, clients);
        
        // Directly update clients state if we received an updated list
        if (clients && Array.isArray(clients)) {
          console.log("Updating clients state with:", clients);
          setClients([...clients]); // Create a new array to ensure state update
        }
      
        // Add system message
        setMessages(prev => [...prev, {
          username: 'System',
          message: `${username} left the room.`,
          timestamp: new Date().toLocaleTimeString(),
          isSystemMessage: true
        }]);
      });
    
    
    
    

      // Listen for role changes
      socketRef.current.on(ACTIONS.ROLE_CHANGED, ({ clients, changedUserId, username, newRole }) => {
        setClients(clients);
        
        // Update current user's role if it was changed
        const currentClient = clients.find(client => client.socketId === socketRef.current.id);
        const changedUser = clients.find(client => client.socketId === changedUserId);
        
        if (currentClient) {
          setCurrentUserRole(currentClient.role);
          setIsHost(currentClient.isHost);
          
          // Show role change message only to the affected user
          if (currentClient.socketId === changedUserId) {
            if (currentClient.role === 'admin') {
              toast.success('You are an admin now.');
            } else {
              toast.success('You are a viewer now. You can only view');
            }
          }
        }
        
        // Add system message for role change
        if (changedUser) {
          const roleChangeMessage = `${changedUser.username}'s role changed to ${changedUser.role}`;
          setMessages(prev => [...prev, {
            username: 'System',
            message: roleChangeMessage,
            timestamp: new Date().toLocaleTimeString(),
            isSystemMessage: true
          }]);
        }
      });

      // Listen for language changes
      socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language, username }) => {
        if (language) {
          setSelectedLanguage(language);
          toast.success(`Programming language changed to ${language.charAt(0).toUpperCase() + language.slice(1)}`);
          
          // Add system message for language change
          const timestamp = new Date().toLocaleTimeString();
          const languageChangeMessage = username ? 
            `${username} changed programming language to ${language}` : 
            `Programming language changed to ${language}`;
          
          setMessages(prev => [...prev, {
            username: 'System',
            message: languageChangeMessage,
            timestamp,
            isSystemMessage: true
          }]);
        }
      });

      // Listen for errors
      socketRef.current.on('error', ({ message }) => {
        toast.error(message);
      });

      // Listen for code changes
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          setCode(code);
        }
      });

      // Listen for sync code
      socketRef.current.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
        if (socketId !== socketRef.current.id) {
          setCode(code);
        }
      });

      // Clean up on unmount
      return () => {
        // Clean up localStorage
        localStorage.removeItem('username');
        socketRef.current?.disconnect();
        socketRef.current?.off(ACTIONS.JOINED);
        socketRef.current?.off(ACTIONS.DISCONNECTED);
        socketRef.current?.off(ACTIONS.ROLE_CHANGED);
        socketRef.current?.off(ACTIONS.LANGUAGE_CHANGE);
        socketRef.current?.off(ACTIONS.CODE_CHANGE);
        socketRef.current?.off(ACTIONS.SYNC_CODE);
        socketRef.current?.off(ACTIONS.RECEIVE_MESSAGE);
        socketRef.current.off(ACTIONS.UPDATE_USERS);
        socketRef.current.off("UPDATE_HISTORY")
        socketRef.current?.off('error');
      };
    };

    init();
  }, []);

  const handleRoleChange = (socketId, newRole) => {
    const targetClient = clients.find(c => c.socketId === socketId);
    const currentClient = clients.find(c => c.socketId === socketRef.current.id);
  
    if (!currentClient || !targetClient) return;
  
    // Host can change any role except their own and other hosts
    if (isHost && !targetClient.isHost) {
      socketRef.current.emit(ACTIONS.CHANGE_ROLE, {
        roomId,
        targetSocketId: socketId,
        newRole: newRole,
        username: targetClient.username
      });
    }
    // Admin can only promote viewers to admin
    else if (currentUserRole === 'admin' && !currentClient.isHost && targetClient.role === 'viewer') {
      socketRef.current.emit(ACTIONS.CHANGE_ROLE, {
        roomId,
        targetSocketId: socketId,
        newRole: 'admin',
        username: targetClient.username
      });
    } else {
      toast.error('You do not have permission to make this role change');
    }
  };

  const renderClient = (client) => {
    return (
      <Client
        key={client.socketId}
        username={client.username}
        role={client.role}
        isHost={client.isHost}
        currentUserRole={currentUserRole}
        isCurrentUserHost={isHost}
        onRoleChange={(newRole) => handleRoleChange(client.socketId, newRole)}
      />
    );
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (currentUserRole === 'admin' || isHost) {
      socketRef.current.emit(ACTIONS.CODE_CHANGE, {
        roomId,
        code: newCode,
        username: location.state?.username
      });
    }
  };

  const handleLanguageChange = (e) => {
    // Only allow admins and hosts to change language
    if (currentUserRole === 'admin' || isHost) {
      const newLanguage = e.target.value;
      setSelectedLanguage(newLanguage);
      socketRef.current?.emit(ACTIONS.LANGUAGE_CHANGE, {
        roomId,
        language: newLanguage,
        username: location.state?.username
      });
    } else {
      toast.error("Only admins and hosts can change the language");
    }
  };

  const canEdit = (client) => {
    return client && (client.role === 'admin' || client.isHost);
  };

  const languageToExtension = {
    python3: "py",
    java: "java",
    cpp: "cpp",
    nodejs: "js",
    c: "c",
    ruby: "rb",
    go: "go",
    scala: "scala",
    bash: "sh",
    sql: "sql",
    pascal: "pas",
    csharp: "cs",
    php: "php",
    swift: "swift",
    rust: "rs",
    r: "r",
  };

  const handleSaveFile = () => {
    if (!code) {
      toast.error("No code to save!");
      return;
    }

    const fileName = prompt("Enter file name:", "code"); // Ask for filename
    if (!fileName) return; // Stop if user cancels
  
    const fileExtension = languageToExtension[selectedLanguage] || "txt"; // Get correct extension
    const blob = new Blob([code], { type: "text/plain" });
    const link = document.createElement("a");
  
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.${fileExtension}`; // Set filename with extension
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImport = (event) => {
    if (!canEdit(clients.find(c => c.socketId === socketRef.current.id))) {
      toast.error('Only admins and host can import files');
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    // Check file extension matches selected language
    const fileExtension = file.name.split('.').pop();
    const expectedExtension = languageToExtension[selectedLanguage];
    
    if (fileExtension !== expectedExtension) {
      toast.error(`Please select a ${expectedExtension} file for ${selectedLanguage}`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      // Update the editor content
      if (socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code: content,
        });
      }
      setCode(content);
     // Force editor update by emitting a SYNC_CODE event
     if (socketRef.current) {
      socketRef.current.emit(ACTIONS.SYNC_CODE, {
        code: content,
        socketId: socketRef.current.id,
      });
    }
    
    toast.success('File imported successfully');
    
    // Clear the file input for future imports
    event.target.value = '';
    };
    reader.onerror = () => {
      toast.error('Error reading file');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => {
    if (socketRef.current) {
        socketRef.current.emit(ACTIONS.LEAVE_ROOM, {
            roomId,
            username: location.state?.username
        });

        // Delay navigation to allow the server to process the event
        setTimeout(() => {
            navigate("/");
        }, 500);
    }
};


  const codeNeedsInput = (code) => {
    if (!code) return false;
    switch (selectedLanguage) {
      case "python3":
        return code.includes("input(");
      case "c":
      case "cpp":
        return code.includes("scanf(") || code.includes("cin >>");
      case "java":
        return code.includes("Scanner") || code.includes("BufferedReader");
      default:
        return false;
    }
  };

  const runCode = async (input) => {
    setIsCompiling(true);
    try {
      const response = await axios.post("http://localhost:5000/compile", {
        code,
        language: selectedLanguage,
        stdin: input,
      });
      console.log("Backend response:", response.data);
      setOutput(response.data);
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRunClick = () => {
    setTempCode(code);
    if (codeNeedsInput(code)) {
      setIsInputModalOpen(true);
    } else {
      runCode("");
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen((prev) => !prev);
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };
  return (
    <div className="container-fluid vh-100 d-flex flex-column">
      <div className="row flex-grow-1">
        {/* Sidebar */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img
            src="/images/logo3.jpeg"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "20px", borderradius: "0px" }}
          />
          <hr style={{ marginTop: "2rem" }} />
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Connected Users</span>
            {clients.map((client) => renderClient(client))}
          </div>
          <hr />
          <div className="mt-auto mb-3">
            <button
              className="btn btn-success w-100 mb-2"
              onClick={copyRoomId}
            >
              Copy Room ID
            </button>
            <button
              className="btn btn-danger w-100"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Main Editor Section */}
        <div className="col-md-10 text-light d-flex flex-column">
          {/* Top Header (Language selector & nav) */}
          <div className="editor-header bg-dark p-2 d-flex justify-content-end">
            <select 
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={!(currentUserRole === 'admin' || isHost)}
              className="form-select w-auto"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          {/* Editor Container */}
          <div className="editorWrap">
            <div className="editor-section">
              <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={handleCodeChange}
                isAdmin={currentUserRole === 'admin'}
                isHost={isHost}
                language={selectedLanguage}
                code={code}
              />
              
            </div>
          </div>
        </div>
      </div>
      {/* ChangeLog Toggle Button */}
      <button
        className="btn btn-warning position-fixed changelog-button"
        onClick={() => setIsChangelogOpen((prev) => !prev)}
      >
        {isChangelogOpen ? "Close Chat" : "Open Chat"}
      </button>

      {/* ChangeLog Section */}
      {isChangelogOpen && (
        <div
          className="changelog-container bg-light text-dark"
        >
          <ChatBox onClose={() => setIsChangelogOpen(false)} 
            username={location.state?.username} 
            roomId={roomId} 
          />
        </div>
      )}
      {/* Compiler Window Toggle Button */}
      {!isCompiling && (
        <button
          className="btn btn-primary btn-com position-fixed bottom-0 end-0 m-3"
          onClick={toggleCompileWindow}
          style={{ zIndex: 1050 }}
        >
          Open Compiler
        </button>
      )}
      <input
        type="file"
        id="file-import"
        accept={`.${languageToExtension[selectedLanguage]}`}
        onChange={handleFileImport}
        style={{ display: 'none' }}
      />
      
      <button
        className="import-file-btn"
        onClick={() => document.getElementById('file-import').click()}
        disabled={!canEdit(clients.find(c => c.socketId === socketRef.current.id))}
      >
        Import File
      </button>
      <button 
  className="history-toggle-btn" 
  onClick={() => setShowHistory(!showHistory)}
>
  {showHistory ? "Hide History" : "View History"}
</button>

{showHistory && <HistoryLog history={history} />}
      <button
        className="save-file-btn"
        onClick={handleSaveFile}
      >
        Save File
      </button>
      {/* Compiler Window */}
      <div
        className={`bg-dark text-light p-3 ${
          isCompileWindowOpen ? "d-block" : "d-none"
        }`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: isCompileWindowOpen ? "30vh" : "0",
          transition: "height 0.3s ease-in-out",
          overflowY: "auto",
          zIndex: 1040,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="m-0">Compiler Output ({selectedLanguage})</h5>
          <div>
            <button
              className="btn btn-success me-2 run-btn"
              onClick={handleRunClick}
              disabled={isCompiling}
            >
              {isCompiling ? "Compiling..." : "Run Code"}
            </button>
            <button
              className="btn btn-secondary close-btn"
              onClick={toggleCompileWindow}
            >
              Close
            </button>
          </div>
        </div>
        <pre className="bg-secondary p-3 rounded">
          {output || "Output will appear here after compilation"}
        </pre>
      </div>
      {/* Chat Toggle Button */}
      <button
        className="btn btn-info position-fixed"
        onClick={toggleChat}
        style={{
          top: "8px",
          right: "120px",
          marginRight: "20px",
          zIndex: 1050,
        }}
      >

        {isChatOpen ? "Close AI" : "AI Chat"}

      </button>

      {/* Chat Section */}
      {isChatOpen && (
        <div
          className="chatbot-container bg-dark text-light p-3"
          style={{
            position: "fixed",
            bottom: "0",
            right: "0",
            width: "100vw",
            height: "61vh",
            borderRadius: "20px",
            overflowY: "auto",
            zIndex: 2030,
          }}
        >
          <ChatSection onClose={toggleChat} />
        </div>
      )}
      {/* Input Modal */}
      <InputModal isOpen={isInputModalOpen} onClose={() => setIsInputModalOpen(false)} onSubmit={runCode} code={tempCode} language={selectedLanguage} />  
    </div>
  );
}

export default EditorPage;
