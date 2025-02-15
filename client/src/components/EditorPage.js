import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import ChatSection from "./ChatBotSection";
import InputModal from "./InputModel"; // Ensure the file is named InputModal.js
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
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
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // State for the Input Modal (for code execution input)
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [tempCode, setTempCode] = useState(null);

  const codeRef = useRef(null);
  const socketRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  // Helper: Check if the code likely requires input.
  const codeNeedsInput = (code) => {
    if (!code) return false;
    switch (selectedLanguage) {
      case "python3":
        return code.includes("input(");
      case "c":
        return code.includes("scanf(");
      case "cpp":
        return code.includes("cin >>");
      case "java":
        return code.includes("Scanner") || code.includes("BufferedReader");
      // Add other languages and detection logic as needed.
      default:
        return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      const handleErrors = (err) => {
        console.log("Socket error:", err);
        toast.error("Socket connection failed, try again later");
        navigate("/");
      };

      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
      });
    };
    init();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
      }
    };
  }, [location, navigate, roomId]);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID is copied");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = () => {
    navigate("/");
  };

  // Run code using the provided input (from the modal)
  const runCode = async (input) => {
    setIsCompiling(true);
    try {
      const response = await axios.post("http://localhost:5000/compile", {
        code: codeRef.current,
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

  // Trigger when the user clicks "Run Code"
  const handleRunClick = () => {
    setTempCode(codeRef.current);
    if (codeNeedsInput(codeRef.current)) {
      setIsInputModalOpen(true);
    } else {
      // If no input is detected, run code with empty input.
      runCode("");
    }
  };

  const handleModalClose = () => {
    setIsInputModalOpen(false);
    setUserInput("");
  };

  const handleModalSubmit = () => {
    runCode(userInput);
    setIsInputModalOpen(false);
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
            src="/images/logo5.jpg"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "20px" }}
          />
          <hr style={{ marginTop: "2rem" }} />

          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-2">Members</span>
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
                currentUser={location.state.username}
              />
            ))}
          </div>

          <hr />
          <div className="mt-auto mb-3">
            <button className="btn btn-success w-100 mb-2" onClick={copyRoomId}>
              Copy Room ID
            </button>
            <button className="btn btn-danger w-100" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        </div>

        {/* Main Editor Section */}
        <div className="col-md-10 text-light d-flex flex-column">
          <div className="bg-dark p-2 d-flex justify-content-end">
            <select
              className="form-select w-auto"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        </div>
      </div>

      {/* Compiler Window Toggle Button */}
      <button
        className="btn btn-primary position-fixed bottom-0 end-0 m-3"
        onClick={toggleCompileWindow}
        style={{ zIndex: 1050 }}
      >
        {isCompileWindowOpen ? "Close Compiler" : "Open Compiler"}
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
              className="btn btn-success me-2"
              onClick={handleRunClick}
              disabled={isCompiling}
            >
              {isCompiling ? "Compiling..." : "Run Code"}
            </button>
            <button
              className="btn btn-secondary"
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
        {isChatOpen ? "Close Chat" : "Open Chat"}
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

      {/* Input Modal for Program Input (only pops up if input is needed) */}
      <InputModal
        isOpen={isInputModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
    </div>
  );
}

export default EditorPage;
