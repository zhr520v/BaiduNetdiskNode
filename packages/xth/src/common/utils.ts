export function toJSON<T = Record<string, any>>(inStr: string, inDefault?: T) {
  try {
    return JSON.parse(inStr) as T
  } catch {
    return inDefault || ({} as T)
  }
}
