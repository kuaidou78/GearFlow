# GearFlow 产品需求文档

更新时间：2026-07-12
当前发布版本：v1.1.0

本文档定义当前已上线版本的产品范围、体验原则与后续优先级。部署细节见 [DEPLOYMENT.md](DEPLOYMENT.md)，本次上线验证见 [RELEASE-v1.1.0.md](RELEASE-v1.1.0.md)。

## 1. 产品定位

GearFlow 是面向个人骑行者的装备、车辆、骑行和维护管理平台。它不是通用后台，而是一处持续存在的骑行数字空间：用户进入同一套 Garage 环境，查看车辆状态、记录骑行、评估装备价值，并据天气与真实道路路线规划下一次出发。

产品表达：

- Cycling Gear Command Center
- Private Garage
- Ride Performance Workshop

核心问题：

- 我的车辆、装备和维护事项当前处于什么状态？
- 最近骑行和累计训练表现如何？
- 哪些资产或维护事项需要优先处理？
- 在给定出发点、终点和时间下，这次骑行是否适合执行？

## 2. 用户与数据边界

当前角色为已认证个人用户。每个用户只能读取和操作自己的 Bike、Ride、Gear、Maintenance 与 WishlistItem 数据。

- 注册、登录、登出与当前用户状态均使用 HTTP-only Cookie session。
- 演示账号仅用于产品验收；其凭据不应在环境文档以外作为安全机制使用。
- Wishlist 已有后端模型与接口，但当前没有独立主界面入口。

## 3. 已上线功能

### 认证与会话

- 注册、登录、登出、`/api/auth/me` 自动恢复。
- 表单错误、Loading、回车提交与浏览器自动填充。
- 登录前后保持同一个全局 Wavy Cubes Canvas，不出现黑闪或双 Canvas。

### Dashboard

- 用户 Merida 自行车 Hero 作为首屏主锚点。
- 累计距离、骑行时间、车辆数量、装备价值和维护观察读数。
- Next Actions、Garage Summary 与最近活动。
- Log ride、Review service、Check gear 等上下文操作。

### Bikes、Rides、Gear、Maintenance、Insights

- Bikes：车辆新增、编辑、删除、搜索与骑行/装备关联。
- Rides：骑行新增、编辑、删除、搜索、距离、时长、爬升和车辆关联。
- Gear：装备新增、编辑、删除、搜索、分类筛选、估值与车辆关联。
- Maintenance：维护记录新增、编辑、删除、搜索与到期状态。
- Insights：月度骑行距离、车辆使用、资产占比与规则建议。

### Ride Planner 与 Route Story

- openrouteservice 地点搜索与 `cycling-road` 真实路线。
- Open-Meteo 出发时刻天气。
- 距离、时长、爬升、天气、规则评分、原因与警告。
- Leaflet + OpenStreetMap 路线展示、路线绘制、移动标记、Expand Map / Close Map 与 Replay Route。
- 路线数据只用于当前规划结果，不写入业务数据库。

## 4. 体验与视觉系统

### Carbon Gold Wavy Cubes

全站共享一个连续 WebGL 环境，覆盖登录页、Sidebar 和所有业务页面下方。它是环境层，不是单页 Hero，也不拦截表单、地图、按钮或滚动。

正式参数：

| 项目 | 值 |
| --- | --- |
| Scene background | `#090A08` |
| Cube base | `#2D2F2A` |
| Wave highlight | `#D8C47E` |
| UI accent | `#CDAE54` |
| RGB shift | `0.003` |
| Vignette strength | `0.38` |

渲染基础固定为 Perspective Camera、40×40 InstancedMesh、128 点 Float DataTexture、Gaussian wavefront、动态阴影和 EffectComposer。当前阶段不以业务数据驱动波纹，不新增第二套背景实现。

### Route Field Recomposition

页面不是切到另一张独立网页，而是在同一骑行空间中重组内容。Sidebar、Logo、用户信息与 Wavy Canvas 保持稳定，只有右侧 PageViewport 切换。

