# 情侣小程序长期保存方案

  ## Summary

  目标不是“绝对永远不删”，而是做到“即使误删、平台调整、账号迁移，也能恢复”。
  按你当前偏好，推荐做成：

  - 前端：微信小程序，只给你和女朋友使用
  - 主存储：你自己名下的对象存储账号，保存原始照片
  - 业务层：小程序云函数或轻后端，处理上传、鉴权、情侣绑定、纪念日等
  - 元数据：数据库只存照片索引、情侣关系、纪念日、留言，不存原图
  - 备份：定时把照片和数据库导出到第二份存储，至少再留一份本地冷备

  结论：
  最适合你的不是“纯微信云开发免费版”，而是“小程序做入口 + 你自己掌控存储和备份”。

  ## Key Changes

  ### 1. 存储策略

  - 原始情侣照片存对象存储，不直接只放在小程序临时体系里
  - 开启对象存储版本控制，避免覆盖或误删后无法找回
  - 开启回收站/生命周期策略，但不要对原图做自动删除
  - 数据库中只保存：
      - photoId
      - 上传人
      - 拍摄时间/上传时间
      - 相册分类
      - 存储路径
      - 缩略图路径
      - 可见性
      - 删除状态（软删除）

  ### 2. 业务功能第一版

  第一版只做这几项，最稳：

  - 情侣绑定
  - 照片上传与相册浏览
  - 纪念日管理
  - 简单留言/便签
  - 个人资料页
  - 数据导出入口

  不建议第一版就做太多互动玩法；先把“上传稳定、查看稳定、可恢复”做好。

  ### 3. 持久化与防丢设计

  - 照片删除采用软删除，不做立即物理删除
  - 每天或每周自动导出：
      - 照片对象列表
      - 数据库元数据
      - 纪念日和留言
  - 每月做一次离线备份到你自己的电脑或移动硬盘
  - 预留“整库导出”能力，未来即使不用微信小程序，也能迁移

  ### 4. 权限与隐私

  - 只允许情侣双方账号访问
  - 上传后生成私有访问链路，不用公网裸链
  - 管理权限默认只有你自己
  - 重要操作记录日志：上传、删除、恢复、绑定解绑

  ## Public Interfaces / Types

  建议先固定这些核心数据模型：

  - User
      - userId
      - nickname
      - avatar
      - partnerId
      - createdAt
  - Couple
      - coupleId
      - memberA
      - memberB
      - boundAt
      - status
  - Photo
      - photoId
      - coupleId
      - storageKey
      - thumbnailKey
      - uploadedBy
      - takenAt
      - createdAt
      - isDeleted
  - Anniversary
      - id
      - coupleId
      - title
      - date
      - remark
  - Message
      - id
      - coupleId
      - senderId
      - content
      - createdAt

  核心接口建议：

  - bindCouple
  - uploadPhoto
  - listPhotos
  - deletePhoto（软删除）
  - restorePhoto
  - createAnniversary
  - listAnniversaries
  - exportMyData

  ## Test Plan

  必须覆盖这些场景：
  - 上传照片后可正常查看缩略图和原图
  - 数据库记录丢失或异常时，不会直接导致原图不可恢复
  - 定时备份任务执行后，可恢复出完整照片索引
  - 更换小程序环境或后端部署方式后，历史照片仍能访问

  ## Assumptions

  - 不追求“绝对免费”，否则无法实现真正稳妥的长期持久化
  - 愿意使用你自己名下的云账号保存照片主数据
  - 第一版范围控制在“照片 + 纪念日 + 简单留言”
  - 小程序只是入口，真正的长期资产是对象存储里的原图和可导出的元数据
  - “永远不会被删除”在工程上应理解为“有多份备份、误删可恢复、可迁移”，而不是单平台绝对保证



› 再细致一些,可以直接作为提示词方案供模型直接实现


■ Conversation interrupted - tell the model what to do differently. Something went wrong? Hit `/feedback` to report the issue.


› 再细致一些,可以直接作为提示词方案供模型直接实现,可直接落地


• 我把它收敛成“可直接交给模型落地”的实现提示词，默认基于微信小程序 + 腾讯云体系，并把存储、数据表、接口、页面、权限、备份策略都定死，避免实现时继续做产
  品决策。

