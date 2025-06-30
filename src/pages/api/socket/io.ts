import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponseServerIO } from "@/lib/socket";

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("*First use, initializing Socket.IO");
    const path = "/api/socket/io";
    const httpServer = res.socket.server;
    const io = new ServerIO(httpServer, {
      path: path,
      addTrailingSlash: false,
      cors: { origin: "*", methods: ["GET", "POST"] },
    });
    res.socket.server.io = io;
  }
  res.end();
};

export default ioHandler; 