# Baidu Netdisk Api

基于百度网盘 API 的 node 封装, 同时对成功响应的业务错误进行了处理.

<p style="background: #F0F099; padding: 10px; border-left: 3px solid #B5B588; color: #FF0000;">本项目属于 PureESM, 只能使用 ES Import 导入.</p>

## 安装

```
pnpm add baidu-netdisk-api
```

## 使用方法

```typescript
import { httpFileInfo } from 'baidu-netdisk-api'

const { data } = await httpFileInfo({
  access_token: 'your access token',
  fsids: JSON.stringify([id1, id2, id3]),
})
```

## 项目测试

```
git clone https://github.com/keenghost/BaiduNetdiskNode.git BaiduNetdiskNode
cd BaiduNetdiskNode && pnpm i
touch packages/api/tmp/test.config.json // 填写自己的 access_token 和 app_name
pnpm test api
```

## 接口列表

> 参数具体说明请参考[百度网盘开放平台](https://pan.baidu.com/union).

- #### httpCode2Token

  将授权码转换为 token. 获取授权码的链接拼接方式请参考[百度网盘开放平台](https://pan.baidu.com/union).

- #### httpRefreshToken

  使用 refresh_token 获取新的 refresh_token 和 access_token.

- #### httpFileInfo

  获取文件信息.

- #### httpFileListRecursion

  递归获取目录下的文件列表.

- #### httpFileList

  获取目录下的文件列表.

- #### httpFileManager

  管理文件, 可执行 copy, delete, move, rename 操作.

- #### httpCopy

  复制文件, file_manage 的分支.

- #### httpDelete

  删除文件, file_manage 的分支.

- #### httpMove

  移动文件, file_manage 的分支.

- #### httpRename

  重命名文件, file_manage 的分支.

- #### httpTaskQuery

  查询文件操作的异步任务状态.

- #### httpCreateFolder

  创建文件夹.

- #### httpUploadUrl

  获取文件上传地址.

- #### httpUploadId

  获取文件上传 id.

- #### httpUploadSlice

  上传文件分片.

- #### httpUploadFinish

  合并文件分片.

- #### httpUploadSmall

  4MB 以下的文件直接上传.

- #### httpUserInfo

  获取用户基本信息.

- #### httpUserQuota

  获取用户网盘信息.
