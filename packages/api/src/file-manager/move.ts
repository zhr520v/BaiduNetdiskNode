import { AxiosRequestConfig } from 'axios'
import { IBody, IQuery, fileManager } from './file-manager'

export function fileManagerMove(
  query: Omit<IQuery, 'opera'>,
  body: IBody,
  options?: AxiosRequestConfig
) {
  return fileManager(
    Object.assign({}, query, {
      opera: 'move',
    }),
    body,
    options
  )
}
