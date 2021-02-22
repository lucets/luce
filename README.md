# Luce

Luce is a versatile WebSocket framework for node.js.

It is the spiritual successor to [illustriws](https://github.com/MichielvdVelde/illustriws)
and [signal-fire](https://github.com/MichielvdVelde/signal-fire).

## Features

* Based around asynchronous hooks analogous to middelware in e.g.
[koa](https://github.com/koajs/koa)
* Run hooks before and after the HTTP request upgrades to WebSocket
* Run hooks on each received message

## Install

> Luce is a **work in progress**.

Install luce through npm:

```
npm i @lucets/luce
```

## Documentation

Documentation is forthcoming.
In the mean time the example will have to do.

## Example

A very complicated-looking example which demonstrates
key features.

```ts
'use strict'

import { Server } from 'http'

import Application, { DefaultMessage, DefaultState } from './index'
import { nanoid } from 'nanoid/async'

import createHttpError from 'http-errors'

/** Custom message interface */
export interface MyMessage extends DefaultMessage {
  cmd: string
}

/** Custom state interface */
export interface MyState extends DefaultState {
  id?: string,
  received: number
}

const app = new Application<MyMessage, MyState>()
const server = new Server((req, res) => {
  let statusCode: number
  let message: string

  if (req.url.startsWith('/socket')) {
    statusCode = 426
    message = 'Upgrade Required'
  } else {
    statusCode = 404
    message = 'Not Found'
  }

  res.writeHead(statusCode, message, {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(message)
  })

  res.end(message)
})

// These hooks are run prior to upgrading to WebSocket
app.useUpgrade('pre', async (ctx, next) => {
  // Check if the request path is valid
  if (!ctx.req.url.startsWith('/socket')) {
    throw createHttpError(404)
  }

  return next()
})

// These hooks are run after upgrading to WebSocket
app.useUpgrade('post', async (ctx, next) => {
  // Generate a client ID if none is set
  if (!ctx.state.id) {
    ctx.state.id = await nanoid()
  }
  return next()
}, async (ctx, next) => {
  // Send welcome message to the client
  await ctx.send({ cmd: 'welcome', id: ctx.state.id })
  return next()
})

// These hooks are run on each received message
app.useMessage(async (message, _ctx, next) => {
  // Log the message to the console
  console.log(`[message]: ${JSON.stringify(message)}`)
  return next()
}, async (_message, ctx, next) => {
  // Count the number of received messages
  ctx.state.received = (ctx.state.received ?? 0) + 1
  return next()
}, async (_message, ctx, next) => {
  // Log the number of received messages to the console
  console.log(`[message]: received: ${ctx.state.received}`)
  return next()
})

server.on('upgrade', app.onUpgrade())
server.listen(3003, () => {
  console.log('Server listening on port 3003')
})
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
