export function pick<T extends {}, K extends keyof T>(inObj: T, inKeys: K[]) {
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

export function omit<T extends {}, K extends keyof T>(inObj: T, inKeys: K[]) {
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
