import { COOKIE_NAME } from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { supabase } from "../../lib/supabase";

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  /**
   * Authenticate a request using Supabase Auth
   */
  async authenticateRequest(req: Request): Promise<User> {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = token || cookies.get(COOKIE_NAME);

    if (!sessionToken) {
      throw ForbiddenError("Missing tactical session token");
    }

    // Verify token with Supabase
    // Note: We use getUser(token) which is secure as it re-validates the JWT with Supabase Auth
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(sessionToken);

    if (error || !sbUser) {
      console.warn("[Auth] Tactical session verification failed:", error?.message);
      throw ForbiddenError("Invalid session. Protocol rejected.");
    }

    // Lookup user in our DB by Supabase ID (stored as openId for backward compatibility or we can just use ID)
    let user = await db.getUserByOpenId(sbUser.id);

    if (!user) {
      // Auto-sync user if they exist in Supabase but not our database
      const signedInAt = new Date();
      await db.upsertUser({
        openId: sbUser.id,
        email: sbUser.email ?? null,
        name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || null,
        lastSignedIn: signedInAt,
        isEmailVerified: sbUser.email_confirmed_at ? true : false,
        loginMethod: 'supabase',
      });
      user = await db.getUserByOpenId(sbUser.id);
    }

    if (!user) {
      throw ForbiddenError("Operative record not found in tactical DB.");
    }

    return user;
  }

  /**
   * Stub for session creation - Supabase handles this on the client
   */
  async createSessionToken(openId: string, options: any = {}): Promise<string> {
    // This is primarily used in local auth which we are replacing
    console.warn("[Auth] createSessionToken called - Supabase should handle this on the client side.");
    return "";
  }
}

export const sdk = new SDKServer();
