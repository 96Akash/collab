import React from "react";
import Avatar from "react-avatar";

function Client({ username, currentUser }) {
  const isCurrentUser = username === currentUser; // Check if it's the logged-in user

  return (
    <div
      className={`d-flex align-items-center mb-3 p-2 ${isCurrentUser ? "bg-primary text-white rounded" : ""}`}
      style={{ fontWeight: isCurrentUser ? "bold" : "normal" }}
    >
      <Avatar name={username.toString()} size={50} round="14px" className="mr-3" />
      <span className="mx-2">{username.toString()} {isCurrentUser && "(You)"}</span>
    </div>
  );
}

export default Client;
