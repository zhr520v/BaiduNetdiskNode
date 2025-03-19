# Baidu Netdisk Api

基于百度网盘 API 的 node 封装, 同时对成功响应的业务错误进行了处理.

> ⚠️ 本项目属于 PureESM, 只能使用 ES Import 导入。

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

## 通用参数

以下参数在大多数 API 中通用:

- `access_token`: string - 百度网盘访问令牌, 通过授权流程获取
- `inOpts`: AxiosRequestConfig - 可选参数, 自定义Axios请求配置, 所有接口的最后一个参数

## 接口列表

> 参数具体说明请参考[百度网盘开放平台](https://pan.baidu.com/union).

- ### httpCode2Token

  将授权码转换为 token. 获取授权码的链接拼接方式请参考[百度网盘开放平台授权说明](https://pan.baidu.com/union/doc/ol0rsap9t).

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      code: string // 授权码, 用户授权后获得
      client_id: string // 应用的API Key, 开发者中心获取
      client_secret: string // 应用的Secret Key, 开发者中心获取
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      access_token: string // 访问令牌
      refresh_token: string // 刷新令牌, 用于刷新access_token
      expires_in: number // 过期时间(秒), 一般为30天
      scope: string // 授权权限范围
    }
    ```

- ### httpRefreshToken

  使用 refresh_token 获取新的 refresh_token 和 access_token, 在access_token过期前调用.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      refresh_token: string // 刷新令牌, 上次获取的refresh_token
      client_id: string // 应用的API Key, 开发者中心获取
      client_secret: string // 应用的Secret Key, 开发者中心获取
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      access_token: string // 新的访问令牌
      refresh_token: string // 新的刷新令牌
      expires_in: number // 过期时间(秒), 一般为30天
      scope: string // 授权权限范围
    }
    ```

- ### httpFileInfo

  获取文件信息, 可同时获取多个文件的元信息.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      fsids: string // 文件ID列表的JSON字符串, 如 "[123456,234567]"
      thumb?: number // 是否需要缩略图, 0:不需要, 1:需要
      dlink?: number // 是否需要下载链接, 0:不需要, 1:需要
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      list: Array<{
        fs_id: number // 文件ID
        path: string // 文件路径
        server_filename: string // 文件名
        size: number // 文件大小(字节)
        server_mtime: number // 服务器修改时间
        server_ctime: number // 服务器创建时间
        local_mtime: number // 本地修改时间
        local_ctime: number // 本地创建时间
        isdir: number // 是否为目录, 0:文件, 1:目录
        category: number // 文件类型, 1:视频, 2:音频, 3:图片, 4:文档, 5:应用, 6:其他, 7:种子
        md5: string // 文件MD5值
        thumbs?: {
          // 缩略图信息(仅当thumb=1时返回)
          icon: string // 缩略图地址
          url1: string // 小图地址
          url2: string // 中图地址
          url3: string // 大图地址
        }
        dlink?: string // 下载链接(仅当dlink=1时返回)
      }>
    }
    ```

- ### httpFileListRecursion

  递归获取目录下的文件列表, 可一次性获取所有子文件.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      path: string // 目录路径, 以 / 开头的绝对路径
      recursion?: number // 是否递归获取所有子目录文件, 0:否, 1:是
      web?: string // 是否获取web端显示缩略图地址, "1":是
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      list: Array<{
        fs_id: number // 文件ID
        path: string // 文件路径
        server_filename: string // 文件名
        size: number // 文件大小(字节)
        server_mtime: number // 服务器修改时间
        server_ctime: number // 服务器创建时间
        local_mtime: number // 本地修改时间
        local_ctime: number // 本地创建时间
        isdir: number // 是否为目录, 0:文件, 1:目录
        category: number // 文件类型, 同httpFileInfo
        md5: string // 文件MD5值
      }>
      has_more: number // 是否有更多文件, 0:否, 1:是
    }
    ```

