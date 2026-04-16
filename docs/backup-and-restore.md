# 备份与恢复说明

## 自动备份机制

每天凌晨 3 点，`backup` 云函数自动执行：

1. **数据库快照**：导出所有集合（users / couples / photos / anniversaries / messages）的 JSON，写入 COS：
   ```
   system/backups/{yyyyMMdd}/db-snapshot.json
   ```

2. **照片对象清单**：扫描 COS `couples/` 前缀下所有对象，生成清单文件：
   ```
   system/backups/{yyyyMMdd}/photos-manifest.json
   ```

3. **记录任务状态**：写入 `backup_jobs` 集合，可查看历次备份是否成功。

---

## 手动触发备份

在微信云开发控制台 → 云函数 → backup → 测试，发送空 event 即可手动触发一次备份。

---

## 验证备份

1. 打开 [COS 控制台](https://console.cloud.tencent.com/cos) → 存储桶 → `system/backups/`
2. 检查当日日期目录下是否有 `db-snapshot.json` 和 `photos-manifest.json`
3. 在云开发控制台 → 数据库 → `backup_jobs` 集合，查看最新记录的 `status` 是否为 `done`

---

## 数据恢复场景

### 场景 1：数据库记录误删（元数据丢失）

1. 从 COS 下载最近一次 `db-snapshot.json`
2. 在云开发控制台 → 数据库，手动导入对应集合数据
3. 原图仍在 COS，不受影响

### 场景 2：照片原图找回（COS 开启了版本控制）

1. 进入 COS 控制台 → 存储桶 → 对应路径
2. 点击「历史版本」，找到被覆盖/删除的版本
3. 下载或恢复该版本

> ⚠️ 小程序内"删除照片"仅更新数据库标记（软删除），**不会删除 COS 上的原图**，随时可恢复。

### 场景 3：迁移到新环境

1. 在个人中心点击「导出我的数据」，下载包含所有元数据的 JSON
2. 在 COS 控制台批量下载原图（或通过 COSCMD 工具）
3. 在新环境重建集合，导入 JSON 数据
4. 将原图上传到新存储桶，确保 `cosKey` 路径一致

---

## 本地冷备（推荐每月一次）

1. 使用 [COSCMD](https://cloud.tencent.com/document/product/436/10976) 或 COSBrowser 下载整个存储桶：
   ```bash
   coscmd download -r / ./local-backup/
   ```
2. 在云开发控制台导出数据库（数据库 → 导出）
3. 将文件存入移动硬盘或 NAS

---

## 存储路径规则（备查）

| 用途 | COS 路径 |
|------|----------|
| 原图 | `couples/{coupleId}/photos/original/{yyyy}/{MM}/{photoId}-{filename}` |
| 缩略图 | `couples/{coupleId}/photos/thumb/{yyyy}/{MM}/{photoId}.jpg` |
| 导出包 | `couples/{coupleId}/exports/{yyyyMMdd}/{exportId}.json` |
| 数据库快照 | `system/backups/{yyyyMMdd}/db-snapshot.json` |
| 照片清单 | `system/backups/{yyyyMMdd}/photos-manifest.json` |
