const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    fs.readFile(path.join(__dirname, "socket-test.html"), (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Error loading test page: ${err.message}`);
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

const PORT = 3030;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log("Open this URL in your browser to test Socket.IO connections");
});
