const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof body === "object" && body?.message ? body.message : "Something went wrong.";
    throw new Error(message);
  }

  return body;
}

export async function apiRequest(path, options = {}) {
  const token = window.localStorage.getItem("mess-management-token");
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  return parseResponse(response);
}

export async function loginRequest(identifier, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password })
  });
}
