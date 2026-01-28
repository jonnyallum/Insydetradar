import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as stripe from "./stripe";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
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
