import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import scoresHandler from "./api/scores.js";

const port = Number(process.env.PORT || 3000);
const publicRoot = join(process.cwd(), "public");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" };

createServer(async (request, response) => {
  if (request.url?.startsWith("/api/scores")) {
    response.status = (code) => { response.statusCode = code; return response; };
    response.json = (value) => { response.setHeader("Content-Type", "application/json; charset=utf-8"); response.end(JSON.stringify(value)); };
    return scoresHandler(request, response);
  }

  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicRoot, safePath);
  if (!filePath.startsWith(publicRoot)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Golf Picks Live running at http://127.0.0.1:${port}`);
});
