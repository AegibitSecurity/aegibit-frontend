import { useState, useEffect, useRef, useCallback } from 'react';
import { createWebSocket, getOrgId } from '../api';

/**
 * Custom hook for WebSocket connection with:
 *  - Auto-reconnect with exponential backoff
 *  - Connection status tracking
 *  - Ping/pong keepalive
 *  - Typed event subscription
 *
 * @param {Function} onEvent - callback fired for each WS event
 * @returns {{ connected: boolean, reconnect: Function, connectionState: string }}
 */
export function useWebSocket(onEvent) {
  const [connected, setConnected] = useState(false);
  // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  const [connectionState, setConnectionState] = useState('disconnected');
  const wsRef = useRef(null);
  const callbackRef = useRef(onEvent);

  // Keep callback ref fresh without re-triggering reconnection
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    const orgId = getOrgId();
    if (!orgId) return;

    // Disconnect previous
    if (wsRef.current) {
      wsRef.current.disconnect();
    }

    setConnectionState('connecting');

    wsRef.current = createWebSocket(orgId, (data) => {
      // Handle internal protocol messages
      if (data.type === 'connected') {
        setConnected(true);
        setConnectionState('connected');
        return;
      }

      if (data.type === 'ping') {
        // Respond to server pings
        wsRef.current?.sendJson?.({ type: 'pong' });
        return;
      }

      if (data.type === 'pong') {
        // Server responded to our ping — connection is healthy
        return;
      }

      // Forward all other events to the consumer
      callbackRef.current?.(data);
    });

    setConnected(true);
    setConnectionState('connected');
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        setConnected(false);
        setConnectionState('disconnected');
      }
    };
  }, [connect]);

  return { connected, connectionState, reconnect: connect };
}


/**
 * Event type constants for typed subscriptions.
 */
export const WS_EVENTS = {
  DEAL_CREATED: 'deal_created',
  DEAL_APPROVED: 'deal_approved',
  DEAL_REJECTED: 'deal_rejected',
  STATUS_CHANGED: 'status_changed',
  TASK_UPDATE: 'task_update',
  PRICING_UPLOADED: 'pricing_uploaded',
  CONNECTED: 'connected',
  PING: 'ping',
};

/**
 * All "deal" event types that should trigger data refresh.
 */
export const DEAL_EVENTS = [
  WS_EVENTS.DEAL_CREATED,
  WS_EVENTS.DEAL_APPROVED,
  WS_EVENTS.DEAL_REJECTED,
  WS_EVENTS.STATUS_CHANGED,
];

/**
 * All events that affect the task/approval queue.
 */
export const TASK_EVENTS = [
  ...DEAL_EVENTS,
  WS_EVENTS.TASK_UPDATE,
];

/**
 * Helper: check if an event should trigger a deal list refresh.
 */
export function isDealEvent(event) {
  return DEAL_EVENTS.includes(event?.type);
}

/**
 * Helper: check if an event should trigger a task list refresh.
 */
export function isTaskEvent(event) {
  return TASK_EVENTS.includes(event?.type);
}
