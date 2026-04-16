# 情侣小程序落地执行清单

  ## Summary

  目标是直接进入实现阶段，做一个仅供你和女朋友使用的微信小程序，第一版包含：情侣绑定、照片上传与相册、纪念日、留言、数据导出、每日备份。
  技术方案固定为：微信小程序原生 + 云函数 + 云开发数据库 + 腾讯云 COS。
  下面这份清单按真实开发顺序组织，可以直接交给模型或工程师逐项实现，不再留产品决策。

  ## Implementation Changes

  ### 1. 项目初始化

  先完成工程骨架和环境配置，保证后续开发都基于同一套约束。

  要做的事：

  - 在项目根目录补齐小程序基础配置文件：
      - project.config.json
      - miniprogram/app.js
      - miniprogram/app.json
      - miniprogram/app.wxss
  - 在 miniprogram/config/ 下新增环境配置模块：
      - env.js
      - constants.js
      - error-codes.js
  - 在 miniprogram/utils/ 下新增公共工具：
      - request.js
      - auth.js
      - date.js
      - guard.js
      - toast.js
  - 在 miniprogram/services/ 下新增服务封装：
      - auth.js
      - couple.js
      - photos.js
      - anniversaries.js
      - messages.js
      - exports.js

  固定要求：

  - 所有页面进入时先检查登录与绑定状态
  - 所有云函数调用都通过 services/ 封装
  - 所有错误码都从 error-codes.js 读取，不允许散落硬编码
  - 所有时间展示都由 date.js 统一处理

  ### 2. 数据库与索引

  先把数据库集合和字段结构定死，再开发接口。

  创建集合：

  - users
  - couples
  - photos
  - anniversaries
  - messages
  - exports
  - backup_jobs

  字段定义固定为上一版方案中的结构，不允许改名。实现时需要补充默认值约束：

  - photos.isDeleted 默认 false
  - anniversaries.isDeleted 默认 false
  - messages.isDeleted 默认 false
  - couples.status 初始值 pending
  - exports.status 初始值 pending
  - backup_jobs.status 初始值 pending

  索引要求：

  - users.openid
  - users.coupleId
  - couples.code
  - couples.memberAOpenid
  - couples.memberBOpenid
  - photos.coupleId + isDeleted + createdAt
  - anniversaries.coupleId + isDeleted + date
  - messages.coupleId + isDeleted + createdAt
  - exports.coupleId + createdAt
  - backup_jobs.jobDate

  实现策略：

  - 代码里不要依赖数据库自动推断
  - README 里必须提供集合初始化和索引创建步骤
  - 云函数里写参数校验，避免脏数据进入库中

  ### 3. 云函数实现顺序

  按下面顺序做，前一个完成后再做下一个，避免并行乱套。

  #### 第一步：auth

  职责：

  - 获取当前 OPENID
  - 自动初始化 users
  - 返回当前用户资料、绑定状态、情侣信息摘要

  实现：

  - 入口参数：action
  - 当前只支持 bootstrap
  - 若 users 中不存在当前 openid，自动创建新记录
  - 返回统一结构 { code, message, data }

  返回数据固定：

  {
    "user": {},
    "couple": null,
    "isBound": false
  }

  #### 第二步：couple

  职责：

  - 创建情侣空间
  - 生成绑定码
  - 用绑定码加入
  - 查询当前情侣信息

  实现接口：

  - createCouple
  - joinCouple
  - getCurrentCouple

  规则固定：

  - 绑定码 6 位，字符集为大写字母和数字
  - 一个用户已有 active 情侣关系时，禁止再创建或加入
  - 一个 couple 最多 2 人
  - 第二人加入成功后：
      - couples.status = active
      - 双方 users.coupleId 都更新
      - 双方 partnerOpenid 都更新
  - pending 状态超过 7 天只标记失效，不自动删库

  #### 第三步：photos

  职责：

  - 申请上传票据
  - 上传确认入库
  - 列表查询
  - 详情签名
  - 删除恢复
  - 回收站列表

  实现接口：

  - createUploadTicket
  - confirmUpload
  - listPhotos
  - getPhotoDetail
  - deletePhoto
  - restorePhoto
  - listRecycleBin

  固定上传流程：

  1. 前端选图
  2. 调 createUploadTicket
  3. 云函数生成 photoId、cosKey、thumbnailKey
  4. 前端上传原图到 COS
  5. 前端上传完成后调 confirmUpload
  6. 云函数校验对象存在
  7. 云函数写 photos 元数据
  8. 刷新列表

  固定校验：

  - 当前用户必须已绑定情侣空间
  - confirmUpload 时必须校验 cosKey 对象存在
  - 不允许同一个 photoId 重复确认写入
  - 删除时只更新：
      - isDeleted = true
      - deletedAt
      - deletedBy
      - updatedAt
  - 恢复时只把删除字段恢复，不改 cosKey

  分页规则：

  - listPhotos 默认每页 20 条
  - 按 createdAt desc
  - 支持 page, pageSize, month

  详情规则：

  - getPhotoDetail 返回：
      - 照片元数据
      - 缩略图临时 URL
      - 原图临时 URL
  - URL 有效期固定 600 秒

  #### 第四步：anniversaries

  职责：

  - 增删改查纪念日

  接口：

  - createAnniversary
  - updateAnniversary
  - deleteAnniversary
  - listAnniversaries

  规则：

  - date 必须为 YYYY-MM-DD
  - title 最长 30 字
  - remark 最长 200 字
  - 删除为软删除

  #### 第五步：messages

  职责：

  - 发布留言
  - 查询留言
  - 删除自己留言

  接口：

  - createMessage
  - listMessages
  - deleteMessage

  规则：

  - content 最长 300 字
  - 默认倒序
  - 删除时校验 senderOpenid === currentOpenid

  #### 第六步：export

  职责：

  - 创建导出任务
  - 聚合当前情侣空间元数据
  - 写出 zip 或 json 包到 COS
  - 更新 exports

  接口：

  - createExportJob

  第一版最小实现：

  - 可以先导出 json 汇总文件，不强制打包全部原图
  - 导出内容至少包含：
      - users.json
      - couple.json
      - photos.json
      - anniversaries.json
      - messages.json

  #### 第七步：backup

  职责：

  - 每日自动备份数据库快照和照片对象清单

  接口：

  - runDailyBackup

  执行逻辑：

  - 扫描所有集合导出 json
  - 扫描 COS 照片目录生成 manifest
  - 写入：
      - system/backups/{yyyyMMdd}/db-snapshot.json
      - system/backups/{yyyyMMdd}/photos-manifest.json
  - 记录到 backup_jobs

  定时触发：

  - 每天凌晨 3 点

  ### 4. COS 集成

  把 COS 接入当成独立子任务做，不混在页面逻辑里。

  必须完成：

  - 在云函数侧接入 COS SDK
  - 实现上传目标路径生成器
  - 实现临时签名 URL 生成器
  - 实现对象存在性校验方法
  - 实现导出文件写入方法
  - 实现备份文件写入方法

  固定路径规则：

  - 原图：couples/{coupleId}/photos/original/{yyyy}/{MM}/{photoId}-{filename}
  - 缩略图：couples/{coupleId}/photos/thumb/{yyyy}/{MM}/{photoId}.jpg
  - 导出：couples/{coupleId}/exports/{yyyyMMdd}/{exportId}.zip
  - 备份：system/backups/{yyyyMMdd}/photos-manifest.json
  - 备份：system/backups/{yyyyMMdd}/db-snapshot.json

  实现要求：

  - 开启 COS 版本控制
  - 原图不覆盖
  - 不直接物理删除原图
  - 签名 URL 只在云函数中生成
  - 密钥只出现在云函数环境变量里

  ### 5. 小程序页面实现顺序

  按页面依赖顺序来做。

  #### pages/bind

  先做，因为其他核心页面都依赖它。
  功能：

  - 显示当前用户是否已绑定
  - 创建情侣空间
  - 输入绑定码加入
  - 成功后跳首页

  状态：

  - 未绑定空态
  - 创建中加载态
  - 加入失败错误态

  #### pages/home

  第二个做，用来串联核心能力。
  功能：

  - 显示情侣摘要
  - 最近 6 张照片
  - 最近纪念日
  - 最近 3 条留言
  - 跳转各子页面

  #### pages/gallery

  第三个做，是第一版最关键页面。
  功能：

  - 上传照片
  - 照片列表
  - 单张详情
  - 删除
  - 恢复
  - 回收站入口
  - 月份筛选

  组件要求：

  - 上传按钮
  - 照片网格
  - 分页加载
  - 删除确认弹窗

  #### pages/anniversaries

  第四个做。
  功能：

  - 列表
  - 新建
  - 编辑
  - 删除
  - 展示倒计时

  #### pages/messages

  第五个做。
  功能：

  - 留言列表
  - 发送留言
  - 删除自己留言

  #### pages/profile

  最后做。
  功能：

  - 个人资料摘要
  - 情侣绑定信息
  - 数据导出入口
  - 回收站入口
  - 存储占用概览

  ### 6. 前端状态与交互规则

  固定交互，不要在实现时自由发挥。

  - app.js 启动后先初始化云能力
  - 首页进入前执行 auth.bootstrap
  - 若 isBound=false，跳转 pages/bind
  - 所有页面统一使用加载态和错误提示
  - 上传时显示进度条
  - 删除照片时弹确认框，文案明确“仅移入回收站”
  - 上传成功后自动刷新照片列表第一页
  - 创建纪念日和留言成功后直接回到列表页并局部刷新
  - 数据为空时展示空态插画或占位，不允许白屏

  ### 7. README 与部署文档

  这个部分必须做完整，否则项目无法真正落地。

  README 必须包含：

  - 项目简介
  - 功能列表
  - 技术栈
  - 目录结构说明
  - 微信开发者工具导入方式
  - 云开发环境配置
  - COS 存储桶配置步骤
  - 云函数环境变量配置
  - 数据库集合创建步骤
  - 索引创建步骤
  - 定时触发器配置
  - 本地开发流程
  - 生产部署流程
  - 备份与恢复说明
  - 常见问题

  还要提供一个初始化文档：

  - docs/setup.md
  - docs/database.md
  - docs/backup-and-restore.md

  ### 8. 验收标准

  满足以下条件才算第一版完成：

  - 两个用户能成功绑定成情侣空间
  - 未绑定用户被拦截，无法访问核心功能
  - 照片能上传到 COS，数据库能生成元数据
  - 照片删除后进入回收站，可恢复
  - 纪念日可增删改查
  - 留言可发送和删除自己的内容
  - 首页能聚合展示摘要
  - 可创建导出任务并生成导出记录
  - 每日备份任务可执行并生成备份文件
  - README 足够让另一台机器完成部署

  ## Test Plan

  ### 功能测试

  - 首次登录自动初始化用户记录
  - 创建情侣空间成功生成绑定码
  - 第二人通过绑定码加入成功
  - 已绑定用户再次创建情侣空间失败
  - 第三人加入已满情侣空间失败
  - 上传照片成功后，列表可见
  - 删除照片后主列表不可见、回收站可见
  - 恢复后主列表重新可见
  - 新建纪念日后倒计时显示正确
  - 发送留言后首页和留言页都可见
  - 导出任务创建成功后有记录

  ### 权限测试

  - 未绑定不能上传照片
  - 未绑定不能新建纪念日
  - 未绑定不能发送留言
  - 非本情侣成员不能读取该 coupleId 数据
  - 删除留言时不能删别人内容
  - 前端伪造 openid 不生效

  ### 异常测试

  - COS 上传失败时，前端正确提示
  - confirmUpload 在对象不存在时返回失败
  - 错误绑定码加入失败
  - 过期或失效情侣空间加入失败
  - 不存在的照片执行删除或恢复时返回明确错误
  - 导出失败时 exports.status=failed
  - 备份失败时 backup_jobs.status=failed

  ## Assumptions

  - 只做第一版核心能力，不实现视频、推送、AI 分类、支付
  - 只服务两个用户，不做多人扩展
  - 以“长期可恢复”为目标，不承诺单平台绝不丢失
  - 现有仓库目录 miniprogram/ 与 cloudfunctions/ 延续使用，不重建工程
  - 如果实现模型需要具体文件级任务，按“先基础配置，再云函数，再页面，再文档”的顺序输出即可

  ## 直接执行提示词

  你现在是这个微信小程序项目的实现工程师。请在现有项目目录中直接完成“情侣空间”第一版，不要停留在方案说明，直接按工程方式输出和实现代码。

  已知目录中已有：
  - miniprogram/
  - cloudfunctions/

  请严格按以下执行顺序实现：

  第一阶段：基础配置
  1. 补齐 miniprogram/app.js、app.json、app.wxss
  2. 在 miniprogram/config/ 下新增 env.js、constants.js、error-codes.js
  3. 在 miniprogram/utils/ 下新增 request.js、auth.js、date.js、guard.js、toast.js
  4. 在 miniprogram/services/ 下新增 auth.js、couple.js、photos.js、anniversaries.js、messages.js、exports.js

  第二阶段：数据库与云函数
  1. 按既定字段实现 users、couples、photos、anniversaries、messages、exports、backup_jobs
  2. 实现云函数：
     - auth/bootstrap
     - couple/createCouple joinCouple getCurrentCouple
     - photos/createUploadTicket confirmUpload listPhotos getPhotoDetail deletePhoto restorePhoto listRecycleBin
     - anniversaries/createAnniversary updateAnniversary deleteAnniversary listAnniversaries
     - messages/createMessage listMessages deleteMessage
     - export/createExportJob
     - backup/runDailyBackup
  3. 所有接口统一返回 { code, message, data }
  4. 所有云函数都基于 OPENID 鉴权，不信任前端传入身份

  第三阶段：COS 集成
  1. 照片主文件存 COS，不存微信云存储
  2. 路径固定：
     - couples/{coupleId}/photos/original/{yyyy}/{MM}/{photoId}-{filename}
     - couples/{coupleId}/photos/thumb/{yyyy}/{MM}/{photoId}.jpg
     - couples/{coupleId}/exports/{yyyyMMdd}/{exportId}.zip
     - system/backups/{yyyyMMdd}/photos-manifest.json
     - system/backups/{yyyyMMdd}/db-snapshot.json
  3. createUploadTicket 返回上传所需信息
  4. confirmUpload 必须校验对象存在后再写 photos 元数据
  5. getPhotoDetail 返回临时签名 URL，有效期 600 秒
  6. 删除照片只做软删除，不删除原图

  第四阶段：页面实现
  1. pages/bind：创建情侣空间、输入绑定码加入、显示绑定状态
  2. pages/home：展示情侣摘要、最近照片、纪念日、留言入口
  3. pages/gallery：上传、列表、详情、软删除、恢复、月份筛选、回收站
  4. pages/anniversaries：增删改查纪念日
  5. pages/messages：发送留言、列表、删除自己留言
  6. pages/profile：个人资料、情侣信息、数据导出、回收站入口、存储概览

  第五阶段：文档
  1. 编写 README.md
  2. 新增 docs/setup.md
  5. 写清楚部署、环境变量、数据库初始化、索引、备份恢复流程
  固定规则：
  - 所有删除默认软删除
  - 所有时间字段统一毫秒时间戳，anniversaries.date 固定 YYYY-MM-DD
  - 所有页面必须有空态、加载态、错误态
  - 未绑定用户不能进入核心功能
  - 留言只能删除自己发送的
  - 一个情侣空间最多两个人
  - 第一版不实现视频、推送、支付、社区、AI 功能
  - 代码优先保证可读性和可部署性

  请直接按项目工程方式完成，不要只给示例片段。
  如果某个文件不存在，请在合适目录创建它。
  如果已有目录结构可复用，请在现有结构内补齐。