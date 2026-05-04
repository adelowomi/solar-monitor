import { apiCall } from "./client";
import { md5 } from "../lib/md5";
import type { LoginData, Session } from "./types";

export async function login(account: string, password: string): Promise<Session> {
  const data = await apiCall<LoginData>("/login/account", {
    method: "POST",
    body: { account, password: md5(password) },
  });

  return {
    token: data.accessToken,
    account: data.account,
    expiresAt: data.accessTokenWillExpiredAt,
  };
}
