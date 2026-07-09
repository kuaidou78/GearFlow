# GearFlow Codex Handoff

本文件用于在新的 Codex 对话中继续 GearFlow 项目改造。当前对话已经完成项目创建、SQLite 版本本地验收、阿里云 ECS 部署、需求符合度审查和数据库审查。下一阶段目标是按课程要求把项目改造成 Vue 3 + MySQL 版本。

## 一、当前项目基本信息

- 项目路径：`C:\Users\ygm95\Documents\New project\GearFlow`
- 当前前端技术栈：React 18 + Vite + TypeScript + Tailwind CSS
- 当前前端是 React 还是 Vue：当前是 React，不是 Vue
- 当前后端技术：Node.js + Express + Prisma ORM
- 当前数据库类型：SQLite
- 当前 ORM：Prisma
- 当前本地开发端口：
  - 前端：`5173`
  - 后端：`3001`
- 当前部署方式：阿里云 ECS + Nginx + PM2
- 当前线上地址：`http://120.26.32.163/`
- 当前 Demo 登录：
  - email：`demo@gearflow.app`
  - password：`ride123`

### 当前已实现功能

- Landing Page
- Demo 登录
- HTTP-only cookie demo session，cookie 名称：`gearflow_demo_session`
- 后台 AppShell
- Dashboard 首页
- Gear 装备管理 CRUD
- Maintenance 保养记录 CRUD
- Wishlist 升级愿望单 CRUD
- Wishlist 状态修改
- Insights 数据统计
- Status 部署状态页
- Prisma SQLite 数据模型
- Seed 演示数据
- README 本地开发和部署说明
- 阿里云 ECS 部署报告：`DEPLOY_REPORT.md`
- 生产 SQLite 路径：`/www/data/gearflow/prod.db`

## 二、已确认的问题

以下问题已经在只读审查中确认：

1. 当前前端是 React，不符合 Vue 课程要求。
2. 当前数据库是 SQLite，不符合老师示例网站使用 MySQL 的方向。
3. 当前缺少 `User` 模型。
4. 当前缺少 `Ride` 骑行记录模型。
5. 当前缺少 `Bike` 车辆模型。
6. 当前缺少真实用户注册功能。
7. 当前缺少骑行记录 CRUD。
8. 当前缺少车辆独立管理。
9. 当前缺少 `database.sql`。
10. 当前没有 `server/prisma/migrations` 目录。
11. 当前 auth 是固定 Demo 登录，不是基于数据库用户表的真实登录。
12. 当前 Gear 的 `category = bike` 不能等价替代独立车辆管理。

## 三、当前重要文件

### `client/package.json`

作用：
- 定义当前前端依赖和脚本。
- 当前依赖是 React、React DOM、React Router、Vite、Tailwind、TypeScript。
- 这是证明当前前端不是 Vue 的关键文件。

当前关键事实：
- 有 `react`
- 有 `react-dom`
- 有 `@vitejs/plugin-react`
- 没有 `vue`
- 没有 `@vitejs/plugin-vue`

### `server/server.js`

作用：
- Express 后端入口。
- 注册全局 middleware。
- 注册所有 API 路由。
- 固定默认端口 `3001`。

当前已注册接口：
- `/api/health`
- `/api/status`
- `/api/auth`
- `/api/dashboard`
- `/api/gears`
- `/api/maintenance`
- `/api/wishlist`
- `/api/insights`

当前缺失接口：
- `/api/auth/register`
- `/api/rides`
- `/api/bikes`
- `/api/admin`

### `server/prisma/schema.prisma`

作用：
- Prisma 数据库 schema。
- 当前 datasource 使用 SQLite。
- 当前只有 Gear、Maintenance、WishlistItem 三个模型。

当前 datasource：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

当前已有模型：
- `Gear`
- `Maintenance`
- `WishlistItem`

当前缺失模型：
- `User`
- `Ride`
- `Bike`
- `Favorite` 或其他扩展表
- `Admin` 或 `role` 字段

