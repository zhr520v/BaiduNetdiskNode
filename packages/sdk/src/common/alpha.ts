export type PromType<T> = T extends Promise<infer A> ? A : never
