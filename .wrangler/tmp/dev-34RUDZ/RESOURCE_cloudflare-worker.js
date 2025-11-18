(() => {
  var __defProp = Object.defineProperty;
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

  // ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
  var __facade_middleware__ = [];
  function __facade_register__(...args) {
    __facade_middleware__.push(...args.flat());
  }
  __name(__facade_register__, "__facade_register__");
  function __facade_registerInternal__(...args) {
    __facade_middleware__.unshift(...args.flat());
  }
  __name(__facade_registerInternal__, "__facade_registerInternal__");
  function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
    const [head, ...tail] = middlewareChain;
    const middlewareCtx = {
      dispatch,
      next(newRequest, newEnv) {
        return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
      }
    };
    return head(request, env, ctx, middlewareCtx);
  }
  __name(__facade_invokeChain__, "__facade_invokeChain__");
  function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
    return __facade_invokeChain__(request, env, ctx, dispatch, [
      ...__facade_middleware__,
      finalMiddleware
    ]);
  }
  __name(__facade_invoke__, "__facade_invoke__");

  // ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/loader-sw.ts
  var __FACADE_EVENT_TARGET__;
  if (globalThis.MINIFLARE) {
    __FACADE_EVENT_TARGET__ = new (Object.getPrototypeOf(WorkerGlobalScope))();
  } else {
    __FACADE_EVENT_TARGET__ = new EventTarget();
  }
  function __facade_isSpecialEvent__(type) {
    return type === "fetch" || type === "scheduled";
  }
  __name(__facade_isSpecialEvent__, "__facade_isSpecialEvent__");
  var __facade__originalAddEventListener__ = globalThis.addEventListener;
  var __facade__originalRemoveEventListener__ = globalThis.removeEventListener;
  var __facade__originalDispatchEvent__ = globalThis.dispatchEvent;
  globalThis.addEventListener = function(type, listener, options) {
    if (__facade_isSpecialEvent__(type)) {
      __FACADE_EVENT_TARGET__.addEventListener(
        type,
        listener,
        options
      );
    } else {
      __facade__originalAddEventListener__(type, listener, options);
    }
  };
  globalThis.removeEventListener = function(type, listener, options) {
    if (__facade_isSpecialEvent__(type)) {
      __FACADE_EVENT_TARGET__.removeEventListener(
        type,
        listener,
        options
      );
    } else {
      __facade__originalRemoveEventListener__(type, listener, options);
    }
  };
  globalThis.dispatchEvent = function(event) {
    if (__facade_isSpecialEvent__(event.type)) {
      return __FACADE_EVENT_TARGET__.dispatchEvent(event);
    } else {
      return __facade__originalDispatchEvent__(event);
    }
  };
  globalThis.addMiddleware = __facade_register__;
  globalThis.addMiddlewareInternal = __facade_registerInternal__;
  var __facade_waitUntil__ = Symbol("__facade_waitUntil__");
  var __facade_response__ = Symbol("__facade_response__");
  var __facade_dispatched__ = Symbol("__facade_dispatched__");
  var __Facade_ExtendableEvent__ = class ___Facade_ExtendableEvent__ extends Event {
    static {
      __name(this, "__Facade_ExtendableEvent__");
    }
    [__facade_waitUntil__] = [];
    waitUntil(promise) {
      if (!(this instanceof ___Facade_ExtendableEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this[__facade_waitUntil__].push(promise);
    }
  };
  var __Facade_FetchEvent__ = class ___Facade_FetchEvent__ extends __Facade_ExtendableEvent__ {
    static {
      __name(this, "__Facade_FetchEvent__");
    }
    #request;
    #passThroughOnException;
    [__facade_response__];
    [__facade_dispatched__] = false;
    constructor(type, init) {
      super(type);
      this.#request = init.request;
      this.#passThroughOnException = init.passThroughOnException;
    }
    get request() {
      return this.#request;
    }
    respondWith(response) {
      if (!(this instanceof ___Facade_FetchEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      if (this[__facade_response__] !== void 0) {
        throw new DOMException(
          "FetchEvent.respondWith() has already been called; it can only be called once.",
          "InvalidStateError"
        );
      }
      if (this[__facade_dispatched__]) {
        throw new DOMException(
          "Too late to call FetchEvent.respondWith(). It must be called synchronously in the event handler.",
          "InvalidStateError"
        );
      }
      this.stopImmediatePropagation();
      this[__facade_response__] = response;
    }
    passThroughOnException() {
      if (!(this instanceof ___Facade_FetchEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this.#passThroughOnException();
    }
  };
  var __Facade_ScheduledEvent__ = class ___Facade_ScheduledEvent__ extends __Facade_ExtendableEvent__ {
    static {
      __name(this, "__Facade_ScheduledEvent__");
    }
    #scheduledTime;
    #cron;
    #noRetry;
    constructor(type, init) {
      super(type);
      this.#scheduledTime = init.scheduledTime;
      this.#cron = init.cron;
      this.#noRetry = init.noRetry;
    }
    get scheduledTime() {
      return this.#scheduledTime;
    }
    get cron() {
      return this.#cron;
    }
    noRetry() {
      if (!(this instanceof ___Facade_ScheduledEvent__)) {
        throw new TypeError("Illegal invocation");
      }
      this.#noRetry();
    }
  };
  __facade__originalAddEventListener__("fetch", (event) => {
    const ctx = {
      waitUntil: event.waitUntil.bind(event),
      passThroughOnException: event.passThroughOnException.bind(event)
    };
    const __facade_sw_dispatch__ = /* @__PURE__ */ __name(function(type, init) {
      if (type === "scheduled") {
        const facadeEvent = new __Facade_ScheduledEvent__("scheduled", {
          scheduledTime: Date.now(),
          cron: init.cron ?? "",
          noRetry() {
          }
        });
        __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
        event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
      }
    }, "__facade_sw_dispatch__");
    const __facade_sw_fetch__ = /* @__PURE__ */ __name(function(request, _env, ctx2) {
      const facadeEvent = new __Facade_FetchEvent__("fetch", {
        request,
        passThroughOnException: ctx2.passThroughOnException
      });
      __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
      facadeEvent[__facade_dispatched__] = true;
      event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
      const response = facadeEvent[__facade_response__];
      if (response === void 0) {
        throw new Error("No response!");
      }
      return response;
    }, "__facade_sw_fetch__");
    event.respondWith(
      __facade_invoke__(
        event.request,
        globalThis,
        ctx,
        __facade_sw_dispatch__,
        __facade_sw_fetch__
      )
    );
  });
  __facade__originalAddEventListener__("scheduled", (event) => {
    const facadeEvent = new __Facade_ScheduledEvent__("scheduled", {
      scheduledTime: event.scheduledTime,
      cron: event.cron,
      noRetry: event.noRetry.bind(event)
    });
    __FACADE_EVENT_TARGET__.dispatchEvent(facadeEvent);
    event.waitUntil(Promise.all(facadeEvent[__facade_waitUntil__]));
  });

  // ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
  var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
    try {
      return await middlewareCtx.next(request, env);
    } finally {
      try {
        if (request.body !== null && !request.bodyUsed) {
          const reader = request.body.getReader();
          while (!(await reader.read()).done) {
          }
        }
      } catch (e) {
        console.error("Failed to drain the unused request body.", e);
      }
    }
  }, "drainBody");
  var middleware_ensure_req_body_drained_default = drainBody;

  // .wrangler/tmp/bundle-wckLML/middleware-insertion-facade.js
  __facade_registerInternal__([middleware_ensure_req_body_drained_default]);

  // RESOURCE_cloudflare-worker.js
  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });
  var corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };
  function jsonResponse(data, status = 200, extraHeaders) {
    const headers = new Headers(corsHeaders);
    if (extraHeaders) {
      for (const [key, value] of Object.entries(extraHeaders)) {
        headers.set(key, value);
      }
    }
    return new Response(JSON.stringify(data), { status, headers });
  }
  __name(jsonResponse, "jsonResponse");
  function getOpenAIKey() {
    if (typeof OPENAI_API_KEY === "string" && OPENAI_API_KEY.trim() !== "") {
      return OPENAI_API_KEY.trim();
    }
    return "";
  }
  __name(getOpenAIKey, "getOpenAIKey");
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
      const apiKey2 = getOpenAIKey();
      if (!apiKey2) {
        return jsonResponse(
          { error: { message: "OPENAI_API_KEY missing; cannot query models." } },
          500
        );
      }
      try {
        const modelRes = await fetch("https://api.openai.com/v1/models", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey2}`
          }
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
                detail: data ?? raw
              }
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
            message: "Server misconfiguration: OPENAI_API_KEY is not set in Worker environment. Add the secret in Cloudflare dashboard or via wrangler.",
            type: "server_error"
          }
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
            message: "Request body must be a JSON object with a messages array."
          }
        },
        400
      );
    }
    if (!Array.isArray(userInput.messages) || userInput.messages.length === 0) {
      return jsonResponse(
        {
          error: {
            message: "Request body must include a messages array with at least one item."
          }
        },
        400
      );
    }
    const normalizedMessages = Array.isArray(userInput.messages) ? userInput.messages : [];
    const model = typeof userInput.model === "string" && userInput.model.trim().length > 0 ? userInput.model.trim() : "gpt-4o";
    const requestBody = {
      model,
      messages: normalizedMessages
    };
    console.log("Outgoing OpenAI request body", JSON.stringify(requestBody));
    try {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
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
        headers
      });
    } catch (err) {
      return jsonResponse(
        { error: { message: "Proxy error", details: err.message } },
        502
      );
    }
  }
  __name(handleRequest, "handleRequest");
})();
//# sourceMappingURL=RESOURCE_cloudflare-worker.js.map