- Sidebar 指示器立即移动到请求目标。
- 旧页整体向左收束：`-14px`、`scale(.988)`、2px blur、145ms。
- 暖金 Route Signal 由目标导航项向新页面标题区域传输，约 160ms。
- 新页以 `10px/3px` 位移、`scale(.994)`、2px blur 进入，210ms。
- 身份层先进入，主要内容层延后约 45ms；不逐卡片长 stagger。
- 快速点击只保留最后一次请求，导航最终与实际页面一致。
- `prefers-reduced-motion` 下直接替换内容并隐藏 Route Signal。

### 登录页

登录页使用同一个 Carbon Gold Wavy Cubes 世界。左侧为必要的深色磨砂认证表单，右侧保留完整场景空间；登录与退出只淡入淡出认证内容，背景持续运行。

## 5. 页面状态

| 页面 | 当前状态 | 体验重点 |
| --- | --- | --- |
| 登录 | 已上线 | 单 Canvas、玻璃表单、Demo 验收入口 |
| Dashboard | 已上线 | Merida Hero、Garage readouts、行动与摘要 |
| Rides | 已上线 | Performance 日志和骑行记录 |
| Ride Planner | 已上线 | 真实路线、天气、地图叙事 |
| Bikes | 已上线 | My Garage 与车辆关联上下文 |
| Gear | 已上线 | 装备资产、状态与估值 |
| Maintenance | 已上线 | Service 记录与到期观察 |
| Insights | 已上线 | 训练与车库数据解读 |
| Wishlist | 后端已实现 | 待开放 Future Build 主界面 |

## 6. 后续优先级

### P0：稳定性与发布维护

- 保持认证、CRUD、Route Planner 与单 Canvas 架构稳定。
- 不为视觉优化修改数据库模型、迁移或 API 契约。
- 每次发布执行服务端测试、客户端 build、UI smoke 与生产健康检查。
- 在 HTTPS 上线前保持 Cookie 安全策略与部署文档一致。

### P1：Wishlist 前端

- 增加 Future Build 页面。
- 复用既有 Wishlist API 和数据模型，不强行新增字段。
- 用清晰的升级计划、优先级和预算表达，不做商城化设计。

### P2：页面信息密度优化

- 在不改变现有数据结构前提下，继续优化 Gear、Maintenance 和 Insights 的信息层级。
- 保持全站背景、Hero、Sidebar 和页面切换语言一致。

### P3：路线使用闭环

- 评估是否将用户明确保存的路线规划结果关联到 Ride。
- 该需求必须先定义数据所有权、保存行为与迁移方案，不能临时把规划响应写入数据库。

## 7. 非目标

当前版本不做：

- 社交、排行榜或多用户协作。
- 支付、订阅或商城交易。
- 客户端直接调用 ORS、Open-Meteo 或暴露第三方密钥。
- 以 CSS 或简化 sin 波替代现有 Wavy Cubes 渲染链路。
- 为每个页面复制 Dashboard Hero 构图。
- 未经明确设计与数据方案的训练负荷预测、路线持久化或数据库重构。

## 8. 产品验收标准

每次影响前端或发布的改动至少验证：

- 登录前、登录后和登出后均只有一个 Wavy Canvas。
- Dashboard Hero、Sidebar、七个主页面和主要 CRUD 可用。
- 正常顺序和快速连续导航均无内容重叠、黑闪或最终状态失配。
- 1440×900 与 1280×720 无严重布局溢出。
- reduced-motion 正常。
- `npm test --prefix server`、`npm run build` 与 `npm run ui:smoke` 通过。
- Ride Planner 外部服务不可用时显示真实错误，不伪造路线或天气结果。

## 9. 已使用视觉资产

```text
client/src/assets/raw/my-merida-dashboard-original.jpeg
client/src/assets/raw/scultura-garage-original.jpg
client/src/assets/raw/reacto-rides-original.jpg
client/src/assets/raw/gear-dura-ace-brake-original.jpg
```

资产必须本地引用，不 hotlink、不转 base64；文字覆盖通过 overlay 保持可读，不以强模糊破坏车辆与机械细节。
