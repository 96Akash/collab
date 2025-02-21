const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const server = http.createServer(app);
require("dotenv").config();

const languageConfig = {
  python3: { 
    engine: "python", 
    version: "3.10",
    extension: "py",
    template: code => {
      // Check if code contains imports
      const lines = code.split('\n');
      let imports = [];
      let mainCode = [];
      let hasClass = false;

      lines.forEach(line => {
        if (line.trim().startsWith("import ") || line.trim().startsWith("from ")) {
          imports.push(line);
        } else if (line.trim().startsWith("class ")) {
          hasClass = true;
          mainCode.push(line);
        } else {
          mainCode.push(line);
        }
      });

      // If there are imports, place them at the top
      if (imports.length > 0) {
        return `${imports.join('\n')}\n\n${mainCode.join('\n')}`;
      }

      // If no special handling needed, return as is
      return code;
    },
    compile: false
  },
  java: { 
    engine: "java", 
    version: "15.0.2",
    extension: "java",
    template: code => {
      // Check if code already contains a class definition
      if (code.includes("class ") || code.includes("public class ")) {
        return code; // Return as-is if it already has a class definition
      }
      
      // Check if code contains package or import statements
      const lines = code.split('\n');
      let imports = [];
      let mainCode = [];
      let hasPackage = false;
      
      lines.forEach(line => {
        if (line.trim().startsWith("package ")) {
          hasPackage = true;
          imports.unshift(line); // Add package declaration at the start
        } else if (line.trim().startsWith("import ")) {
          imports.push(line);
        } else {
          mainCode.push(line);
        }
      });
      
      // If code doesn't have its own class, wrap it in a Main class
      if (imports.length > 0 || hasPackage) {
        return `${imports.join('\n')}

public class Main {
    public static void main(String[] args) {
        ${mainCode.join('\n')}
    }
}`;
      } else {
        return `public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`;
      }
    },
    compile: true
  },
  cpp: { 
    engine: "c++",
    version: "10.2.0",
    extension: "cpp",
    template: code => {
      const lines = code.split('\n');
      let includes = [];
      let namespaces = [];
      let mainCode = [];
      let hasClass = false;
      let hasMain = false;

      lines.forEach(line => {
        if (line.trim().startsWith("#include")) {
          includes.push(line);
        } else if (line.trim().startsWith("using namespace")) {
          namespaces.push(line);
        } else if (line.trim().startsWith("class ")) {
          hasClass = true;
          mainCode.push(line);
        } else if (line.trim().includes("main(")) {
          hasMain = true;
          mainCode.push(line);
        } else {
          mainCode.push(line);
        }
      });

      // If no includes are present, add standard ones
      if (includes.length === 0) {
        includes.push("#include <iostream>");
      }

      // If no using namespace std, add it
      if (!namespaces.some(ns => ns.includes("std"))) {
        namespaces.push("using namespace std;");
      }

      // If no main function and no class definition, wrap in main
      if (!hasMain && !hasClass) {
        return `${includes.join('\n')}\n${namespaces.join('\n')}\n\nint main() {\n    ${mainCode.join('\n    ')}\n    return 0;\n}`;
      }

      // If has class but no main, add main after class
      if (hasClass && !hasMain) {
        return `${includes.join('\n')}\n${namespaces.join('\n')}\n\n${mainCode.join('\n')}\n\nint main() {\n    return 0;\n}`;
      }

      // If everything is present, just organize the code
      return `${includes.join('\n')}\n${namespaces.join('\n')}\n\n${mainCode.join('\n')}`;
    },
    compile: true
  },
  c: { 
    engine: "c",
    version: "10.2.0",
    extension: "c",
    template: code => {
      const lines = code.split('\n');
      let includes = [];
      let mainCode = [];
      let hasMain = false;
      let hasStruct = false;

      lines.forEach(line => {
        if (line.trim().startsWith("#include")) {
          includes.push(line);
        } else if (line.trim().startsWith("struct ")) {
          hasStruct = true;
          mainCode.push(line);
        } else if (line.trim().includes("main(")) {
          hasMain = true;
          mainCode.push(line);
        } else {
          mainCode.push(line);
        }
      });

      // If no includes are present, add stdio
      if (includes.length === 0) {
        includes.push("#include <stdio.h>");
      }

      // If no main function and no struct definition, wrap in main
      if (!hasMain && !hasStruct) {
        return `${includes.join('\n')}\n\nint main() {\n    ${mainCode.join('\n    ')}\n    return 0;\n}`;
      }

      // If has struct but no main, add main after struct
      if (hasStruct && !hasMain) {
        return `${includes.join('\n')}\n\n${mainCode.join('\n')}\n\nint main() {\n    return 0;\n}`;
      }

      // If everything is present, just organize the code
      return `${includes.join('\n')}\n\n${mainCode.join('\n')}`;
    },
    compile: true
  },
  nodejs: { 
    engine: "node",
    version: "15.8.0",
    extension: "js",
    template: code => code,
    compile: false
  },
  ruby: { 
    engine: "ruby",
    version: "3.0.0",
    extension: "rb",
    template: code => code,
    compile: false
  },
  go: { 
    engine: "go",
    version: "1.16.2",
    extension: "go",
    template: code => `
package main

import "fmt"

func main() {
    ${code}
}`,
    compile: true
  },
  swift: { 
    engine: "swift",
    version: "5.3.3",
    extension: "swift",
    template: code => code,
    compile: true
  },
  rust: { 
    engine: "rust",
    version: "1.50.0",
    extension: "rs",
    template: code => `
fn main() {
    ${code}
}`,
    compile: true
  },
  csharp: { 
    engine: "c#",
    version: "5.0.201",
    extension: "cs",
    template: code => `
using System;

class Program {
    static void Main() {
        ${code}
    }
}`,
    compile: true
  }
};

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const userSocketMap = new Map();
const roomHistory = new Map();
const roomChatHistory = new Map(); // Store chat history per room
const activeRooms = new Map(); // Track active users in each room
const userSessions = new Map(); // Track user sessions per room
// Add debug logging for user tracking
const logRoomUsers = (roomId) => {
  const users = getAllConnectedClients(roomId);
  console.log(`Current users in room ${roomId}:`, users.map(u => `${u.username} (${u.socketId})`));
};

