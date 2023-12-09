addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const domainParts = url.hostname.split(".");
  if (domainParts.length > 3) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  let newHostd = domainParts[0].replaceAll("nx----", "xn__").replaceAll("--", "_").replaceAll("-", ".").replaceAll("_", "-");
  let newHost = newHostd.substring(0, newHostd.lastIndexOf("."));
  if (!newHost.includes(".")) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  let port = "";
  const parts = newHost.split(".");
  if (!isNaN(parseInt(parts[parts.length - 1]))) {
    port = parts.pop();
    newHost = parts.join(".");
  }
  let newRequestHeaders = new Headers(request.headers);
  newRequestHeaders.set("Host", newHost);
  newRequestHeaders.set("Referer", `https://${newHost}:${port ? port : 443}/`);
  const newURL = `https://${newHost}:${port ? port : 443}${path}`;
  const modifiedReq = new Request(newURL, {
    method: request.method,
    headers: newRequestHeaders,
    body: request.body,
    redirect: "manual",
  });
  let response = await fetch(modifiedReq);
  let newResponseHeaders = new Headers(response.headers);
  newResponseHeaders.set("access-control-allow-origin", "*");
  newResponseHeaders.set("access-control-allow-credentials", "true");
  newResponseHeaders.delete("content-security-policy");
  newResponseHeaders.delete("content-security-policy-report-only");
  newResponseHeaders.delete("clear-site-data");
  const contentType = response.headers.get("content-type");
  if (contentType && (contentType.includes("text/html") || contentType.includes("text/css"))) {
    let data = await response.text();
    const baseProxyDomain = domainParts.slice(1).join(".");
    data = data.replace(new RegExp("(^|[^+/a-zA-Z0-9])//([a-zA-Z0-9-\\.]+)/", "gi"), (_, prefix, matchedURL) => {
      let replacedURL = matchedURL.replaceAll(":", ".").replaceAll("-", "--").replaceAll(".", "-").replaceAll("xn----", "nx----");
      return `${prefix}//${replacedURL}-yourpassword.${baseProxyDomain}/`;
    });
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: newResponseHeaders,
    });
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newResponseHeaders,
  });
}