当前已有关系：
- `Gear -> Maintenance[]`
- `Maintenance -> Gear`
- 删除 Gear 会级联删除 Maintenance

当前缺失关系：
- `User -> Bike`
- `User -> Ride`
- `User -> Gear`
- `Bike -> Ride`
- `User.role` 或管理员机制

### `server/prisma/seed.js`

作用：
- 初始化演示数据。
- 当前只初始化 Gear、Maintenance、WishlistItem。
- 当前有 production 保护逻辑：`NODE_ENV=production` 时拒绝 seed。
- 当前会检查 Gear 数量，已有数据时跳过 seed。

下一阶段需要调整：
- 先创建测试 User。
- 再创建 Bike。
- 再创建 Ride。
- 再创建 Gear、Maintenance、Wishlist。
- 如果加入真实登录，需要处理用户密码 hash。

### `server/.env.example`

作用：
- 后端环境变量示例。

当前数据库配置：

```env
DATABASE_URL="file:./dev.db"
```

问题：
- 这是 SQLite 文件路径，不是 MySQL 连接串。

下一阶段应改为类似：

```env
DATABASE_URL="mysql://gearflow_user:password@localhost:3306/gearflow"
```

### `README.md`

作用：
- 项目说明、本地开发说明、脚本说明、SQLite 说明、PM2/Nginx 部署说明、SQLite 备份说明。

当前问题：
- README 当前说明的是 SQLite，不是 MySQL。
- 没有 MySQL 建库、授权、迁移、seed 流程。
- 没有 `database.sql` 说明。

下一阶段需要更新：
- Node 版本要求保留。
- MySQL 安装/连接要求。
- `CREATE DATABASE gearflow ...`
- Prisma migrate 流程。
- seed 初始化流程。
- database.sql 说明。
- Vue 前端启动说明。

### 现有 `routes/` 目录

作用：
- 保存 Express 路由定义。

当前已有：
- `auth.routes.js`
- `dashboard.routes.js`
- `gear.routes.js`
- `health.routes.js`
- `insights.routes.js`
- `maintenance.routes.js`
- `status.routes.js`
- `wishlist.routes.js`

下一阶段需要新增：
- `ride.routes.js`
- `bike.routes.js`
- 可选：`admin.routes.js`

### 现有 `controllers/` 目录

作用：
- 保存 Express controller。

当前已有：
- `auth.controller.js`
- `dashboard.controller.js`
- `gear.controller.js`
- `health.controller.js`
- `insights.controller.js`
- `maintenance.controller.js`
- `status.controller.js`
- `wishlist.controller.js`

下一阶段需要新增或改造：
- `auth.controller.js`：从固定 Demo 登录改为数据库用户注册/登录。
- 新增 `ride.controller.js`。
- 新增 `bike.controller.js`。
- 可选新增 `admin.controller.js`。
- Dashboard/Insights 需要纳入 Ride/Bike 统计。

## 四、下一阶段目标

把当前项目改造成符合课程方向的：

```text
Vue 3 + Vite + Node.js + Express + Prisma + MySQL
```

项目定位从“骑行装备资产管理 mini SaaS”扩展为：

```text
骑行记录与装备管理系统
```

必须覆盖：
- 用户注册
- 用户登录
- 当前用户信息
- 骑行记录增删改查
- 车辆管理
- 装备管理
- 保养记录
- 数据统计
- MySQL 数据库存储真实数据
- 前后端接口交互
- `database.sql`
- README MySQL 初始化说明

建议覆盖：
- 后台管理
- 数据可视化
- 装备维护提醒
- 测试用例文档

## 五、下一阶段执行顺序

1. 安装并配置 MySQL。
   - 确认本机或服务器可用 MySQL。
   - 不要直接覆盖当前 SQLite 版本，先保留现状。

2. 创建 `gearflow` 数据库。
   - 推荐字符集：
     ```sql
     CREATE DATABASE gearflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```