const getAllConnectedClients = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room)
    .filter(socketId => userSocketMap.has(socketId)) // Only return users that are properly mapped
    .map(socketId => ({
      socketId,
      username: userSocketMap.get(socketId)
    }));
};



io.on("connection", (socket) => {
  console.log(`🟢 New client connected: ${socket.id}`);

  socket.on("JOIN_CHAT", ({ roomId, username }) => {
    if (!username) {
      console.log(`⚠️ Rejected join attempt without username for socket ${socket.id}`);
      return;
    }

 // Check for existing socket with same username in the room
 const previousSocket = findSocketByUsername(roomId, username);
 if (previousSocket) {
   // Remove old socket from room and maps
   handleUserLeaving(io.sockets.sockets.get(previousSocket), roomId);
   io.sockets.sockets.get(previousSocket)?.disconnect(true);
 }

    userSocketMap.set(socket.id, username); // Set username immediately
    socket.join(roomId);
    console.log(`👥 ${username} joined room: ${roomId}`);
   

   // Initialize room chat history if it doesn't exist
   if (!roomChatHistory.has(roomId)) {
    roomChatHistory.set(roomId, []);
  }

    // Track active users in the room
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Set());
    }
    activeRooms.get(roomId).add(socket.id);

    // Send existing chat history to the new user
    socket.emit("CHAT_HISTORY", roomChatHistory.get(roomId));
  });

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    if (!username) {
      console.log(`⚠️ Rejected join action without username for socket ${socket.id}`);
      return;
    }

    userSocketMap.set(socket.id, username);
    socket.join(roomId);
    console.log(`📌 ${username} joined room: ${roomId}`);
    logRoomUsers(roomId);

    if (!roomHistory.has(roomId)) {
      roomHistory.set(roomId, { code: "" });
    }

    const clients = getAllConnectedClients(roomId);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
        history: roomHistory.get(roomId)
      });
    });
  });
  // Handle message sending
  socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message, username }) => {
    console.log(`📩 ${username} sent message: "${message}" in room: ${roomId}`);

    const chatMessage = { username, message, timestamp: new Date() };
   

    io.in(roomId).emit(ACTIONS.RECEIVE_MESSAGE, chatMessage);
  });

  socket.on("SEND_MESSAGE", (data) => {
    const { roomId, username, message } = data;
    if (!username || !userSocketMap.has(socket.id)) {
      console.log(`⚠️ Rejected message from unregistered user: ${socket.id}`);
      return;
    }
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });

    const chatMessage = {
      username,
      message,
      timestamp: formattedTime,
      id: Date.now() // Add unique ID for each message
    };

    // Add message to room's chat history
    if (roomChatHistory.has(roomId)) {
      roomChatHistory.get(roomId).push(chatMessage);
    }

    // Broadcast to all users in the room (including sender)
    io.in(roomId).emit("RECEIVE_MESSAGE", chatMessage);
  });

  socket.on("LEAVE_CHAT", ({ roomId, username }) => {
    if (!username || !userSocketMap.has(socket.id)) {
      console.log(`⚠️ Rejected leave request from unregistered user: ${socket.id}`);
      return;
    }

    handleUserLeaving(socket, roomId);
    // socket.to(roomId).emit("USER_LEFT", {
    //   username,
    //   socketId: socket.id
    // });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    if (!roomHistory.has(roomId)) return;
    roomHistory.get(roomId).code = code;
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code }); // Broadcast only to room
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

   // Handle disconnection
   socket.on("disconnect", () => {
    const userRoomId = findUserRoom(socket.id);
    if (userRoomId) {
      const username = userSocketMap.get(socket.id);
      handleUserLeaving(socket, userRoomId);
      
      // Notify others about user disconnection
      socket.to(userRoomId).emit("USER_LEFT", {
        username,
        socketId: socket.id
      });
    }
    userSocketMap.delete(socket.id);
    console.log(`🔴 Client disconnected: ${socket.id}`);
  });
});
// Helper function to find socket by username in a room
function findSocketByUsername(roomId, username) {
  const clients = getAllConnectedClients(roomId);
  const existingClient = clients.find(client => client.username === username);
  return existingClient ? existingClient.socketId : null;
}

