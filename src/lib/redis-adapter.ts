import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters";
import type { Session, User } from "@prisma/client";

const TOKEN_EXPIRATION = 2 * 60 * 60; // 2 hours

export function RedisAdapter(p: typeof prisma): Adapter {
  const prismaAdapter = PrismaAdapter(p);

  // If Redis is not configured, return the base Prisma adapter without any caching.
  if (!redis) {
    return prismaAdapter;
  }

  // If we're here, Redis is configured. We wrap the adapter methods.
  return {
    ...prismaAdapter,
    createSession: async (session) => {
      const createdSession = await prismaAdapter.createSession!(session);
      try {
        if (redis) {
          await redis.setex(`session:${createdSession.sessionToken}`, TOKEN_EXPIRATION, JSON.stringify(createdSession));
        }
      } catch (e) {
        console.error("Redis [createSession]:", e);
      }
      return createdSession;
    },
    getSessionAndUser: async (sessionToken) => {
      try {
        if (redis) {
            const cachedSessionData = await redis.get<Session>(`session:${sessionToken}`);
            if (cachedSessionData) {
              await redis.expire(`session:${sessionToken}`, TOKEN_EXPIRATION);

              const userData = await redis.get<User>(`user:${cachedSessionData.userId}`);
              
              if (userData) {
                  console.log("✅ [Cache Hit] Session and user retrieved from Redis.");
                  const session: AdapterSession = { 
                    ...cachedSessionData, 
                    expires: new Date(cachedSessionData.expires) 
                  };
                  const user: AdapterUser = { 
                    ...userData, 
                    emailVerified: userData.emailVerified ? new Date(userData.emailVerified) : null,
                    email: userData.email || "" // Ensure email is never null for AdapterUser
                  };

                  await redis.expire(`user:${user.id}`, TOKEN_EXPIRATION);
                  return { session, user };
              }
            }
        }
      } catch(e) {
        console.error("Redis [getSessionAndUser - get]:", e);
      }

      console.log("🟡 [Cache Miss] Session not in Redis, fetching from database.");
      const result = await prismaAdapter.getSessionAndUser!(sessionToken);
      if (result && redis) {
        try {
          console.log(" caching session for next time.");
          await redis.setex(`session:${result.session.sessionToken}`, TOKEN_EXPIRATION, JSON.stringify(result.session));
          await redis.setex(`user:${result.user.id}`, TOKEN_EXPIRATION, JSON.stringify(result.user));
        } catch (e) {
          console.error("Redis [getSessionAndUser - set]:", e);
        }
      }
      return result;
    },
    updateSession: async (session) => {
        const updatedSession = await prismaAdapter.updateSession!(session);
        if (updatedSession && redis) {
            try {
              await redis.setex(`session:${updatedSession.sessionToken}`, TOKEN_EXPIRATION, JSON.stringify(updatedSession));
            } catch(e) {
              console.error("Redis [updateSession]:", e);
            }
        }
        return updatedSession;
    },
    deleteSession: async (sessionToken) => {
      try {
        if (redis) {
          await redis.del(`session:${sessionToken}`);
        }
      } catch(e) {
        console.error("Redis [deleteSession]:", e);
      }
      await prismaAdapter.deleteSession!(sessionToken);
    },
    createUser: async (user: User) => {
        const createdUser = await prismaAdapter.createUser!(user);
        try {
          if (redis) {
            await redis.setex(`user:${createdUser.id}`, TOKEN_EXPIRATION, JSON.stringify(createdUser));
          }
        } catch(e) {
          console.error("Redis [createUser]:", e);
        }
        return createdUser;
    },
    updateUser: async (user) => {
        const updatedUser = await prismaAdapter.updateUser!(user);
        try {
          if (redis) {
            await redis.setex(`user:${updatedUser.id}`, TOKEN_EXPIRATION, JSON.stringify(updatedUser));
          }
        } catch(e) {
          console.error("Redis [updateUser]:", e);
        }
        return updatedUser;
    }
  };
} 