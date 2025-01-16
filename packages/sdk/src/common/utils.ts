import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

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

export function omit<T extends object, K extends keyof T>(inObj: T, inKeys: K[]) {
  const obj = inObj as { [key: string]: any }
  const keys = inKeys as string[]
  const result: { [key: string]: any } = {}

  for (const key of Object.keys(obj)) {
    if (obj.hasOwnProperty(key) && !keys.includes(key)) {
      result[key] = obj[key]
    }
  }

  return result as Omit<T, K>
}

export class PromBat<T = void> {
  #prom: Promise<T>
  #res: (inValue: T | PromiseLike<T>) => void = () => {}
  #rej: (inReason?: any) => void = () => {}

  constructor() {
    this.#prom = new Promise<T>((res, rej) => {
      this.#res = res
      this.#rej = rej
    })
  }

  get prom() {
    return this.#prom
  }

  get res() {
    return this.#res
  }

  get rej() {
    return this.#rej
  }
}

export function encrypt(inDataBuf: Buffer, inKeyBuf: Buffer, inIvBuf: Buffer) {
  const cipher = crypto.createCipheriv('aes-256-cbc', inKeyBuf, inIvBuf)
  const buffer = cipher.update(inDataBuf)

  return Buffer.concat([buffer, cipher.final()])
}

export function decrypt(inDataBuf: Buffer, inKeyBuf: Buffer, inIvBuf: Buffer) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', inKeyBuf, inIvBuf)

  const buffer = decipher.update(inDataBuf)

  return Buffer.concat([buffer, decipher.final()])
}

export function md5(inData: Buffer) {
  const hash = crypto.createHash('md5')
  hash.update(inData)

  return hash.digest('hex')
}

export async function tryTimes<R>(
  inFunc: () => Promise<R>,
  inOpts?: {
    times?: number
    delta?: number
  }
) {
  const times = inOpts?.times || 1
  const delta = inOpts?.delta || 3000
  let error: Error = new Error()

  for (let i = 0; i < times; i++) {
    try {
      return await inFunc()
    } catch (inError) {
      error = inError as Error
      await new Promise(resolve => setTimeout(resolve, delta))
    }
  }

  throw error
}

export function readFileSlice(inFd: number, inChunkSize: number, inSliceNo: number) {
  const buf = Buffer.alloc(inChunkSize)
  const pos = inSliceNo * inChunkSize
  const bytesRead = fs.readSync(inFd, buf, 0, inChunkSize, pos)

  if (bytesRead === 0) {
    return Buffer.alloc(0)
  }

  return bytesRead < inChunkSize ? buf.subarray(0, bytesRead) : buf
}

export function pathNormalized(inPath: string) {
  return path.normalize(inPath).replace(/\\/g, '/')
}
