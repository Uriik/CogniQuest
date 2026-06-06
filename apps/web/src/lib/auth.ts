import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema, verifyPassword, signAccessToken, signRefreshToken, verifyRefreshToken, checkRateLimit, RATE_RULES, RedisKvStore, rateKey } from "@cogniquest/auth";
import { getDb, users, getRedisClient } from "@cogniquest/db";
import { eq } from "@cogniquest/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = req?.headers?.get("x-forwarded-for") || "127.0.0.1";
        const redis = getRedisClient();
        const kvStore = new RedisKvStore(redis);
        const limit = await checkRateLimit(kvStore, rateKey("login", ip), RATE_RULES.login);
        
        if (!limit.allowed) {
          throw new Error("Rate limit excedido. Tente novamente mais tarde.");
        }

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error("Credenciais inválidas");
        }

        const { email, password } = parsed.data;

        const db = getDb();
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) {
          throw new Error("Credenciais inválidas");
        }

        const isPasswordValid = await verifyPassword(user.passwordHash, password);
        if (!isPasswordValid) {
          throw new Error("Credenciais inválidas");
        }

        return {
          id: user.id,
          name: user.displayName,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // First login
      if (user) {
        token.id = user.id;
        
        // Generate our own access/refresh tokens
        if (process.env.AUTH_SECRET) {
          const cfg = { secret: process.env.AUTH_SECRET, accessTtlSeconds: 900, refreshTtlSeconds: 2592000 };
          const accessToken = await signAccessToken(user.id as string, cfg);
          const { token: refreshToken, jti } = await signRefreshToken(user.id as string, cfg);
          
          // Store JTI in Redis
          const redis = getRedisClient();
          await redis.setex(jti, cfg.refreshTtlSeconds, "1");
          
          token.accessToken = accessToken;
          token.refreshToken = refreshToken;
          token.accessTokenExpires = Date.now() + cfg.accessTtlSeconds * 1000;
        }
        return token;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      try {
        if (!process.env.AUTH_SECRET || !token.refreshToken) throw new Error("No refresh token");
        const cfg = { secret: process.env.AUTH_SECRET, accessTtlSeconds: 900, refreshTtlSeconds: 2592000 };
        
        // Verify current refresh token
        const claims = await verifyRefreshToken(token.refreshToken as string, cfg);
        
        const redis = getRedisClient();
        const isValid = await redis.get(claims.jti as string);
        if (!isValid) throw new Error("Refresh token consumed or invalid");
        
        // Invalidate old JTI
        await redis.del(claims.jti as string);
        
        // Generate new tokens
        const newAccessToken = await signAccessToken(claims.sub as string, cfg);
        const { token: newRefreshToken, jti: newJti } = await signRefreshToken(claims.sub as string, cfg);
        
        // Store new JTI
        await redis.setex(newJti, cfg.refreshTtlSeconds, "1");
        
        return {
          ...token,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          accessTokenExpires: Date.now() + cfg.accessTtlSeconds * 1000,
        };
      } catch (error) {
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      if (token && typeof token.id === "string") {
        session.user.id = token.id;
      }
      if (token.accessToken) {
        // @ts-ignore
        session.accessToken = token.accessToken;
      }
      if (token.error) {
        // @ts-ignore
        session.error = token.error;
      }
      return session;
    },
  },
});