- ### httpFileList

  获取目录下的文件列表, 支持分页获取.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      dir: string // 目录路径, 以 / 开头的绝对路径
      order?: string // 排序字段, time:修改时间, name:文件名, size:文件大小
      desc?: number // 排序方式, 0:升序, 1:降序
      start?: number // 起始位置, 从0开始
      limit?: number // 获取数量, 默认1000
      web?: string // 是否获取web端显示缩略图地址, "1":是
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      list: Array<{
        fs_id: number // 文件ID
        path: string // 文件路径
        server_filename: string // 文件名
        size: number // 文件大小(字节)
        server_mtime: number // 服务器修改时间
        server_ctime: number // 服务器创建时间
        local_mtime: number // 本地修改时间
        local_ctime: number // 本地创建时间
        isdir: number // 是否为目录, 0:文件, 1:目录
        category: number // 文件类型, 同httpFileInfo
        md5: string // 文件MD5值(文件夹为空)
      }>
      has_more: number // 是否有更多文件, 0:否, 1:是
    }
    ```

- ### httpFileManager

  管理文件, 可执行 copy, delete, move, rename 操作.

  - **Parameters**: (queryParams, requestBody, [inOpts])

    ```typescript
    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
      opera: string // 操作类型: copy|delete|move|rename
    }

    // requestBody - 请求体参数
    {
      filelist: string // 文件列表JSON字符串, 见下方格式说明
      async?: number // 是否异步执行, 0:同步, 1:异步
      ondup?: string // 重名处理策略, fail:报错, newcopy:重命名, overwrite:覆盖
    }

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

    filelist格式说明:

    - copy操作: `[{"path":"/源文件路径","dest":"/目标目录","newname":"新文件名"}]`
    - delete操作: `[{"path":"/删除的文件路径"}]`
    - move操作: `[{"path":"/源文件路径","dest":"/目标目录","newname":"新文件名"}]`
    - rename操作: `[{"path":"/源文件路径","newname":"新文件名"}]`

  - **Response**:
    ```typescript
    {
      taskid?: number // 异步任务ID(仅async=1时返回)
      info?: Array<{ // 操作结果(仅async=0时返回)
        errno: number // 错误码, 0表示成功
        path: string // 文件路径
        newname?: string // 新名称(仅rename操作)
      }>
    }
    ```

- ### httpCopy

  复制文件, httpFileManager 的分支.

  - 同 httpFileManager, 自动设置 opera=copy

- ### httpDelete

  删除文件, httpFileManager 的分支.

  - 同 httpFileManager, 自动设置 opera=delete

- ### httpMove

  移动文件, httpFileManager 的分支.

  - 同 httpFileManager, 自动设置 opera=move

- ### httpRename

  重命名文件, httpFileManager 的分支.

  - 同 httpFileManager, 自动设置 opera=rename

- ### httpTaskQuery

  查询文件操作的异步任务状态, 用于查询httpFileManager异步操作的执行结果.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      taskid: number // 任务ID, 从httpFileManager返回获取
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      status: number // 任务状态, 0:排队中, 1:执行中, 2:已完成, 3:失败
      procedure: number // 任务进度, 单位百分比
      task_errno: number // 任务错误码, 0表示成功
    }
    ```

- ### httpCreateFolder

  创建文件夹, 支持递归创建.

  - **Parameters**: (queryParams, requestBody, [inOpts])

    ```typescript
    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
    }

    // requestBody - 请求体参数
    {
      path: string // 文件夹路径, 以 / 开头的绝对路径
      isdir?: number // 固定为1
      rtype?: number // 冲突处理类型, 0:不覆盖(默认), 1:覆盖同名文件, 2:自动重命名, 3:覆盖同名目录
    }

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

  - **Response**:
    ```typescript
    {
      fs_id: number // 文件夹ID
      path: string // 文件夹路径
      ctime: number // 创建时间, UNIX时间戳
      mtime: number // 修改时间, UNIX时间戳
      isdir: number // 固定为1
    }
    ```

