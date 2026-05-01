// Tests for useWebSocket hook
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.readyState = 3; // CLOSED
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.();
  }

  static reset() {
    MockWebSocket.instances = [];
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.reset();
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('creates WebSocket connection on mount', () => {
    renderHook(() => useWebSocket('ws://localhost:3001/ws'));
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3001/ws');
  });

  it('sets connected to true on open', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));
    expect(result.current.connected).toBe(false);

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    expect(result.current.connected).toBe(true);
  });

  it('receives and parses WebSocket messages', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      MockWebSocket.instances[0].simulateMessage({
        type: 'agent:status',
        data: { id: 'agent-1', status: 'analyzing' },
        timestamp: Date.now(),
      });
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].type).toBe('agent:status');
  });

  it('sets connected to false on close', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      MockWebSocket.instances[0].simulateClose();
    });
    expect(result.current.connected).toBe(false);
  });

  it('keeps last 100 events (overflow trimming)', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      for (let i = 0; i < 110; i++) {
        MockWebSocket.instances[0].simulateMessage({
          type: 'agent:status',
          data: { i },
          timestamp: i,
        });
      }
    });

    expect(result.current.events.length).toBeLessThanOrEqual(101);
  });

  it('ignores malformed JSON messages', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));

    act(() => {
      MockWebSocket.instances[0].simulateOpen();
    });

    act(() => {
      // Send raw non-JSON string
      MockWebSocket.instances[0].onmessage?.({ data: 'not json' });
    });

    expect(result.current.events).toHaveLength(0);
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('ws://localhost:3001/ws'));
    const ws = MockWebSocket.instances[0];

    unmount();
    expect(ws.readyState).toBe(3); // CLOSED
  });
});
