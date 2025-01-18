import jsonwebtoken from 'jsonwebtoken'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../main/config.js'

export type PromType<T> = T extends Promise<infer A> ? A : never

export type ArrayItemType<T> = T extends (infer A)[] ? A : never

const __ALGORITHM__ = 'HS256'
const __ISSUER__ = 'keenghost'

export function newToken() {
  return jsonwebtoken.sign({ secret: nanoid(16) }, config.get('token_secret'), {
    algorithm: __ALGORITHM__,
    issuer: __ISSUER__,
  })
}

export function verifyToken(inToken: string) {
  return jsonwebtoken.verify(inToken, config.get('token_secret'), {
    issuer: __ISSUER__,
  })
}

export function toJSON<T = Record<string, any>>(inStr: string, inDefault?: T) {
  try {
    return JSON.parse(inStr) as T
  } catch {
    return inDefault || ({} as T)
  }
}

export function dirname(importMetaUrl: string) {
  return path.dirname(fileURLToPath(importMetaUrl))
}

export function pathNormalized(inPath: string) {
  return path.normalize(inPath).replace(/\\/g, '/')
}

export function pick<T extends object, K extends keyof T>(inObj: T, inKeys: K[]) {
  const obj = inObj as { [key: string]: any }
  const keys = inKeys as string[]
  const result: { [key: string]: any } = {}

  for (const key of Object.keys(obj)) {
    if (obj.hasOwnProperty(key) && keys.includes(key)) {
      result[key] = obj[key]
    }
  }

  return result as Pick<T, K>
}

/**
 * snippet from nanoid
 */
const __TABLE__ = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

export function nanoid(inSize = 32) {
  let id = ''
  let size = inSize

  while (size--) {
    id = id + __TABLE__[(Math.random() * 64) | 0]
  }

  return id
}