// Helper function to find user's room
function findUserRoom(socketId) {
  for (const [roomId, users] of activeRooms.entries()) {
    if (users.has(socketId)) {
      return roomId;
    }
  }
  return null;
}

function handleUserLeaving(socket, roomId) {
  if (!socket) return;
  
  const username = userSocketMap.get(socket.id);
  socket.leave(roomId);
  
  if (activeRooms.has(roomId)) {
    activeRooms.get(roomId).delete(socket.id);

    // Only clear room history if it's the last user
    if (activeRooms.get(roomId).size === 0) {
      console.log(`🧹 Clearing history for empty room: ${roomId}`);
      roomChatHistory.delete(roomId);
      activeRooms.delete(roomId);
    }
  }
}



const preprocessCode = (code, language) => {
  const config = languageConfig[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);
  
  // Remove any BOM or hidden characters
  code = code.replace(/^\uFEFF/, '');
  
  // Trim whitespace but preserve newlines
  code = code.replace(/^\s+|\s+$/g, '');
  
  // Handle specific language preprocessing
  return config.template(code);
};

const sanitizeOutput = (output) => {
  if (!output) return '';
  
  // Convert undefined or null to empty string
  let sanitized = output.toString();
  
  // Trim any whitespace
  sanitized = sanitized.trim();
  
  // Remove literal \n and replace with actual newlines
  sanitized = sanitized.replace(/\\n/g, '\n');
  
  // Remove any surrounding quotes (both single and double)
  if ((sanitized.startsWith('"') && sanitized.endsWith('"')) || 
      (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
    sanitized = sanitized.slice(1, -1);
  }
  
  return sanitized;
};

app.post("/compile", async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ 
        error: "Missing required parameters: code and language" 
      });
    }

    const config = languageConfig[language];
    if (!config) {
      return res.status(400).json({ 
        error: `Unsupported language: ${language}` 
      });
    }

    const processedCode = preprocessCode(code, language);
    
    // Determine the main class name for Java
    let fileName = `main.${config.extension}`;
    if (language === 'java') {
      const classMatch = processedCode.match(/public\s+class\s+(\w+)/);
      if (classMatch) {
        fileName = `${classMatch[1]}.java`;
      }
    }
    
    const payload = {
      language: config.engine,
      version: config.version,
      files: [{
        name: fileName,
        content: processedCode
      }],
      stdin: stdin || "",
    };

    console.log("Sending to Piston:", payload);
    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute", 
      payload
    );
    console.log("Piston response:", response.data);

    let output = '';
    
    if (response.data.run.stdout) {
      output += response.data.run.stdout;
    }
    
    if (response.data.run.stderr) {
      output += output ? `\nError:\n${response.data.run.stderr}` : response.data.run.stderr;
    }

    const sanitizedOutput = sanitizeOutput(output);
    res.send(sanitizedOutput);

  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({ 
      error: error.response?.data?.message || "Failed to compile code"
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!"
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));