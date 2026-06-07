import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, encryptPayload, decryptPayload, setSecretKey } from "@cogniquest/shared";
import apiClient from "./axios";

// Utilize specific socket type for strongly typed events
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

function applyE2EEPatch(sock: GameSocket) {
  // Prevent patching twice
  if ((sock as any).__e2ee_patched) return;
  (sock as any).__e2ee_patched = true;

  const originalEmit = sock.emit;
  sock.emit = function (this: any, event: string, ...args: any[]) {
    const encryptedArgs = args.map(arg => {
      if (typeof arg === 'function') return arg;
      return encryptPayload(arg);
    });
    return (originalEmit as any).call(this, event, ...encryptedArgs);
  } as any;

  const originalOn = sock.on;
  const originalOff = sock.off;
  const originalRemoveListener = sock.removeListener;

  sock.on = function (this: any, event: string, listener: (...args: any[]) => void) {
    const wrapper = function(this: any, ...args: any[]) {
      try {
        const decryptedArgs = args.map(arg => {
          if (typeof arg === 'function') return arg;
          return decryptPayload(arg);
        });
        listener.apply(this, decryptedArgs);
      } catch (err) {
        console.error(`Socket.on(${event}) E2EE decryption failed:`, err);
      }
    };
    (listener as any).__e2ee_wrapper = wrapper;
    return (originalOn as any).call(this, event, wrapper);
  } as any;

  sock.off = function (this: any, event: string, listener?: (...args: any[]) => void) {
    if (listener && (listener as any).__e2ee_wrapper) {
      return (originalOff as any).call(this, event, (listener as any).__e2ee_wrapper);
    }
    return (originalOff as any).call(this, event, listener);
  } as any;

  sock.removeListener = sock.off;
}

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
    if (data.wsSecret) {
      setSecretKey(data.wsSecret);
    }
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

    applyE2EEPatch(socket);
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
    applyE2EEPatch(socket);
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
