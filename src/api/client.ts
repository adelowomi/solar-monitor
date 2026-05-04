import type { ApiResponse } from "./types";
import { generateSignHeaders } from "../lib/sign";

const API_BASE = import.meta.env.VITE_API_BASE as string | undefined;

/** Paths that require IOT-Open-* signing headers (matches the official web app). */
const SIGN_PATHS = [
  "/login/",
  "/app/scan/qrcode/login",
  "/user/register/",
  "/user/create/account",
  "/user/send/sms/captcha",
  "/user/send/email/captcha",
  "/user/reset/password",
  "/deviceManufacturer/add",
];

if (!API_BASE) {
  console.warn(
    "VITE_API_BASE is not set. Create a .env.local file with VITE_API_BASE=https://your-proxy.workers.dev/apis"
  );
}

export class ApiError extends Error {
  code: number;
  isAuth: boolean;

  constructor(message: string, code: number, isAuth: boolean) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.isAuth = isAuth;
  }
}

interface ApiCallOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
  query?: Record<string, string>;
}

export async function apiCall<T>(
  path: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const { method = "GET", body, token, query } = options;

  const base = API_BASE ?? "";
  const url = new URL(base + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      url.searchParams.set(k, v);
    }
  }

  const bodyStr = body ? JSON.stringify(body) : undefined;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "IOT-Time-Zone": "Africa/Lagos",
  };

  // Signing headers are only required for login/registration endpoints
  if (SIGN_PATHS.some((p) => path.startsWith(p))) {
    const signHeaders = generateSignHeaders(url.toString(), method, bodyStr);
    Object.assign(headers, signHeaders);
  }
  if (token) headers["IOT-Token"] = token;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: bodyStr,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (json.code !== 0) {
    const isAuth = /token|auth|expired|login/i.test(json.message);
    throw new ApiError(json.message || "API error", json.code, isAuth);
  }

  return json.data;
}
