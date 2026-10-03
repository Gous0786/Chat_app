// Minimal STOMP-over-SockJS client for k6, speaking the same wire protocol as
// the browser (sockjs-client + stompjs) against Spring's /websocket endpoint.
//
// SockJS raw-websocket transport:  /websocket/{server}/{session}/websocket
//   server -> client:  "o" open, "h" heartbeat, "a[...]" message batch, "c[...]" close
//   client -> server:  a JSON array of strings, each a full STOMP frame
import { WebSocket } from 'k6/websockets';
import { WS_URL, ORIGIN } from './common.js';

function randomId(len) {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function frame(command, headers, body = '') {
  let f = command + '\n';
  for (const k in headers) f += `${k}:${headers[k]}\n`;
  return f + '\n' + body + '\0';
}

function parseFrame(raw) {
  const sep = raw.indexOf('\n\n');
  const head = sep >= 0 ? raw.slice(0, sep) : raw;
  let body = sep >= 0 ? raw.slice(sep + 2) : '';
  if (body.endsWith('\0')) body = body.slice(0, -1);
  const lines = head.split('\n').filter((l) => l.length);
  const command = lines.shift() || '';
  const headers = {};
  for (const l of lines) {
    const i = l.indexOf(':');
    if (i > 0) headers[l.slice(0, i)] = l.slice(i + 1);
  }
  return { command, headers, body };
}

/**
 * Opens a SockJS websocket and performs the STOMP CONNECT handshake.
 * handlers: onConnected(client, connectMs), onMessage(frame), onError(err), onClose()
 */
export function stompConnect(handlers, tags = {}) {
  const url = `${WS_URL}/websocket/${Math.floor(Math.random() * 1000)}/${randomId(8)}/websocket`;
  const started = Date.now();
  const ws = new WebSocket(url, null, { headers: { Origin: ORIGIN }, tags });
  let subSeq = 0;
  let closed = false;

  const client = {
    send(destination, body) {
      ws.send(JSON.stringify([frame('SEND', { destination, 'content-type': 'application/json' }, body)]));
    },
    subscribe(destination) {
      const id = `sub-${subSeq++}`;
      ws.send(JSON.stringify([frame('SUBSCRIBE', { id, destination })]));
      return id;
    },
    close() {
      if (closed) return;
      closed = true;
      try {
        ws.send(JSON.stringify([frame('DISCONNECT', {})]));
      } catch (_) {}
      ws.close();
    },
    get isClosed() {
      return closed;
    },
  };

  ws.onmessage = (e) => {
    const data = e.data;
    if (typeof data !== 'string' || data.length === 0) return;
    const type = data[0];
    if (type === 'o') {
      ws.send(JSON.stringify([frame('CONNECT', { 'accept-version': '1.1,1.0', 'heart-beat': '0,0' })]));
    } else if (type === 'a') {
      for (const raw of JSON.parse(data.slice(1))) {
        const f = parseFrame(raw);
        if (f.command === 'CONNECTED') handlers.onConnected && handlers.onConnected(client, Date.now() - started);
        else if (f.command === 'MESSAGE') handlers.onMessage && handlers.onMessage(f);
        else if (f.command === 'ERROR') handlers.onError && handlers.onError(new Error(f.headers.message || 'STOMP ERROR'));
      }
    } else if (type === 'c') {
      handlers.onError && handlers.onError(new Error('SockJS close ' + data));
    }
    // 'h' heartbeats are ignored.
  };
  ws.onerror = (e) => {
    closed = true;
    handlers.onError && handlers.onError(e.error || new Error('websocket error'));
  };
  ws.onclose = () => {
    closed = true;
    handlers.onClose && handlers.onClose();
  };
  return client;
}
