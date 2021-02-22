'use strict'

export interface UpgradeHook<TContext> {
  (ctx: TContext, next: () => Promise<void>): Promise<void>
}

export default class UpgradeHooks<TContext> extends Set<UpgradeHook<TContext>> {
  public static compose<TContext> (...stack: UpgradeHook<TContext>[]): UpgradeHook<TContext> {
    return async function composed (ctx: TContext, next: () => Promise<void>) {
      let index = -1

      const dispatch = async (i: number): Promise<void> => {
        if (i <= index) {
          throw new Error('next() called multiple times')
        }

        index = i
        const fn = stack[i]

        if (fn) {
          return fn(ctx, dispatch.bind(null, i + 1))
        } else if (next) {
          return next()
        }
      }

      return dispatch(0)
    }
  }

  public async run (ctx: TContext): Promise<void> {
    if (!this.size) {
      return
    }

    return UpgradeHooks.compose(...this.values())(ctx, async () => {})
  }
}
