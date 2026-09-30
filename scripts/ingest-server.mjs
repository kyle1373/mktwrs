import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("archive/raw");
http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/capture") {
      if (req.headers.origin !== "http://127.0.0.1:4319") {
        res.writeHead(403).end();
        return;
      }
      let body = "";
      for await (const c of req) {
        body += c;
        if (body.length > 20000000) {
          res.writeHead(413).end();
          return;
        }
      }
      try {
        const data = JSON.parse(new URLSearchParams(body).get("payload"));
        const name = data.name;
        if (!/^[a-z0-9-]+$/.test(name)) throw Error("name");
        fs.writeFileSync(
          path.join(root, name + ".json"),
          JSON.stringify(data, null, 2),
        );
        res.setHeader("Content-Type", "text/plain");
        res.end("Saved " + name);
        console.log("Saved", name);
      } catch (e) {
        res.writeHead(400).end(String(e));
      }
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><title>Local archive capture</title><h1>Local archive capture</h1><form method="post" action="/capture" id="capture"><label for="payload">Capture JSON</label><textarea id="payload" name="payload"></textarea><button>Save capture</button></form><output id="status"></output><script>async function save(){const r=await fetch("/capture",{method:"POST",body:new URLSearchParams(new FormData(document.getElementById("capture")))});document.getElementById("status").textContent=await r.text();}document.getElementById("capture").onsubmit=(e)=>{e.preventDefault();save()};document.getElementById("payload").oninput=save;</script>',
    );
  })
  .listen(4319, "127.0.0.1", () =>
    console.log("Archive capture http://127.0.0.1:4319"),
  );
