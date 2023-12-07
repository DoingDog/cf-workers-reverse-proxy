addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const domainParts = url.hostname.split(".");
  if (domainParts.length > 3) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  let newHost = domainParts[0].replaceAll("--", "__").replace(/-/g, ".").replaceAll("__", "-");
  if (!newHost.includes(".")) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  const newURL = `https://${newHost}${path}`;
  const modifiedReq = new Request(newURL, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  let response = await fetch(modifiedReq);
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    let data = await response.text();
    const baseProxyDomain = domainParts.slice(1).join(".");
    data = data.replace(new RegExp("(^|[^+/a-zA-Z0-9])//([a-zA-Z0-9-\\.]+)/", "gi"), (_, prefix, matchedURL) => {
      let replacedURL = matchedURL.replaceAll(".", "-").replaceAll("--", "----");
      return `${prefix}//${replacedURL}.${baseProxyDomain}/`;
    });
    return new Response(data, {
      headers: response.headers,
    });
  }
  return response;
}
