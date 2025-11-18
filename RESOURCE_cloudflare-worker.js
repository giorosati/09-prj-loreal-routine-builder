/* Cloudflare Workers in service-worker syntax start here */
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/* Shared CORS headers so the browser can talk to this Worker */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

/* Build a JSON response that always includes our CORS headers */
function jsonResponse(data, status = 200, extraHeaders) {
  const headers = new Headers(corsHeaders);
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      headers.set(key, value);
    }
  }
  return new Response(JSON.stringify(data), { status, headers });
}

/* Safely read the secret – Wrangler injects it as a global when using service-worker format */
function getOpenAIKey() {
  if (typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.trim() !== "") {
    return OPENAI_API_KEY.trim();
  }
  return "";
}

/* Main handler covers CORS, debug endpoints, validation, and proxying to OpenAI */
async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return jsonResponse({ error: { message: "Invalid request URL" } }, 400);
  }

  if (url.pathname === "/__debug_key") {
    return jsonResponse({ hasKey: Boolean(getOpenAIKey()) });
  }

  if (url.pathname === "/__debug_models") {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      return jsonResponse(
        { error: { message: "OPENAI_API_KEY missing; cannot query models." } },
        500
      );
    }

    try {
      const modelRes = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const raw = await modelRes.text();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        data = null;
      }

      const headers = new Headers(corsHeaders);
      const upstreamType = modelRes.headers.get("content-type");
      if (upstreamType) {
        headers.set("Content-Type", upstreamType);
      }

      if (!modelRes.ok) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Model list request failed",
              status: modelRes.status,
              detail: data ?? raw,
            },
          }),
          { status: modelRes.status, headers }
        );
      }

      if (data === null) {
        return new Response(raw, { status: modelRes.status, headers });
      }

      return new Response(JSON.stringify(data), { status: modelRes.status, headers });
    } catch (err) {
      return jsonResponse(
        { error: { message: "Failed to fetch models", details: err.message } },
        502
      );
    }
  }

  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return jsonResponse(
      {
        error: {
          message:
            "Server misconfiguration: OPENAI_API_KEY is not set in Worker environment. Add the secret in Cloudflare dashboard or via wrangler.",
          type: "server_error",
        },
      },
      500
    );
  }

  let userInput;
  try {
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    const contentLength = request.headers.get("content-length");

    if (contentLength === "0") {
      return jsonResponse({ error: { message: "Empty request body" } }, 400);
    }

    if (contentType && !contentType.includes("application/json")) {
      return jsonResponse(
        { error: { message: "Content-Type must be application/json" } },
        400
      );
    }

    userInput = await request.json();
  } catch (err) {
    return jsonResponse(
      { error: { message: "Invalid JSON body", details: err.message } },
      400
    );
  }

  if (!userInput || typeof userInput !== "object") {
    return jsonResponse(
      {
        error: {
          message: "Request body must be a JSON object with a messages array.",
        },
      },
      400
    );
  }

  if (!Array.isArray(userInput.messages) || userInput.messages.length === 0) {
    return jsonResponse(
      {
        error: {
          message:
            "Request body must include a messages array with at least one item.",
        },
      },
      400
    );
  }

  const normalizedMessages = Array.isArray(userInput.messages)
    ? userInput.messages
    : [];

  const model =
    typeof userInput.model === "string" && userInput.model.trim().length > 0
      ? userInput.model.trim()
      : "gpt-4o";

  const requestBody = {
    model,
    messages: normalizedMessages,
  };

  console.log("Outgoing OpenAI request body", JSON.stringify(requestBody));

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const headers = new Headers(corsHeaders);
    const upstreamType = apiRes.headers.get("content-type");
    if (upstreamType) {
      headers.set("Content-Type", upstreamType);
    }

    const raw = await apiRes.text();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      data = null;
    }

    if (!apiRes.ok) {
      const detail = data ?? (raw || apiRes.statusText || "Empty response body from OpenAI");
      const headerEntries = {};
      for (const [key, value] of apiRes.headers.entries()) {
        headerEntries[key] = value;
      }
      console.error(
        "OpenAI error",
        apiRes.status,
        apiRes.statusText || "(no status text)",
        headerEntries,
        raw || "(no body returned)"
      );
      return new Response(
        JSON.stringify({ error: { message: "Upstream API error", status: apiRes.status, detail } }),
        { status: apiRes.status, headers }
      );
    }

    if (data === null) {
      return new Response(raw, { status: apiRes.status, headers });
    }

    return new Response(JSON.stringify(data), {
      status: apiRes.status,
      headers,
    });
  } catch (err) {
    return jsonResponse(
      { error: { message: "Proxy error", details: err.message } },
      502
    );
  }
}
