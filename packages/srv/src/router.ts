import koaRouter from 'koa-router'
import error from './middlewares/error.js'
import needLogin from './middlewares/need-login.js'
import needManager from './middlewares/need-manager.js'
import needUser from './middlewares/need-user.js'
import pre from './middlewares/pre.js'
import reqActTask from './requests/act-task.js'
import reqAddFolder from './requests/add-folder.js'
import reqAddManualDownload from './requests/add-manual-download.js'
import reqAddUser from './requests/add-user.js'
import reqBasic from './requests/basic.js'
import reqConfig from './requests/config.js'
import reqDelFolder from './requests/del-folder.js'
import reqDelUser from './requests/del-user.js'
import reqDiskList from './requests/disk-list.js'
import reqDiskTasks from './requests/disk-tasks.js'
import reqFolder from './requests/folder.js'
import reqFoldersInfo from './requests/folders-info.js'
import reqLocalFolderList from './requests/local-folder-list.js'
import reqLogin from './requests/login.js'
import reqLogout from './requests/logout.js'
import reqManualCheck from './requests/manual-check.js'
import reqModConfig from './requests/mod-config.js'
import reqModFolder from './requests/mod-folder.js'
import reqProxyAuth from './requests/proxy-auth.js'
import reqProxyInfo from './requests/proxy-info.js'
import reqUsers from './requests/users.js'

const router = new koaRouter()

router.use(error)

router.post('/api/login', pre, reqLogin)
router.post('/api/logout', pre, reqLogout)

router.post('/api/act-task', pre, needLogin, needUser, needManager, reqActTask)
router.post('/api/add-folder', pre, needLogin, needUser, needManager, reqAddFolder)
router.post(
  '/api/add-manual-download',
  pre,
  needLogin,
  needUser,
  needManager,
  reqAddManualDownload
)
router.post('/api/add-user', pre, needLogin, reqAddUser)
router.post('/api/basic', pre, needLogin, reqBasic)
router.post('/api/config', pre, needLogin, reqConfig)
router.post('/api/del-folder', pre, needLogin, needUser, needManager, reqDelFolder)
router.post('/api/del-user', pre, needLogin, needUser, reqDelUser)
router.post('/api/disk-list', pre, needLogin, needUser, needManager, reqDiskList)
router.post('/api/disk-tasks', pre, needLogin, needUser, needManager, reqDiskTasks)
router.post('/api/folder', pre, needLogin, needUser, needManager, reqFolder)
router.post('/api/folders-info', pre, needLogin, needUser, needManager, reqFoldersInfo)
router.post('/api/local-folder-list', pre, needLogin, reqLocalFolderList)
router.post('/api/manual-check', pre, needLogin, needUser, needManager, reqManualCheck)
router.post('/api/mod-config', pre, needLogin, reqModConfig)
router.post('/api/mod-folder', pre, needLogin, needUser, needManager, reqModFolder)
router.post('/api/proxy-auth', pre, needLogin, reqProxyAuth)
router.post('/api/proxy-info', pre, needLogin, reqProxyInfo)
router.post('/api/users', pre, needLogin, reqUsers)

export default router
