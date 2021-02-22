'use strict'

import { Socket } from 'net'
import { IncomingMessage } from 'http'

import WebSocket from 'ws'

import Application from './lib/Application'

/** Default message interface */
export interface DefaultMessage {
  [key: string]: any
}

/** Default state interface */
export interface DefaultState {
  [key: string]: any
}

/** Default context interface */
export interface DefaultContext<TMessage, TState> {
  app: Application<TMessage, TState>,
  req: IncomingMessage,
  raw: Socket,
  state: TState,
  socket?: WebSocket,
  send?: (message: TMessage) => Promise<void>
}

export const CODES: {
  [key: number]: string
} = {
  4400: 'Bad Request',
  4401: 'Unauthorized',
  4404: 'Not Found',
  4500: 'Internal Server Error'
}

/** Represents a WebSocket error */
export class WebSocketError extends Error {
  public readonly code: number
  public readonly expose: boolean

  public constructor (code = 4500, message = CODES[code], expose?: boolean) {
    super(message ?? 'Unknown error')
    this.code = code
    this.expose = expose ?? code < 4500
  }
}

export { default } from './lib/Application'
