import "./Home.css";
import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const id = uuid().slice(0,16);
    setRoomId(id);
    toast.success("Room Id is generated");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    // Redirect to the editor page with roomId and username state
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("Room is created");
  };

  // Trigger joinRoom when Enter is pressed
  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div className="container-fluid">
    <div className="logo">
      <img src="/images/logo5.jpg" alt="logo"></img>
    </div>
    <div className="Footer">
    <p className="header-text">"Where Coders Connect & Ideas Flow"</p>
    </div>

      <div className="full-container">
        {/* Left-side image (outside the card) */}
        <div className="left-image-container">
          <img 
            src="/images/main.png" 
            alt="Left Side" 
            className="left-image" 
          />
        </div>

        {/* Card container */}
        <div className="right-aligned-content">
          <div className="card shadow-sm mb-5 new_name1">
            <div className="card-body new_name">
              {/* Form contents */}
              <div className="flex-grow-1">
                <h4 className="card-title mb-4">Enter the ROOM ID</h4>
                <div className="form-group">
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="form-control mb-3"
                    placeholder="ROOM ID"
                    onKeyUp={handleInputEnter}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-control mb-3"
                    placeholder="USERNAME"
                    onKeyUp={handleInputEnter}
                  />
                </div>
                <button onClick={joinRoom} className="btn btn-success btn-lg">
                  JOIN
                </button>
                <p className="mt-3 text-dark">
                  Don't have a room ID? create{" "}
                  <span
                    onClick={generateRoomId}
                    className="text-success p-2"
                    style={{ cursor: "pointer" }}
                  >
                    New Room
                  </span>
                </p>
              </div>

              {/* Right-side image inside the card (if still needed) */}
              <div className="image-container">
                <img
                  className="right-image"
                  src="/images/main1.png"
                  alt="Right"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
