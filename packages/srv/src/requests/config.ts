import { config } from '../main/config.js'
import { type IContext, type IHttpConfigRes } from '../types/http.js'

export default async (ctx: IContext<IHttpConfigRes>) => {
  ctx.body = {
    tryTimes: config.get('tryTimes'),
    tryDelta: config.get('tryDelta'),
    maxUploadTasks: config.get('maxUploadTasks'),
    maxDownloadTasks: config.get('maxDownloadTasks'),
    maxFailedTasks: config.get('maxFailedTasks'),
    uploadThreads: config.get('uploadThreads'),
    downloadThreads: config.get('downloadThreads'),
    noVerifyUpload: config.get('noVerifyUpload'),
    noVerifyDownload: config.get('noVerifyDownload'),
    noVerifyDownloadOnDisk: config.get('noVerifyDownloadOnDisk'),
    username: config.get('username'),
    password: config.get('password'),
    port: config.get('port'),
    token_secret: config.get('token_secret'),
  }
}