• Proposed Plan


  # 微信情侣小程序可落地实现提示词

  ## Summary

  目标是实现一个仅供两人使用的微信小程序，支持上传情侣照片、纪念日、留言便签、情侣绑定，并以“长期可恢复”为核心原则设计数据持久化方案。
  实现时不要追求“平台绝不删除”这种无法承诺的目标，而是落实为“原始照片持久存储 + 软删除 + 版本控制 + 自动备份 + 可导出迁移”。

  默认技术决策全部固定如下，不允许实现时自行更换：

  - 客户端：微信小程序原生框架
  - 后端：微信云开发云函数
  - 数据库：微信云开发数据库，仅存业务元数据
  - 文件主存储：腾讯云 COS，对象存储桶由开发者自己账号持有
  - 文件访问方式：云函数签发临时访问地址，不暴露永久公网链接
  - 备份：定时云函数导出数据库快照和对象清单；同时预留本地手动冷备流程
  - 适用范围：仅 2 个用户，不做多人社交，不做公开内容，不做推荐流

  ## Implementation Changes

  ### 1. 产品范围与页面结构

  第一版只实现以下页面，不增加额外玩法：

  - pages/home
      - 展示情侣信息摘要
      - 最近上传照片 6 张
      - 最近纪念日倒计时
      - 最近留言 3 条
      - 进入相册、纪念日、留言、个人中心的入口
  - pages/bind
      - 创建情侣空间
      - 输入绑定码加入情侣空间
      - 显示当前绑定状态
      - 未绑定前禁止进入核心页面
  - pages/gallery
      - 照片列表，按时间倒序
      - 支持上传照片
      - 支持按月份筛选
      - 支持查看单张详情
      - 支持软删除与恢复
      - 支持展示上传者和拍摄时间
  - pages/anniversaries
      - 创建纪念日
      - 编辑纪念日
      - 删除纪念日
      - 展示距今天数和倒计时天数
  - pages/profile
      - 展示本人资料
      - 展示情侣绑定信息
      - 展示存储占用概览
      - 提供“导出我的数据”入口
      - 提供“查看回收站”入口
  - pages/messages
      - 简单文字留言列表
      - 发送留言
      - 删除自己发送的留言

  ### 2. 数据模型

  严格使用以下集合和字段，不要自行简化或扩展命名。

  #### users

  {
    "_id": "string",
    "openid": "string",
    "nickname": "string",
    "avatarUrl": "string",
    "partnerOpenid": "string|null",
    "coupleId": "string|null",
    "createdAt": "number",
    "updatedAt": "number"
  }

  #### couples

  {
    "_id": "string",
    "code": "string",
    "memberAOpenid": "string",
    "memberBOpenid": "string|null",
    "status": "pending|active|closed",
    "createdAt": "number",
    "boundAt": "number|null",
    "updatedAt": "number"
  }

  #### photos

  {
    "_id": "string",
    "coupleId": "string",
    "uploadedBy": "string",
    "cosKey": "string",
    "thumbnailKey": "string",
    "originalName": "string",
    "size": "number",
    "mimeType": "string",
    "width": "number",
    "height": "number",
    "takenAt": "number|null",
    "createdAt": "number",
    "updatedAt": "number",
    "isDeleted": true,
    "deletedAt": "number|null",
    "deletedBy": "string|null",
    "version": "number"
  }

  注意：isDeleted 默认必须是 false，上面仅表示字段存在，不代表默认值。

  #### anniversaries

  {
    "_id": "string",
    "coupleId": "string",
    "title": "string",
    "date": "string",
    "remark": "string",
    "createdBy": "string",
    "createdAt": "number",
    "updatedAt": "number",
    "isDeleted": false
  }

  #### messages

  {
    "_id": "string",
    "coupleId": "string",
    "senderOpenid": "string",
    "content": "string",
    "createdAt": "number",
    "updatedAt": "number",
    "isDeleted": false
  }

  #### exports

  {
    "_id": "string",
    "coupleId": "string",
    "requestedBy": "string",
    "status": "pending|processing|done|failed",
    "fileKey": "string|null",
    "errorMessage": "string|null",
    "createdAt": "number",
    "updatedAt": "number"
  }

  #### backup_jobs

  {
    "_id": "string",
    "jobDate": "string",
    "status": "pending|processing|done|failed",
    "dbSnapshotKey": "string|null",
    "photoManifestKey": "string|null",
    "errorMessage": "string|null",
    "createdAt": "number",
    "updatedAt": "number"
  }

  ### 3. 文件存储设计

  照片主文件不存微信云存储，必须存 COS，路径规则固定：

  - 原图：couples/{coupleId}/photos/original/{yyyy}/{MM}/{photoId}-{filename}
  - 缩略图：couples/{coupleId}/photos/thumb/{yyyy}/{MM}/{photoId}.jpg
  - 导出包：couples/{coupleId}/exports/{yyyyMMdd}/{exportId}.zip
  - 备份清单：system/backups/{yyyyMMdd}/photos-manifest.json
  - 数据库快照：system/backups/{yyyyMMdd}/db-snapshot.json

  必须满足以下规则：

  - 原图上传后不可覆盖，只允许新增新版本
  - 开启 COS 版本控制
  - 开启回收站能力或等效保留策略
  - 缩略图尺寸统一为最长边 1200px
  - 详情页原图访问必须通过云函数返回临时签名 URL，默认有效期 10 分钟
  - 小程序前端不保存永久 URL
  - 删除照片只更新数据库 isDeleted=true，并记录删除人和时间；不直接物理删除 COS 原图

  ### 4. 鉴权与访问控制

  所有云函数统一先获取 OPENID，不信任前端传入的用户标识。
  所有业务数据必须按 coupleId 隔离。
  未绑定情侣关系的用户不能上传照片、创建纪念日、发送留言。

  固定访问规则：

  - 一个 couple 只能有 2 个成员
  - couples.status=pending 时仅创建者可见
  - 第二人通过绑定码加入后改为 active
  - 任何读取接口都必须校验当前用户属于该 coupleId
  - 删除留言只能删除自己发送的留言
  - 删除照片允许任一情侣成员执行，但只做软删除
  - 恢复照片允许任一情侣成员执行
  - 导出数据仅情侣成员可触发

  ### 5. 云函数设计

  按当前目录结构实现，不新增过多函数，统一通过 action 分发。

  #### cloudfunctions/auth

  负责：

  - 获取当前用户身份
  - 初始化 users 表记录
  - 返回当前绑定状态、用户资料、情侣资料

  接口：

  - action: "bootstrap"
  - 返回：

  {
    "user": {},
    "couple": null,
    "isBound": false
  }

  #### cloudfunctions/couple

  负责：

  - 创建情侣空间
  - 生成绑定码
  - 使用绑定码加入
  - 获取当前情侣信息

  接口：

  - createCouple
  - joinCouple
  - getCurrentCouple

  规则：

  - 绑定码长度固定 6 位，大写字母加数字
  - 一个用户已有 active 情侣关系时，禁止重复创建和加入
  - 一个 pending 情侣空间超过 7 天无人加入，可标记失效，但不自动删除

  #### cloudfunctions/photos

  负责：

  - 生成上传凭证
  - 上传后写入元数据
  - 获取列表
  - 获取详情访问链接
  - 软删除
  - 恢复
  - 获取回收站列表

  接口：

  - createUploadTicket
  - confirmUpload
  - listPhotos
  - getPhotoDetail
  - deletePhoto
  - restorePhoto
  - listRecycleBin

  固定流程：

  1. 前端选择图片
  2. 调用 createUploadTicket
  3. 云函数生成 photoId、目标 cosKey、缩略图 thumbnailKey
  4. 前端使用返回凭证上传到 COS
  5. 上传完成后调用 confirmUpload
  6. 云函数写入 photos 集合

  实现要求：

  - confirmUpload 前必须校验对象是否确实已存在
  - listPhotos 默认过滤 isDeleted=false
  - listRecycleBin 只返回 isDeleted=true
  - getPhotoDetail 返回缩略图和原图临时链接
  - 照片列表分页，每页默认 20 条

  #### cloudfunctions/anniversaries

  负责：

  - 创建、编辑、删除、列表查询纪念日

  接口：

  - createAnniversary
  - updateAnniversary
  - deleteAnniversary
  - listAnniversaries

  规则：

  - date 格式固定为 YYYY-MM-DD
  - 标题最长 30 字
  - 备注最长 200 字

  #### cloudfunctions/messages

  负责：

  - 发布留言
  - 列表查询
  - 删除自己留言

  接口：

  - createMessage
  - listMessages
  - deleteMessage

  规则：

  - 留言内容最长 300 字
  - 默认按时间倒序
  - 第一版不做已读状态，不做消息推送

  #### cloudfunctions/export

  负责：

  - 打包导出当前情侣空间的元数据清单
  - 生成可下载 zip 文件
  - 写入 exports

  导出内容必须包含：

  - users.json
  - couple.json
  - photos.json
  - anniversaries.json
  - messages.json

  第一版可以只导出元数据和照片清单，不要求把全部原图打进 zip，但必须预留可扩展能力。

  #### cloudfunctions/backup

  负责：

  - 定时任务执行数据库导出
  - 扫描照片对象并生成 manifest
  - 写入 backup_jobs

  执行频率：

  - 每天凌晨 3 点执行一次

  输出：

  - db-snapshot.json
  - photos-manifest.json

  ### 6. 前端交互与状态管理

  前端采用以下固定组织方式：

  - services/
      - 封装所有云函数调用和上传逻辑
  - utils/
      - 日期格式化、权限判断、错误处理
  - config/
      - 环境配置、COS 基础参数、分页默认值

  固定交互要求：

  - 首次进入先执行 auth.bootstrap
  - 若未绑定，则跳转 pages/bind
  - 上传照片前先校验是否已绑定
  - 上传中显示进度条
  - 上传成功后刷新列表
  - 删除照片前二次确认，文案明确提示“可在回收站恢复”
  - 纪念日列表显示“已在一起 X 天”或“距离纪念日还有 X 天”
  - 首页若无数据，显示引导态，不要报空白页

  ### 7. 非功能要求

  - 所有时间字段统一使用毫秒时间戳，只有纪念日 date 使用字符串日期
  - 所有删除都默认软删除
  - 所有写接口必须有参数校验
  - 所有云函数返回统一结构：

  {
    "code": 0,
    "message": "ok",
    "data": {}
  }

  失败时：

  {
    "code": 4001,
    "message": "具体错误信息",
    "data": null
  }

  - 所有错误码统一放到常量文件
  - 所有数据库查询默认按 coupleId + 索引字段设计查询条件
  - 不实现开放注册逻辑，不实现分享广场，不实现评论点赞，不实现支付
  - UI 风格简洁、温柔、偏生活化，但不要使用复杂动画

  ### 8. 部署与环境变量

  必须区分至少两个环境：

  - dev
  - prod

  固定环境变量：

  - ENV_ID
  - COS_BUCKET
  - COS_REGION
  - COS_SECRET_ID
  - COS_SECRET_KEY
  - SIGN_URL_EXPIRE_SECONDS

  要求：

  - 密钥只放云函数环境变量
  - 前端不可硬编码密钥
  - README 必须写清楚本地开发、云函数部署、数据库集合初始化、COS 配置步骤

  ## Test Plan

  ### 核心功能测试

  - 新用户首次进入能自动创建 users 记录
  - 用户创建情侣空间后生成绑定码
  - 第二个用户可通过绑定码加入
  - 第三个用户不能加入已满的情侣空间
  - 已绑定用户不能再次创建新情侣空间
  - 上传照片后数据库有记录，COS 有对象
  - 上传完成前调用 confirmUpload 失败时不会写脏数据
  - 照片列表只显示未删除数据
  - 回收站只显示软删除数据
  - 删除后可恢复，恢复后重新出现在主列表
  - 纪念日增删改查正常
  - 留言增删查正常，且只能删除自己留言
  - 导出任务创建成功并生成导出记录
  - 定时备份任务能生成数据库快照和照片清单

  ### 权限测试

  - 未绑定用户不能上传、留言、创建纪念日
  - 不属于该 coupleId 的用户不能读取对应数据
  - 任意伪造 openid 或 coupleId 的前端请求都必须被云函数拒绝
  - 临时访问链接过期后不可继续访问原图

  ### 异常测试

  - COS 上传失败时前端正确提示并允许重试
  - 云函数异常时返回统一错误结构
  - 数据库写入失败时不返回成功态
  - 对不存在的照片执行删除或恢复时返回明确错误
  - 绑定码错误、过期、已失效时返回明确提示

  ## Assumptions

  - 第一版只服务两个人，不考虑多人、多空间共享
  - 用户接受使用腾讯云 COS 作为照片主存储
  - 用户接受“长期可恢复”而不是“平台绝不删除”的工程定义
  - 第一版不做视频上传、不做 AI 相册分类、不做推送提醒、不做支付
  - 第一版优先保证稳定、隐私、可恢复，再考虑玩法扩展

  ## Direct Prompt

  将下面这段作为直接实现提示词交给模型：

  请基于一个微信小程序项目实现“情侣空间”第一版，严格按照以下规格落地，不要自行改变技术方案、页面结构、数据模型、接口命名和存储策略。

  项目目标：
  做一个仅供两人使用的微信小程序，支持情侣绑定、上传情侣照片、纪念日、简单留言，并且以“长期可恢复”为核心设计持久化方案。不要实现公开社区、支付、点赞评
