import { Server as HttpServer } from "http";
import { Socket } from "net";
import { NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: HttpServer & {
      io?: ServerIO;
    };
  };
};

export const getIo = (): ServerIO | undefined => {
    // This is a placeholder function to be used by server-side components 
    // to get the io instance. The actual instance is attached in pages/api/socket/io.ts
    // In a real app, you'd use a more robust state management or service locator pattern.
    // @ts-ignore
    return global.io;
} 