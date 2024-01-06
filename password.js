addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  //add this to cf worker routes with a custom password
  //*-mypassword.mydomain.com/*
  //then access the proxy at https://www-baidu-com-mypassword.mydomain.com/index.html
  let password = "mypass";
  let url = new URL(request.url);
  let path = url.pathname;
  let domainParts = url.hostname.split(".");
  if (domainParts.length > 3) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  let newHostd = domainParts[0].replaceAll("nx----", "xn__").replaceAll("--", "_").replaceAll("-", ".").replaceAll("_", "-");
  let newHost = newHostd.substring(0, newHostd.lastIndexOf("."));
  password = newHostd.substring(newHostd.lastIndexOf(".") + 1);
  if (!newHost.includes(".")) return new Response("Invalid request", { status: 400, statusText: "Bad Request" });
  let userAgent = url.searchParams.get("pua");
  let referer = url.searchParams.get("pref");
  url.searchParams.delete("pua");
  url.searchParams.delete("pref");
  let newRequestHeaders = new Headers(request.headers);
  if (userAgent) {
    newRequestHeaders.set("User-Agent", decodeURIComponent(userAgent));
  }
  if (!referer) {
    referer = `https://${newHost}/`;
  } else {
    referer = decodeURIComponent(referer);
  }
  newRequestHeaders.set("Referer", referer);
  newRequestHeaders.set("Host", newHost);
  const newURL = `https://${newHost}${path}${url.search}`;
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
      return `${prefix}//${replacedURL}-${password}.${baseProxyDomain}/`;
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
