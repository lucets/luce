'use strict'

import { noopAsync } from './util'

export interface MessageHook<TMessage, TContext> {
  (message: TMessage, ctx: TContext, next: () => Promise<void>): Promise<void>
}

export default class MessageHooks<TMessage, TContext> extends Set<MessageHook<TMessage, TContext>> {
  public static compose<TMessage, TContext> (...stack: MessageHook<TMessage, TContext>[]): MessageHook<TMessage, TContext> {
    return async function composed (message: TMessage, ctx: TContext, next: () => Promise<void>) {
      let index = -1

      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) {
          throw new Error('next() called multiple times')
        }

        index = i
        const fn = stack[i]

        if (fn) {
          return fn(message, ctx, dispatch.bind(null, i + 1))
        } else if (next) {
          return next()
        }
      }

      return dispatch(0)
    }
  }

  public async run (message: TMessage, ctx: TContext) {
    if (!this.size) {
      return
    }

    return MessageHooks.compose(...this.values())(message, ctx, noopAsync)
  }
}
