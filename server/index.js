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

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Map to store room data
const roomsMap = new Map();
const userChatStates = new Map();

// Store chat messages for each room
const chatHistories = new Map();
const userSocketMap = new Map();
const activeRooms = new Map();
// Track connected users in chat
const connectedUsers = new Map();
// Track connected users in chat by room
const chatUsers = new Map();

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, { clients: [], code: "", language: "python3" });
    }
    
    const room = roomsMap.get(roomId);
    
    // Remove existing user instance before adding new one
    room.clients = room.clients.filter(c => c.username !== username);
    
    // Determine roles
    const isFirstUser = room.clients.length === 0;
    const newClient = {
        socketId: socket.id,
        username,
        role: isFirstUser ? 'admin' : 'viewer',
        isHost: isFirstUser
    };
    room.clients.push(newClient);
    
    // Send updated client list to all users
    io.to(roomId).emit(ACTIONS.JOINED, { clients: room.clients, username, socketId: socket.id });

    // Save join message in chat history
    const timestamp = new Date().toLocaleTimeString();
    const joinMessage = { username: "System", message: `${username} joined the room.`, timestamp };

    if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
    chatHistories.get(roomId).push(joinMessage);
    
    io.to(roomId).emit("RECEIVE_MESSAGE", joinMessage);
});

  socket.on("GET_HISTORY", ({ roomId }) => {
    const room = roomsMap.get(roomId);
    if (room && room.history) {
        socket.emit("UPDATE_HISTORY", room.history);
    }
});
function broadcastUserList(roomId) {
  const room = roomsMap.get(roomId);
  if (!room) return;
  
  // Format the client list in a consistent way
  const clientList = room.clients.map(client => ({
    socketId: client.socketId,
    username: client.username,
    role: client.role,
    isHost: client.isHost
  }));
  
  // Broadcast to all users in the room
  io.to(roomId).emit('USERS_UPDATE', {
    clients: clientList,
    roomId: roomId
  });
}

  // Handle chat message joining
  socket.on("JOIN_CHAT", ({ roomId, username }) => {
    if (!username) return;
    socket.join(roomId);
    userSocketMap.set(socket.id, username);

    if (!chatHistories.has(roomId)) {
      chatHistories.set(roomId, []);
    }
    socket.emit("CHAT_HISTORY", chatHistories.get(roomId));
  });
  socket.on(ACTIONS.LEAVE_ROOM, ({ roomId, username }) => {
    if (!roomId || !username) return;

    const room = roomsMap.get(roomId);
    if (room) {
        room.clients = room.clients.filter(c => c.username !== username);
        io.to(roomId).emit(ACTIONS.DISCONNECTED, { username, clients: [...room.clients] });

        // Save leave message in chat history
        const timestamp = new Date().toLocaleTimeString();
        const leaveMessage = { username: "System", message: `${username} left the room.`, timestamp };
        
        if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
        chatHistories.get(roomId).push(leaveMessage);
        
        io.to(roomId).emit("RECEIVE_MESSAGE", leaveMessage);

        // Assign new host if necessary
        if (room.clients.length > 0) {
            const nextHost = room.clients.find(c => c.role === 'admin') || room.clients[0];
            if (nextHost) {
                nextHost.isHost = true;
                nextHost.role = 'admin';

                const hostChangeMessage = { username: "System", message: `${nextHost.username} is now the host.`, timestamp };
                chatHistories.get(roomId).push(hostChangeMessage);
                
                io.to(roomId).emit("HOST_CHANGED", { previousHost: username, newHost: nextHost.username });
                io.to(roomId).emit("RECEIVE_MESSAGE", hostChangeMessage);
            }
        }

        if (room.clients.length === 0) roomsMap.delete(roomId);
    }
});

  socket.on(ACTIONS.REQUEST_UPDATE_USERS, ({ roomId }) => {
    const room = roomsMap.get(roomId);
    if (room) {
      io.to(roomId).emit(ACTIONS.UPDATE_USERS, { 
        clients: [...room.clients]
      });
    }
  });


  // Handle disconnection
  socket.on("disconnect", () => {
    for (const [roomId, room] of roomsMap.entries()) {
        const disconnectedClient = room.clients.find(c => c.socketId === socket.id);
        if (disconnectedClient) {
            const username = disconnectedClient.username;
            room.clients = room.clients.filter(c => c.socketId !== socket.id);
            io.to(roomId).emit(ACTIONS.DISCONNECTED, { username, clients: [...room.clients] });

            // Save disconnect message in chat history
            const timestamp = new Date().toLocaleTimeString();
            const disconnectMessage = { username: "System", message: `${username} disconnected.`, timestamp };
            
            if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
            chatHistories.get(roomId).push(disconnectMessage);
            
            io.to(roomId).emit("RECEIVE_MESSAGE", disconnectMessage);

            // Handle host reassignment
            if (disconnectedClient.isHost && room.clients.length > 0) {
                const nextHost = room.clients.find(c => c.role === 'admin') || room.clients[0];
                if (nextHost) {
                    nextHost.isHost = true;
                    nextHost.role = 'admin';

                    const hostChangeMessage = { username: "System", message: `${nextHost.username} is now the host.`, timestamp };
                    chatHistories.get(roomId).push(hostChangeMessage);
                    
                    io.to(roomId).emit("HOST_CHANGED", { previousHost: username, newHost: nextHost.username });
                    io.to(roomId).emit("RECEIVE_MESSAGE", hostChangeMessage);
                }
            }

            if (room.clients.length === 0) roomsMap.delete(roomId);
        }
    }
});
  
  socket.on("TOGGLE_CHAT_UI", ({ roomId, username, isOpen }) => {
    if (roomId && username) {
      const userKey = `${roomId}:${username}`;
      
      if (userChatStates.has(userKey)) {
        const userState = userChatStates.get(userKey);
        userState.uiOpen = isOpen;
        userChatStates.set(userKey, userState);
      }
      
      // Always ensure chat history is synced when opening
      if (isOpen && chatHistories.has(roomId)) {
        socket.emit("CHAT_HISTORY", chatHistories.get(roomId));
      }
    }
  });
  // Improved Chat Message Handling
  socket.on("SEND_MESSAGE", ({ roomId, username, message }) => {
    if (!username) return;
    const timestamp = new Date().toLocaleTimeString();
    const chatMessage = { username, message, timestamp };
    chatHistories.get(roomId).push(chatMessage);
    io.to(roomId).emit("RECEIVE_MESSAGE", chatMessage);
  });

  // Ensure consistent message handling between ACTIONS.SEND_MESSAGE and SEND_MESSAGE

 // Replace the existing CODE_CHANGE handler in index.js with this updated version
 socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, username }) => {
  const room = roomsMap.get(roomId);
  if (!room) return;
  
  const client = room.clients.find(c => c.socketId === socket.id);
  if (!(client && (client.role === 'admin' || client.isHost))) return;
  
  // Get previous code to compare
  const previousCode = room.code || "";
  
  // Don't process if code hasn't changed at all
  if (previousCode === code) return;
  
  // Initialize history and tracking variables if needed
  if (!room.history) room.history = [];
  if (!room.lastLogTime) room.lastLogTime = 0;
  if (!room.bufferedCode) room.bufferedCode = previousCode;
  if (!room.currentEditor) room.currentEditor = username;
  if (!room.pendingChanges) room.pendingChanges = false;
  
  const now = Date.now();
  const timeSinceLastLog = now - room.lastLogTime;
  
  // Calculate difference without whitespace to detect actual content changes
  const prevContent = previousCode.replace(/\s+/g, '');
  const newContent = code.replace(/\s+/g, '');
  const contentChanged = prevContent !== newContent;
  
  // Check if editor has changed - if so, log pending changes from previous editor
  if (username !== room.currentEditor && room.pendingChanges) {
    // Log the previous user's changes first
    logCodeChange(roomId, room, previousCode, room.currentEditor);
    room.bufferedCode = previousCode; // Update buffer to the state before current change
  }
  
  // Update current editor
  room.currentEditor = username;
  
  // Update room code immediately
  room.code = code;
  
  // Track that we have pending changes
  room.pendingChanges = true;
  
  // Check for "completion" indicators
  const isCompletedEdit = (
    // More than 8 seconds since last change
    timeSinceLastLog >= 8000 || 
    // Significant content change
    (contentChanged && Math.abs(newContent.length - prevContent.length) >= 5)
  );
  
  if (isCompletedEdit && room.pendingChanges) {
    // Log the completed edit
    logCodeChange(roomId, room, code, username);
    room.pendingChanges = false;
  } else {
    // Set a timeout to log changes after inactivity
    if (room.logTimeout) clearTimeout(room.logTimeout);
    
    room.logTimeout = setTimeout(() => {
      // Only log if we still have pending changes from this user
      if (room.pendingChanges && room.currentEditor === username) {
        logCodeChange(roomId, room, room.code, username);
        room.pendingChanges = false;
      }
    }, 8000); // 8 second timeout
  }
  
  // Always emit the latest code to all clients
  io.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
});

