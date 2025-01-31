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
    template: code => code,
    compile: false
  },
  java: { 
    engine: "java", 
    version: "15.0.2",
    extension: "java",
    template: code => `
public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`,
    compile: true
  },
  cpp: { 
    engine: "c++",
    version: "10.2.0",
    extension: "cpp",
    template: code => `
#include <iostream>
using namespace std;

int main() {
    ${code}
    return 0;
}`,
    compile: true
  },
  nodejs: { 
    engine: "node",
    version: "15.8.0",
    extension: "js",
    template: code => code,
    compile: false
  },
  c: { 
    engine: "c",
    version: "10.2.0",
    extension: "c",
    template: code => `
#include <stdio.h>

int main() {
    ${code}
    return 0;
}`,
    compile: true
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

const getAllConnectedClients = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  
  return Array.from(room).map(socketId => ({
    socketId,
    username: userSocketMap.get(socketId)
  }));
};

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap.set(socket.id, username);
    socket.join(roomId);
    
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    if (typeof code !== 'string') return;
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    if (typeof code !== 'string') return;
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = socket.rooms;
    rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username: userSocketMap.get(socket.id)
        });
      }
    });
    userSocketMap.delete(socket.id);
    socket.leave();
  });
});

const preprocessCode = (code, language) => {
  const config = languageConfig[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);
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
    const { code, language } = req.body;
    
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
    
    const payload = {
      language: config.engine,
      version: config.version,
      files: [{
        name: `main.${config.extension}`,
        content: processedCode
      }],
      stdin: "",
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

    // Sanitize output and send plain text
    const sanitizedOutput = sanitizeOutput(output);
    res.send(sanitizedOutput);  // Sending plain text output

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
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
