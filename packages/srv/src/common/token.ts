import jsonwebtoken from 'jsonwebtoken'
import { config } from '../main/config.js'
import { nanoid } from './utils.js'

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
