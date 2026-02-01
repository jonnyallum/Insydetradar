import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as stripe from "./stripe";
import { tradingRouter } from "./trading-router";

import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

import { hashPassword, verifyPassword, generateVerificationCode } from "./utils/auth-utils";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "../shared/const.js";
import { supabase } from "../lib/supabase";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,

  // Trading Engine (Alpaca integration)
  trading: tradingRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    signup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              full_name: input.name,
            }
          }
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Tactical registration failed.");

        // If session is created immediately (auto-confirm), set cookie
        if (data.session) {
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, data.session.access_token, {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS
          });
        }

        return { success: true, email: input.email };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (error) throw new Error("Invalid credentials. Access denied.");
        if (!data.user || !data.session) throw new Error("Identity verification failed.");

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, data.session.access_token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS
        });

        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            isEmailVerified: !!data.user.email_confirmed_at
          }
        };
      }),

    verifyEmail: protectedProcedure
      .input(z.object({ code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user.email) throw new Error("Operative email not found.");

        const { data, error } = await supabase.auth.verifyOtp({
          email: ctx.user.email,
          token: input.code,
          type: 'signup',
        });

        if (error) throw new Error(`Protocol rejected: ${error.message}`);

        return { success: true };
      }),

    resendVerification: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user.email) throw new Error("Operative email not found.");

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: ctx.user.email,
        });

        if (error) throw new Error(`Signal dispatch failed: ${error.message}`);

        return { success: true };
      }),

    updatePushToken: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(users).set({ pushToken: input.token }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      await supabase.auth.signOut();
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Stripe Payment Routes
  payments: router({
    // Get publishable key for client-side Stripe initialization
    getPublishableKey: publicProcedure.query(() => {
      return {
        publishableKey: stripe.getPublishableKey(),
        isLiveMode: stripe.isLiveMode(),
      };
    }),

    // Create a payment intent for in-app deposits
    createPaymentIntent: protectedProcedure
      .input(z.object({
        amount: z.number().min(100).max(1000000), // $1 to $10,000 in cents
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripe.createPaymentIntent({
          amount: input.amount,
          metadata: {
            userId: ctx.user.id.toString(),
            userEmail: ctx.user.email || '',
            type: 'deposit',
          },
        });
        return result;
      }),

    // Create a checkout session for web-based deposits
    createCheckoutSession: protectedProcedure
      .input(z.object({
        amount: z.number().min(100).max(1000000), // $1 to $10,000 in cents
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripe.createCheckoutSession({
          amount: input.amount,
          customerEmail: ctx.user.email || undefined,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: {
            userId: ctx.user.id.toString(),
            type: 'deposit',
          },
        });
        return result;
      }),

    // Verify a checkout session after redirect
    verifyCheckoutSession: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const session = await stripe.getCheckoutSession(input.sessionId);
        return {
          success: session.paymentStatus === 'paid',
          amount: session.amountTotal / 100, // Convert to dollars
          currency: session.currency.toUpperCase(),
          status: session.paymentStatus,
        };
      }),

    // Get or create Stripe customer for user
    getOrCreateCustomer: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user.email) {
          throw new Error('User email is required to create a Stripe customer');
        }
        const customer = await stripe.createOrGetCustomer({
          email: ctx.user.email,
          name: ctx.user.name || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
          },
        });
        return customer;
      }),
  }),
});

export type AppRouter = typeof appRouter;
