const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT) || 4182;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "inventory-state.json");
const clients = new Set();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".java": "text/plain; charset=utf-8",
  ".sql": "text/plain; charset=utf-8"
};

let inventoryState = loadState();

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return isEmptyInventoryState(state) ? null : state;
  } catch {
    return null;
  }
}

function isEmptyInventoryState(state) {
  return Boolean(
    state &&
    Array.isArray(state.products) &&
    state.products.length === 0 &&
    (!Array.isArray(state.arrivals) || state.arrivals.length === 0) &&
    (!Array.isArray(state.shipping) || state.shipping.length === 0)
  );
}

function hasProductData(state) {
  return Boolean(state && Array.isArray(state.products) && state.products.length > 0);
}

function saveState(state) {
  inventoryState = state;
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req, callback) {
  let body = "";

  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1_000_000) {
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (error) {
      callback(error);
    }
  });
}

function handleApi(req, res) {
  if (req.url !== "/api/inventory") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, {
      state: inventoryState
    });
    return;
  }

  if (req.method === "POST") {
    readJsonBody(req, (error, body) => {
      if (error || !body.state) {
        sendJson(res, 400, { error: "Invalid inventory state" });
        return;
      }

      saveState(body.state);
      sendJson(res, 200, { ok: true });
      broadcast({
        type: "inventory:refresh"
      });
    });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

function serveFile(req, res) {
  const requestedPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(ROOT, requestedPath === "/" ? "index.html" : requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  });
}

function createFrame(text) {
  const payload = Buffer.from(text);
  const length = payload.length;
  let header;

  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function readFrame(buffer) {
  const opcode = buffer[0] & 0x0f;
  if (opcode === 0x8) return null;

  let offset = 2;
  let length = buffer[1] & 0x7f;

  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  const isMasked = (buffer[1] & 0x80) === 0x80;
  const mask = isMasked ? buffer.slice(offset, offset + 4) : null;
  offset += isMasked ? 4 : 0;

  const payload = buffer.slice(offset, offset + length);
  if (isMasked) {
    for (let index = 0; index < payload.length; index += 1) {
      payload[index] ^= mask[index % 4];
    }
  }

  return payload.toString("utf8");
}

function send(client, message) {
  if (client.destroyed) return;
  client.write(createFrame(JSON.stringify(message)));
}

function broadcast(message) {
  clients.forEach((client) => send(client, message));
}

function handleMessage(client, text) {
  let message;
  try {
    message = JSON.parse(text);
  } catch {
    return;
  }

  if (message.type === "hello") {
    if ((!inventoryState || isEmptyInventoryState(inventoryState)) && hasProductData(message.state)) {
      saveState(message.state);
    }
    send(client, { type: "state:sync", state: inventoryState || message.state });
  }

  if (message.type === "state:update" && message.state) {
    saveState(message.state);
    broadcast({ type: "inventory:refresh" });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }

  serveFile(req, res);
});

server.on("upgrade", (req, socket) => {
  if (req.url !== "/ws") {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash("sha1")
    .update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${acceptKey}`,
    "",
    ""
  ].join("\r\n"));

  clients.add(socket);
  socket.on("data", (buffer) => {
    const text = readFrame(buffer);
    if (text) handleMessage(socket, text);
  });
  socket.on("close", () => clients.delete(socket));
  socket.on("error", () => clients.delete(socket));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Inventory app running at http://localhost:${PORT}`);
});

globalThis.inventoryServer = server;
