'use strict'

import { STATUS_CODES } from 'http'

export async function noopAsync () {}

/** Create a HTTP response. */
export function toHttpResponse (
  statusCode: number,
  message: string,
  expose = statusCode < 500,
  headers: { [key: string]: any } = {}
): string {
  message = expose ? message : STATUS_CODES[statusCode] as string

  headers = {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(message),
    'Connection': 'close',
    ...headers
  }

  return `HTTP/1.1 ${statusCode} ${STATUS_CODES[statusCode]}\r\n` +
    Object.keys(headers)
      .map(key => `${key}: ${headers[key]}`)
      .join('\r\n') +
    '\r\n\r\n' +
    message
}

/** WebSocket close status codes */
export const WS_CODES: {
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

  public constructor (code = 4500, message = WS_CODES[code], expose?: boolean) {
    super(message ?? 'Unknown error')
    this.code = code
    this.expose = expose ?? code < 4500
  }
}
