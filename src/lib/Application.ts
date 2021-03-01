'use strict'

import { EventEmitter } from 'events'
import { Socket } from 'net'
import { IncomingMessage } from 'http'

import WebSocket, { Server, ServerOptions } from 'ws'
import createHttpError, { isHttpError } from 'http-errors'
import UpgradeHooks, { UpgradeHook } from '@lucets/upgrade-hooks'
import MessageHooks, { MessageHook } from '@lucets/message-hooks'

import {
  DefaultContext,
  DefaultState,
  DefaultMessage,
  WebSocketError
} from '../index'

import { toHttpResponse } from './util'

export interface Options {
  handleProtocols?: (protocol: string[]) => string
}

export default class Application<
  TMessage extends DefaultMessage = DefaultMessage,
  TState extends DefaultState = DefaultState
> extends EventEmitter {
  #server: Server
  #upgradePreHooks: UpgradeHooks<DefaultContext<TMessage, TState>> = new UpgradeHooks()
  #upgradePostHooks: UpgradeHooks<DefaultContext<TMessage, TState>> = new UpgradeHooks()
  #messageHooks: MessageHooks<TMessage, DefaultContext<TMessage, TState>> = new MessageHooks()

  public constructor (opts: Options = {}) {
    super()

    const serverOpts: ServerOptions = {
      ...opts,
      noServer: true
    }

    this.#server = new Server(serverOpts)
  }

  /**
   * Use one or more upgrade hooks.
   * @param type Hook type ('pre' or 'post')
   * @param hooks One or more upgrade hooks
   */
  public useUpgrade (type: 'pre' | 'post', ...hooks: UpgradeHook<DefaultContext<TMessage, TState>>[]): this {
    if (!hooks.length) {
      throw new TypeError('useUpgrade() expects at least one hook')
    }

    const dest = type === 'pre' ? this.#upgradePreHooks : this.#upgradePostHooks
    for (const hook of hooks) {
      dest.add(hook)
    }

    return this
  }

  /**
   * Use one or more message hooks.
   * @param hooks One or more message hooks
   */
  public useMessage (...hooks: MessageHook<TMessage, DefaultContext<TMessage, TState>>[]): this {
    if (!hooks.length) {
      throw new TypeError('useMessage() expects at least one hook')
    }

    for (const hook of hooks) {
      this.#messageHooks.add(hook)
    }

    return this
  }

  /** Upgrade method. */
  public onUpgrade () {
    return async (req: IncomingMessage, raw: Socket, head: Buffer) => {
      // Create a new context
      const ctx = this.createContext(req, raw)

      // Handle the upgrade to WebSocket
      try {
        await this.handleUpgrade(ctx, head)
      } catch (e) {
        // Emit error if it's a server error
        if (e.statusCode >= 500 && e.statusCode <= 599) {
          this.emit('error', e, ctx)
        } else if (e.code >= 4500 && e.code <= 4599) {
          this.emit('error', e, ctx)
        }

        return
      }

      const { socket } = ctx

      // Handle incoming messages
      const onMessage = async (message: string) => {
        try {
          await this.handleMessage(message, ctx)
        } catch (e) {
          // Close the WebSocket connection
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(e.code, e.message)
          }

          // Emit the error if it's a Server Error
          if (e.code >= 4500) {
            this.emit('error', e, ctx)
          }
        }
      }

      // Handle WebSocket errors
      const onError = (err: Error) => {
        // TODO
      }

      // Handle WebSocket close
      const onClose = () => {
        socket.removeListener('message', onMessage)
        socket.removeListener('error', onError)

        delete ctx.socket
        delete ctx.send
        delete ctx.close
      }

      // Add event listeners
      socket.on('message', onMessage)
      socket.on('error', onError)
      socket.once('close', onClose)
    }
  }

  private async handleUpgrade (ctx: DefaultContext<TMessage, TState>, head: Buffer) {
    // Run upgrade pre hooks
    try {
      await this.#upgradePreHooks.run(ctx)
    } catch (e) {
      // Error running pre hooks
      if (!isHttpError(e)) {
        e = createHttpError(500, e)
      }

      // Send HTTP error to client and close the connection
      const { raw } = ctx
      if (raw.writable) {
        await new Promise<void>(resolve => {
          raw.end(toHttpResponse(e.statusCode, e.message, e.expose), resolve)
        })
      }

      throw e
    }

    // Upgrade to WebSocket
    const socket = ctx.socket = await new Promise<WebSocket>(resolve => {
      this.#server.handleUpgrade(ctx.req, ctx.raw, head, resolve)
    })

    // Define the send function on the context
    ctx.send = async function send (message) {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error('Socket not open')
      }

      return new Promise<void>((resolve, reject) => {
        socket.send(JSON.stringify(message), err => {
          if (err) return reject(err)
          resolve()
        })
      })
    }

    // Define the close function on the context
    ctx.close = async function close (code: number, reason?: string) {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error('Socket not open')
      }

      return new Promise<void>(resolve => {
        socket.once('close', resolve)
        ctx.socket.close(code, reason)
      })
    }

    // Run upgrade post hooks
    try {
      await this.#upgradePostHooks.run(ctx)
    } catch (e) {
      // Error running upgrade post hooks
      if (!(e instanceof WebSocketError)) {
        // 4500 = Internal Server Error
        e = new WebSocketError(4500)
      }

      // Close the WebSocket connection
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(e.code, e.message)
      }

      throw e
    }
  }

  private async handleMessage (message: string, ctx: DefaultContext<TMessage, TState>) {
    let msg: TMessage

    // Parse message
    try {
      msg = JSON.parse(message)
    } catch (e) {
      // Unable to parse message
      throw new WebSocketError(4400)
    }

    // Run message hooks
    try {
      await this.#messageHooks.run(msg, ctx)
    } catch (e) {
      // Error running message hooks
      if (!(e instanceof WebSocketError)) {
        // 4500 - Internal Server Error
        e = new WebSocketError(4500)
      }

      throw e
    }
  }

  private createContext (req: IncomingMessage, raw: Socket): DefaultContext<TMessage, TState> {
    return {
      app: this,
      req,
      raw,
      state: <any>{}
    }
  }
}
