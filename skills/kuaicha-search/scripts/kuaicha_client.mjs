// kuaicha_client.mjs - HTTP client for Kuaicha gateway API
import { getApiKey, BASE_URL } from "./kuaicha_env.mjs";

async function request(path, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "KUAICHA_API_KEY is not set. Export it or store it in ~/.kuaicha/config"
    );
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "open-authorization": `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({ error: "non-JSON response" }));
  if (!res.ok) {
    throw new Error(
      `Kuaicha API error ${res.status}: ${JSON.stringify(body)}`
    );
  }
  return body;
}

/** Discover tools matching a natural-language query */
export async function discover(query, { limit = 5, categoryId } = {}) {
  // Server controls top_k; keep --limit as a client-side cap.
  const payload = { query };
  if (categoryId != null) payload.category_id = categoryId;
  const result = await request("/api_route/skill/match", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const n = parseInt(limit, 10);
  if (Number.isFinite(n) && n > 0 && result && Array.isArray(result.tools)) {
    return { ...result, tools: result.tools.slice(0, n) };
  }
  return result;
}

/** Call a specific tool by tool_id with given params */
export async function call(toolId, params = {}) {
  return request(`/api_route/gateway/${toolId}`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}
