import koaRouter from 'koa-router'
import error from './middlewares/error.js'
import pre from './middlewares/pre.js'
import reqAuth from './requests/auth.js'
import reqInfo from './requests/info.js'
import reqRefresh from './requests/refresh.js'

const router = new koaRouter()

router.use(error)

router.post('/api/auth', pre, reqAuth)
router.post('/api/info', pre, reqInfo)
router.post('/api/refresh', pre, reqRefresh)

export default router
