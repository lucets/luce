# Documentation

Luce is a versatile WebSocket hook framework for node.js.

## Install

Luce can be installed through npm:

```
npm i @lucets/luce
```

## Hooks

Luce is built around the concept of asynchronous hooks.

There are two types of hooks.

### Upgrade hooks

`pre` hooks are run prior to upgrading to WebSocket.

This is an example of a `pre` hook which logs the
requrest URL to the console.

```typescript
app.useUpgrade('pre', async (ctx, next) => {
  console.log(`[pre]: got upgrade request for ${ctx.req.url}`)
  return next()
})
```

`post` hooks are run after upgrading to WebSocket.

This is an example of a `post` hook which logs the successful
upgrade.

```typescript
app.useUpgrade('post', async (ctx, next) => {
  console.log(`[post]: upgrade for ${ctx.req.url} success`)
  return next()
})
```

### Message hooks

Message hooks are run on each received message.

This is an example of a message hook which logs
the message to the console.

```typescript
app.useMessage(async (message, ctx, next) => {
  console.log(`[message]: ${JSON.stringify(message)}`)
  return next()
})
```

## Context and Message

Each hook receives a `Context` object with several properties:

```typescript
export interface DefaultContext<TMessage, TState> {
  app: Application<TMessage, TState>,
  req: IncomingMessage,
  raw: Socket,
  state: TState,
  socket?: WebSocket,
  send?: (message: TMessage) => Promise<void>,
  close?: (code: number, reason?: string) => Promise<void>
}
```

Each message hook also receives a `Message` object.

## Custom types

Both `Message` and `State` are extensible.

```typescript
import Luce, {
  DefaultMessage,
  DefaultState
} from '@lucets/luce`

// Create a message interface
export interface MyMessage extends DefaultMessage {
  cmd: string
}

// Create a state interface
export interface MyState extends DefaultState {
  n: number
}

const app = new Luce<MyMessage, MyState>()
```

## Setting up a server

This is an example of how to use Luce with the node.js
HTTP server.

```typescript
import { Server } from 'http'
import Luce from '@lucets/luce'

const app = new Luce()
const server = new Server(/* optional request listener */)

// add upgrade and message hooks here

server.on('upgrade', app.onUpgrade())
server.listen (3000, () => {
  console.log('server listening on port 3000')
})
```

## Related Modules

* [@lucets/commands](https://github.com/lucets/commands) -
Add routing of messages on message key
* [@lucets/upgrade-hooks](https://github.com/lucets/upgrade-hooks) -
Stand-alone version of the upgrade hook implementation
* [@lucets/message-hooks](https://github.com/lucets/message-hooks) -
Stand-alone version of the message hook implementation
* [@lucets/registry](https://github.com/lucets/registry) -
Client registry
