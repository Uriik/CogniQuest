import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@cogniquest/shared";

// Utilize specific socket type for strongly typed events
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export const getSocket = (token?: string): GameSocket => {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3001";
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
  } else if (token) {
    socket.auth = { token };
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
