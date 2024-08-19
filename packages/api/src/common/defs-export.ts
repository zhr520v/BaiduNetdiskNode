export interface IApiErr extends Error {
  errno: number
  res_data: { [key: string]: any }
}
