import "next-auth";

declare module "next-auth" {
  /**
   * Extends the built-in session.user type with the 'id' property.
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
} 