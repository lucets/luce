'use strict'

import { STATUS_CODES } from 'http'

/** Create a HTTP response. */
export function toHttpResponse (
  statusCode: number,
  message: string,
  expose = statusCode < 500,
  headers: { [key: string]: any } = {}
): string {
  message = expose ? message : STATUS_CODES[statusCode]

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
