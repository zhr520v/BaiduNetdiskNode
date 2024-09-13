export interface IBaiduApiError extends Error {
  errno: number
  res_data: { [key: string]: any }
}
