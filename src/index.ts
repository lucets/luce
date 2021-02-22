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
  send?: (message: TMessage) => Promise<void>,
  close?: (code: number, reason?: string) => Promise<void>
}

export { default } from './lib/Application'

export {
  default as MessageHooks,
  MessageHook
} from './lib/MessageHooks'

export {
  default as UpgradeHooks,
  UpgradeHook
} from './lib/UpgradeHooks'

export {
  WS_CODES,
  WebSocketError
} from './lib/util'
