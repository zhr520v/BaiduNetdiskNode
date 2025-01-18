import { type IContext } from '../types/http.js'

export default async (ctx: IContext) => {
  ctx.cookies.set('baidusync_token', null, {
    maxAge: 0,
  })
}