// Extract logging logic to a separate function for clarity
function logCodeChange(roomId, room, currentCode, editorUsername) {
  const bufferedCode = room.bufferedCode || "";
  
  // Skip if nothing changed (this is a safety check)
  if (bufferedCode === currentCode) return;
  
  // Calculate meaningful diff
  const originalLines = bufferedCode.split('\n');
  const currentLines = currentCode.split('\n');
  
  let addedLines = [];
  let removedLines = [];
  
  // Find the actual content changes
  const maxLines = Math.max(originalLines.length, currentLines.length);
  for (let i = 0; i < maxLines; i++) {
    const originalLine = i < originalLines.length ? originalLines[i].trim() : null;
    const currentLine = i < currentLines.length ? currentLines[i].trim() : null;
    
    // Skip logging empty lines or whitespace-only changes
    if (originalLine === currentLine || 
        (originalLine === '' && currentLine === null) || 
        (originalLine === null && currentLine === '')) {
      continue;
    }
    
    if (originalLine !== null && originalLine !== '') removedLines.push(`- ${originalLines[i]}`);
    if (currentLine !== null && currentLine !== '') addedLines.push(`+ ${currentLines[i]}`);
  }
  
  // Check if there are any meaningful changes
  const hasAddedContent = addedLines.some(line => line.trim() !== '+ ');
  const hasRemovedContent = removedLines.some(line => line.trim() !== '- ');
  
  if (hasAddedContent || hasRemovedContent) {
    // Determine action type
    let action = "edited the code";
    if (addedLines.length > 0 && removedLines.length === 0) {
      action = "added code";
    } else if (addedLines.length === 0 && removedLines.length > 0) {
      action = "removed code";
    }
    
    // Build the change description
    let changeDescription = '';
    
    // Keep diff compact
    if (removedLines.length > 0) {
      changeDescription += removedLines.join('\n');
    }
    
    if (addedLines.length > 0) {
      if (changeDescription) changeDescription += '\n';
      changeDescription += addedLines.join('\n');
    }
    
    // Limit change description length
    if (changeDescription.length > 300) {
      changeDescription = changeDescription.substring(0, 297) + '...';
    }
    
    // Add to history
    const timestamp = new Date().toLocaleTimeString();
    room.history.push({
      username: editorUsername || "Unknown User",
      action: action,
      timestamp,
      changeDescription
    });
    
    // Keep only the last 50 changes
    if (room.history.length > 50) {
      room.history.shift();
    }
    
    // Emit updated history
    io.to(roomId).emit("UPDATE_HISTORY", room.history.map(entry => ({
      username: entry.username,
      action: entry.action,
      timestamp: entry.timestamp,
      codeSnippet: entry.changeDescription
    })));
  }
  
  // Reset the buffer to current state
  room.bufferedCode = currentCode;
  room.lastLogTime = Date.now();
}



socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language, username }) => {
  const room = roomsMap.get(roomId);
  if (!room) return;

  const client = room.clients.find(c => c.socketId === socket.id);
  if (!client || !client.isHost) {
      socket.emit('error', { message: "Only the host can change the language" });
      return;
  }

  // Update language in the room
  room.language = language;
  io.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });

  // Create and store the system message in chat history
  const timestamp = new Date().toLocaleTimeString();
  const systemMessage = {
      username: "System",
      message: `${username} changed the language to ${language}.`,
      timestamp,
  };

  if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
  chatHistories.get(roomId).push(systemMessage);

  io.to(roomId).emit("RECEIVE_MESSAGE", systemMessage);
});

socket.on(ACTIONS.CHANGE_ROLE, ({ roomId, targetSocketId, newRole, username }) => {
  const room = roomsMap.get(roomId);
  if (!room) return;

  const targetClient = room.clients.find(c => c.socketId === targetSocketId);
  const requestingClient = room.clients.find(c => c.socketId === socket.id);

  if (!targetClient || !requestingClient) return;

  if (targetClient.isHost) {
      socket.emit('error', { message: "Host's role cannot be changed" });
      return;
  }

  if (!requestingClient.isHost && requestingClient.role !== 'admin') {
      socket.emit('error', { message: "You don't have permission to change roles" });
      return;
  }

  if (!requestingClient.isHost && targetClient.role === 'admin') {
      socket.emit('error', { message: "Only the host can change roles of admins" });
      return;
  }

  targetClient.role = newRole;
  io.to(roomId).emit(ACTIONS.ROLE_CHANGED, { 
      clients: room.clients, 
      changedUserId: targetSocketId, 
      changedBy: requestingClient.username, // Now tracking who changed the role
      username: targetClient.username, 
      newRole 
  });

  // Save role change message in chat history
  const timestamp = new Date().toLocaleTimeString();
  const roleChangeMessage = {
      username: "System",
      message: `${requestingClient.username} changed ${targetClient.username}'s role to ${newRole}.`,
      timestamp,
  };

  if (!chatHistories.has(roomId)) chatHistories.set(roomId, []);
  chatHistories.get(roomId).push(roleChangeMessage);

  io.to(roomId).emit("RECEIVE_MESSAGE", roleChangeMessage);
});


  socket.on('disconnect', () => {
    for (const [roomId, room] of roomsMap.entries()) {
      const disconnectedClient = room.clients.find(c => c.socketId === socket.id);
      if (disconnectedClient) {
        room.clients = room.clients.filter(c => c.socketId !== socket.id);
        io.to(roomId).emit(ACTIONS.DISCONNECTED, {
          clients: room.clients,
          username: disconnectedClient.username,
      });
        // **Send system message to chat**
        const timestamp = new Date().toLocaleTimeString();
        const systemMessage = {
          username: "System",
          message: `${disconnectedClient.username} left the room.`,
          timestamp: new Date().toLocaleTimeString(),
      };
      console.log("🔹 Sending system message:", systemMessage);
      io.to(roomId).emit("RECEIVE_MESSAGE", systemMessage);
      


        if (disconnectedClient.isHost && room.clients.length > 0) {
          const nextHost = room.clients.find(c => c.role === 'admin') || room.clients[0];
          if (nextHost) {
            nextHost.isHost = true;
            nextHost.role = 'admin';

            io.to(roomId).emit("HOST_CHANGED", {
              previousHost: disconnectedClient.username,
              newHost: nextHost.username
            });
            
            const systemMessage = {
              username: "System",
              message: `joined the room.`,
              timestamp: new Date().toLocaleTimeString(),
          };
          console.log("🔹 Sending system message:", systemMessage);
          io.to(roomId).emit("RECEIVE_MESSAGE", systemMessage);
          
          }
        }
      }
    }
  });
});

const preprocessCode = (code, language) => {
  const config = languageConfig[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  code = code.replace(/^\uFEFF/, '');

  code = code.replace(/^\s+|\s+$/g, '');

  return config.template(code);
};

const sanitizeOutput = (output) => {
  if (!output) return '';

  let sanitized = output.toString();

  sanitized = sanitized.trim();

  sanitized = sanitized.replace(/\\n/g, '\n');

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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!"
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));