论、推荐流、多人协作。

  技术方案固定：
  - 微信小程序原生
  - 云函数作为后端
  - 云开发数据库存业务元数据
  - 腾讯云 COS 存照片原图和缩略图
  - 云函数签发临时访问地址
  - 软删除 + 版本控制 + 定时备份 + 数据导出

  页面必须实现：
  - pages/home
  - pages/bind
  - pages/gallery
  - pages/anniversaries
  - pages/profile
  - pages/messages

  数据集合必须实现：
  - users
  - couples
  - photos
  - anniversaries
  - messages
  - exports
  - backup_jobs

  字段严格按以下定义实现，不要改名：
  [这里插入本方案上面的全部数据模型定义]

  云函数必须实现：
  - auth: bootstrap
  - couple: createCouple / joinCouple / getCurrentCouple
  - photos: createUploadTicket / confirmUpload / listPhotos / getPhotoDetail / deletePhoto / restorePhoto / listRecycleBin
  - anniversaries: createAnniversary / updateAnniversary / deleteAnniversary / listAnniversaries
  - messages: createMessage / listMessages / deleteMessage
  - export: createExportJob
  - backup: runDailyBackup

  实现要求：
  1. 所有云函数先基于 OPENID 鉴权，不信任前端用户标识
  2. 所有数据按 coupleId 隔离
  3. 所有删除默认软删除
  4. 照片原图存 COS，数据库只存元数据
  5. 原图访问必须通过临时签名 URL
  6. 上传流程必须是 createUploadTicket -> 上传到 COS -> confirmUpload
  7. confirmUpload 前必须校验对象确实存在
  8. 首页要有空状态、加载态、错误态
  9. 绑定前不能进入核心页面
  10. 所有接口返回统一结构：{ code, message, data }

  文件存储路径固定：
  - couples/{coupleId}/photos/original/{yyyy}/{MM}/{photoId}-{filename}
  - couples/{coupleId}/photos/thumb/{yyyy}/{MM}/{photoId}.jpg
  - couples/{coupleId}/exports/{yyyyMMdd}/{exportId}.zip
  - system/backups/{yyyyMMdd}/photos-manifest.json
  - system/backups/{yyyyMMdd}/db-snapshot.json

  前端组织要求：
  - services/ 封装接口
  - utils/ 放日期和错误处理
  - config/ 放环境配置
  - 页面逻辑尽量清晰，不写过度抽象
  - UI 简洁温和，适合情侣私用

  请直接输出完整可运行实现，至少包含：
  - 小程序页面代码
  - COS 上传与签名逻辑
  - README 部署文档
  - 数据库初始化说明

  如果当前项目目录已有 `miniprogram/`、`cloudfunctions/`、`services/`、`utils/` 等结构，请优先在现有结构内补齐实现，不要推翻目录重建。

  实现时优先保证：
  1. 正确性
  2. 权限隔离
  3. 持久化与恢复能力
  4. 可直接部署
  5. 代码可读性

  不要只给示例代码，直接按项目工程方式完成。