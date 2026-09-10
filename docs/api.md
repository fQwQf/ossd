# API 参考

[文档首页](README.md) · [快速开始](getting-started.md) · [架构与数据口径](architecture.md) · [运行与维护](operations.md)

后端默认监听 `http://localhost:3000`。通过 Docker Compose 的前端入口访问时，`/api` 会由 Nginx 代理，例如 `http://localhost:8080/api/v1/organization/summary`。

## 常用参数

| 参数 | 适用范围 | 说明 |
|------|----------|------|
| `range` | 多数统计接口 | 时间范围，默认 `30d`。可传 `7d`、`30d`、`90d` 等 `<days>d` 格式；部分接口支持 `all` |
| `granularity` | 聚合趋势、SIG 对比、CSV/Excel 导出 | 时间粒度，可选 `day`、`week`、`month`，默认 `day` |
| `sigIds` | SIG 对比、CSV/Excel 导出 | 逗号分隔的 SIG 数据库 ID，例如 `1,2` |
| `metric` | 贡献者排行榜 | 排序指标，可选 `total`、`prs`、`issues`、`commits`，默认 `total` |
| `limit` | 贡献者排行榜 | 返回的贡献者数量，默认 `50` |
| `type` | 最新活动、导出 | 最新活动使用 `prs|issues`；不同导出格式支持的取值见导出接口说明 |
| `page`、`per_page` | 最新活动 | 页码默认 `1`，每页数量默认 `10`，`per_page` 最大为 `100` |

`range=all` 仅适用于下文明确支持的接口。当前实现中，它可用于组织汇总、仓库和基础时间序列，以及 SIG Commit/API/聚合时间序列、贡献者和 SIG 对比接口。组织聚合时间序列、SIG `summary`、SIG 基础 `timeseries`、增长分析以及 CSV/Excel 导出应传 `<days>d`，否则不能得到“全部历史”语义。

```bash
curl 'http://localhost:3000/api/v1/organization/summary?range=30d'
curl 'http://localhost:3000/api/v1/organization/timeseries/aggregated?range=90d&granularity=week'
```

## 核心数据接口

### 组织数据

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/organization/summary` | 组织汇总指标和数据新鲜度 |
| GET | `/api/v1/organization/sigs` | SIG 的 ID 和名称列表 |
| GET | `/api/v1/organization/repositories` | 组织内仓库级指标 |
| GET | `/api/v1/organization/timeseries` | 组织活动日时间序列 |

示例：

```bash
curl 'http://localhost:3000/api/v1/organization/repositories?range=30d'
```

组织汇总中的新鲜度字段示例：

```json
{
  "last_updated_at": "2026-09-09T00:00:00.000Z",
  "data_status": "fresh"
}
```

从未成功完成定时采集时，`last_updated_at` 可能为 `null`，且 `data_status` 为 `missing`。

### SIG 数据

路径中的 `:sigId` 是 `/api/v1/organization/sigs` 返回的数据库 ID，不是 SIG 名称。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/sig/:sigId/summary` | SIG 汇总指标 |
| GET | `/api/v1/sig/:sigId/timeseries` | SIG 活动日时间序列 |
| GET | `/api/v1/sig/:sigId/timeseries/commits` | SIG Commit 与代码行时间序列 |
| GET | `/api/v1/sig/:sigId/timeseries/api` | SIG PR、Issue 与贡献者时间序列 |

```bash
curl 'http://localhost:3000/api/v1/sig/1/summary?range=30d'
```

## 分析接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/organization/timeseries/aggregated` | 按日、周或月聚合的组织活动时间序列 |
| GET | `/api/v1/organization/growth-analysis` | 组织当前区间与前一区间的增长对比 |
| GET | `/api/v1/sig/:sigId/timeseries/aggregated` | 按日、周或月聚合的 SIG 时间序列 |
| GET | `/api/v1/sig/:sigId/growth-analysis` | SIG 当前区间与前一区间的增长对比 |
| GET | `/api/v1/sigs/compare` | 对比 `sigIds` 指定的多个 SIG |

```bash
curl 'http://localhost:3000/api/v1/organization/timeseries/aggregated?range=90d&granularity=week'
curl 'http://localhost:3000/api/v1/sigs/compare?sigIds=1,2&range=90d&granularity=week'
```

## 贡献者接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/sig/:sigId/contributors` | 指定 SIG 的贡献者数据 |
| GET | `/api/v1/contributors/leaderboard` | 按 `metric` 排序的贡献者排行榜，返回数量由 `limit` 控制 |
| GET | `/api/v1/contributors/stats` | 贡献者总数、新贡献者和最活跃日期概览 |

```bash
curl 'http://localhost:3000/api/v1/sig/1/contributors?range=all'
curl 'http://localhost:3000/api/v1/contributors/leaderboard?range=30d&metric=commits&limit=20'
curl 'http://localhost:3000/api/v1/contributors/stats?range=30d'
```

Bot 账号不会进入人类贡献者指标，但 Bot 提交仍计入组织、SIG 和仓库的 Commit 与代码行活动量。

## 详情接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/organization/latest-activity` | GitHub 上最新的开放 PR 或 Issue；`type` 必须是 `prs` 或 `issues` |
| GET | `/api/v1/organization/day/:date` | 指定日期的组织活动明细，日期格式为 `YYYY-MM-DD` |
| GET | `/api/v1/contributors/:username` | 指定 GitHub 用户名对应的贡献者活动详情 |

```bash
curl 'http://localhost:3000/api/v1/organization/latest-activity?type=prs&page=1&per_page=10'
curl 'http://localhost:3000/api/v1/organization/day/2026-09-01'
curl 'http://localhost:3000/api/v1/contributors/octocat?range=all'
```

## 导出接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/export/csv` | 导出 CSV |
| GET | `/api/v1/export/excel` | 导出 Excel |
| POST | `/api/v1/export/pdf` | 根据请求体中的当前页面数据生成 PDF |

```bash
curl -L 'http://localhost:3000/api/v1/export/csv?range=30d' -o dashboard.csv
```

CSV 接口支持：

- `type=org|sig|comparison`
- `range=<days>d`
- `sigIds=1,2`：`sig` 使用第一个 ID，`comparison` 使用全部 ID
- `granularity=day|week|month`：仅 `org` 和 `sig` 会执行周/月聚合；`comparison` 始终导出日粒度数据

Excel 接口支持：

- `type=org|comparison`；当前不支持单独的 `type=sig`
- `range=<days>d`
- `sigIds=1,2`：用于 `comparison`
- `granularity=day|week|month`

PDF 接口不是数据查询接口。前端以 JSON 请求体提交 `type`、`range`、`sigIds`、`summary`、`growthData`、`sigData`、`contributors` 和 `timeseries` 等已加载数据，再由后端排版生成文件。