3. 修改 Prisma datasource 为 MySQL。
   - 修改 `server/prisma/schema.prisma`：
     ```prisma
     provider = "mysql"
     ```
   - 修改 `DATABASE_URL` 为 MySQL 连接串。

4. 新增核心模型。
   - `User`
   - `Bike`
   - `Ride`
   - `Gear`
   - `Maintenance`
   - 可选：`WishlistItem`
   - 可选：`Favorite`
   - 在 `User` 中加入 `role` 字段，支持普通用户和管理员。

5. 修改 `seed.js`。
   - 初始化测试用户。
   - 初始化车辆。
   - 初始化骑行记录。
   - 初始化装备和维护数据。
   - 避免覆盖已有 MySQL 数据。

6. 新增或改造后端接口。
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/auth/logout`
   - `GET /api/auth/me`
   - `/api/rides` CRUD
   - `/api/bikes` CRUD
   - `/api/gears` CRUD
   - `/api/maintenance` CRUD
   - `/api/dashboard/summary`
   - `/api/insights/overview`

7. 生成 `docs/database.sql`。
   - 用于老师检查。
   - 应包含 MySQL 建库、建表、外键、索引、初始化数据。

8. 更新 README。
   - MySQL 环境要求。
   - 创建数据库。
   - 配置 `.env`。
   - Prisma migrate。
   - seed。
   - 启动前后端。
   - 部署说明。

9. 备份旧 React 前端。
   - 建议把现有 `client` 改名或复制为 `client-react-backup`。
   - 或先用 git 分支保存当前状态。
   - 不要直接删除，避免丢失已完成页面和样式参考。

10. 重建 Vue 前端。
    - 使用 Vue 3 + Vite。
    - 满足课程检查点：
      - `v-model`
      - `v-bind` 或 `:`
      - `v-for`
      - `v-on` 或 `@`
      - 组件化结构
      - axios 或类似请求封装
    - 页面至少包括：
      - 登录页
      - 注册页
      - Dashboard
      - 骑行记录列表
      - 新增骑行记录
      - 编辑骑行记录
      - 车辆管理
      - 装备管理
      - 数据统计
      - 后台管理页

## 六、新 Codex 对话开头提示词

下面这段可以直接复制到新的 Codex 对话中继续：

```text
你现在接手 GearFlow 项目改造。

项目路径：
C:\Users\ygm95\Documents\New project\GearFlow

请先读取：
docs/CODEX_HANDOFF.md

当前项目状态：
- 当前前端是 React + Vite + TypeScript，不符合课程 Vue 要求。
- 当前后端是 Node.js + Express + Prisma。
- 当前数据库是 SQLite，不符合老师 MySQL 方向。
- 当前已实现 Gear、Maintenance、Wishlist、Dashboard、Insights、Demo 登录。
- 当前缺 User、Ride、Bike 模型。
- 当前缺真实用户注册。
- 当前缺骑行记录 CRUD。
- 当前缺车辆独立管理。
- 当前缺 database.sql。

下一阶段目标：
把项目改造成 Vue 3 + Vite + Node.js + Express + Prisma + MySQL 的骑行记录与装备管理系统。

执行要求：
1. 先只读检查当前文件和 git 状态。
2. 不要直接删除旧 React 前端，先备份或保留。
3. 先完成 MySQL/Prisma 后端模型与接口，再重建 Vue 前端。
4. 需要新增 User、Bike、Ride、Gear、Maintenance 模型。
5. 需要新增真实注册、登录、当前用户接口。
6. 需要新增 rides、bikes、gears、maintenance CRUD。
7. 需要生成 docs/database.sql。
8. 需要更新 README 为 MySQL 初始化和运行说明。
9. 每个阶段完成后运行检查命令并修复报错。
10. 不要使用 Docker。
11. 不要覆盖线上生产数据。
12. 如果涉及服务器部署，先做本地验收，再部署。

请先给出当前项目改造执行计划，然后开始按步骤实现。
```