- ### httpUploadUrl

  获取文件上传地址, 上传文件前调用.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      path: string // 文件路径, 用于校验权限
      uploadid: string // 上传ID, 从httpUploadId获取
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      servers: Array<{
        server: string // 上传服务器地址, 用于后续上传接口
      }>
    }
    ```

- ### httpUploadId

  获取文件上传ID, 分片上传的第一步.

  - **Parameters**: (queryParams, requestBody, [inOpts])

    ```typescript
    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
    }

    // requestBody - 请求体参数
    {
      path: string // 文件保存路径, 以 / 开头的绝对路径
      size: number // 文件大小, 单位字节
      block_list: string // 分片MD5列表的JSON字符串, 如 "[\"md5-1\",\"md5-2\"]"
      isdir?: number // 固定为0
      autoinit?: number // 是否自动初始化, 固定为1
      rtype?: number // 冲突处理类型, 同httpCreateFolder
    }

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

  - **Response**:
    ```typescript
    {
      uploadid: string // 上传ID, 用于后续上传接口
      block_list: Array<number> // 分片索引列表, 索引从0开始
      return_type: number // 返回类型, 1:需要上传, 2:秒传成功, 3:需要分片上传
    }
    ```

- ### httpUploadSlice

  上传文件分片, 分片大小一般为4MB.

  - **Parameters**: (server, queryParams, buffer, [inOpts])

    ```typescript
    // server - 上传服务器地址, 从httpUploadUrl获取
    // string

    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
      path: string // 文件路径
      uploadid: string // 上传ID, 从httpUploadId获取
      partseq: number // 分片序号, 从0开始
    }

    // buffer - 分片数据
    // Buffer

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

  - **Response**:
    ```typescript
    {
      md5: string // 分片MD5值
    }
    ```

- ### httpUploadFinish

  合并文件分片, 分片上传的最后一步.

  - **Parameters**: (queryParams, requestBody, [inOpts])

    ```typescript
    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
    }

    // requestBody - 请求体参数
    {
      path: string // 文件路径
      uploadid: string // 上传ID, 从httpUploadId获取
      block_list: string // 分片索引列表的JSON字符串, 如 "[0,1,2]"
      isdir?: number // 固定为0
      rtype?: number // 冲突处理类型, 同httpCreateFolder
    }

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

  - **Response**:
    ```typescript
    {
      fs_id: number // 文件ID
      path: string // 文件路径
      size: number // 文件大小(字节)
      md5: string // 文件MD5值
      ctime: number // 创建时间, UNIX时间戳
      mtime: number // 修改时间, UNIX时间戳
      category: number // 文件类型, 同httpFileInfo
      isdir: number // 固定为0
    }
    ```

- ### httpUploadSmall

  4MB以下的小文件直接上传, 无需分片.

  - **Parameters**: (server, queryParams, buffer, [inOpts])

    ```typescript
    // server - 上传服务器地址, 例如 "https://c.pcs.baidu.com"
    // string

    // queryParams - 查询参数
    {
      access_token: string // 访问令牌
      path: string // 文件路径, 以 / 开头的绝对路径
      ondup?: string // 冲突处理策略, 同httpFileManager
    }

    // buffer - 文件数据, 小于4MB
    // Buffer

    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```

  - **Response**:
    ```typescript
    {
      fs_id: number // 文件ID
      path: string // 文件路径
      size: number // 文件大小(字节)
      md5: string // 文件MD5值
      ctime: number // 创建时间, UNIX时间戳
      mtime: number // 修改时间, UNIX时间戳
      category: number // 文件类型, 同httpFileInfo
      isdir: number // 固定为0
    }
    ```

- ### httpUserInfo

  获取用户基本信息.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      baidu_name: string // 百度用户名
      netdisk_name: string // 网盘用户名
      avatar_url: string // 头像URL
      vip_type: number // VIP类型, 0:普通用户, 1:普通会员, 2:超级会员
      uk: number // 用户ID, 网盘用户唯一标识
    }
    ```

- ### httpUserQuota

  获取用户网盘空间使用情况.

  - **Parameters**: (params, [inOpts])
    ```typescript
    // 参数对象
    {
      access_token: string // 访问令牌
      checkfree?: number // 是否检查剩余空间, 0:否, 1:是
      checkexpire?: number // 是否检查容量是否过期, 0:否, 1:是
    }
    // inOpts?: AxiosRequestConfig - 自定义请求配置
    ```
  - **Response**:
    ```typescript
    {
      total: number // 总空间大小(字节)
      used: number // 已使用空间大小(字节)
      free: number // 剩余空间大小(字节), 仅当checkfree=1时返回
      expire: boolean // 容量是否过期, 仅当checkexpire=1时返回
    }
    ```
