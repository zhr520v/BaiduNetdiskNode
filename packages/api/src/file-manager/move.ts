import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, httpFileManager } from './file-manager'

export function httpMove(
  query: Omit<IQuery, 'opera'>,
  body: IBody,
  options?: AxiosRequestConfig
) {
  return httpFileManager(
    Object.assign({}, query, {
      opera: 'move',
    }),
    body,
    options
  )
}
