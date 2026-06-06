import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, encryptPayload, decryptPayload } from "@cogniquest/shared";
import apiClient from "./axios";

// Utilize specific socket type for strongly typed events
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;
let _gameServerUrl: string | null = null;

async function resolveGameServerUrl(): Promise<string> {
  if (_gameServerUrl) return _gameServerUrl;

  // 1. Try window.__ENV (injected by layout.tsx)
  if (typeof window !== "undefined" && (window as any).__ENV?.GAME_SERVER_URL) {
    _gameServerUrl = (window as any).__ENV.GAME_SERVER_URL;
    return _gameServerUrl!;
  }

  // 2. Try fetching from our API config endpoint
  try {
    const res = await apiClient.get("/api/config");
    const data = res.data;
    if (data.gameServerUrl) {
      _gameServerUrl = data.gameServerUrl;
      return _gameServerUrl!;
    }
  } catch (e) {
    console.warn("Failed to fetch game server config:", e);
  }

  // 3. Fallback
  _gameServerUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3001";
  return _gameServerUrl!;
}

export const getSocket = (token?: string): GameSocket => {
  if (!socket) {
    // Use cached URL or placeholder; will be updated on connect
    const url = _gameServerUrl || (typeof window !== "undefined" ? (window as any).__ENV?.GAME_SERVER_URL : null) || "http://localhost:3001";
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    // --- Monkey-patch for E2EE (Application-Layer Encryption) ---
    const originalEmit = socket.emit;
    socket.emit = function (event: string, ...args: any[]) {
      const encryptedArgs = args.map(arg => encryptPayload(arg));
      return originalEmit.call(this, event, ...encryptedArgs);
    } as any;

    const originalOn = socket.on;
    socket.on = function (event: string, listener: (...args: any[]) => void) {
      return originalOn.call(this, event, (...args: any[]) => {
        const decryptedArgs = args.map(arg => decryptPayload(arg));
        listener(...decryptedArgs);
      });
    } as any;
    // ------------------------------------------------------------

  } else if (token) {
    socket.auth = { token };
  }
  return socket;
};

/** Initialize socket with the correct server URL (call once at app startup) */
export const initSocket = async (token?: string): Promise<GameSocket> => {
  const url = await resolveGameServerUrl();
  if (socket) {
    // If we already have a socket but URL changed, recreate it
    const currentUrl = (socket.io as any)?.uri;
    if (currentUrl && currentUrl !== url) {
      socket.disconnect();
      socket = null;
    }
  }
  if (!socket) {
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
