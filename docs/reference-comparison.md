# 模型管理参考对比

核对日期：2026-10-16。本文基于源码，不以市场简介代替实现核验。

- [dingminhua/dsh-connect-workbuddy](https://github.com/dingminhua/dsh-connect-workbuddy)，提交 `15e2fc9e67bf7ab44c0751e818b5be14e46cf155`。
- [dingminhua/dsh-connect-trae](https://github.com/dingminhua/dsh-connect-trae)，提交 `696c740ac4da19f573f9e4e1231d254aebcb9db1`。
- 对照本项目 v0.6.0。本项目内置的 WorkBuddy 内核来自 **corrinehu/dsh-workbuddy-connect**，与上面的界面参考项目不同。

## 值得采用的设计

| 方面 | WorkBuddy 参考插件 | Trae 参考插件 | 本项目采用方式 |
| --- | --- | --- | --- |
| 上下文 | 原生窗口与本地预算分开，无设置时不再统一压到 200K | 保存 dev/Max 元数据，提供真实档位选择 | 保留默认、最大、支持档位；默认最大，可手动调低 |
| 模型展示 | 一行集中展示勾选、能力、容量、测试入口 | 模型选择与区域目录隔离，显示输出上限、推理等级 | 保留紧凑表格；设置弹窗集中调整名称、上下文、图片、默认推理 |
| 图片 | 区分平台声明与原生识图；已知能力表有来源 | 正向识别 multimodal，未知能力不自动视为支持 | 使用渠道显式能力，可关闭；未声明时不提供强制开启，避免误发图片 |
| 关闭思考 | 记录部分模型拒绝 off 的实测情况，允许用户调整 | 推理档位来自对应模型目录 | 保留渠道真实档位，关闭思考只在声明支持时出现；不跨模型推断 |
| 测试 | 区分限流、余额不足、凭证问题，并提供真实容量探测 | 单模型、启用模型和全部模型测试 | 加入手动单模型短请求测试，明确不等于满上下文验证；不自动批量消耗积分 |
| 账号发现 | 发现和账号池放在同一区，按区域保留目录与草稿 | 明确反馈扫描结果、来源和区域；导入按身份去重 | 继续复用已有首次自动发现、去重、全部供应商账号池；不复制第二份缓存 |
| 刷新状态 | 请求去重、取消、丢弃过期响应；保存与获取分开 | 区域状态独立，保留明确反馈 | 复用现有 revision 校验、缓存和刷新去重；模型旧缓存后台补齐能力元数据 |

代码入口：[WorkBuddy 上下文](https://github.com/dingminhua/dsh-connect-workbuddy/blob/15e2fc9e67bf7ab44c0751e818b5be14e46cf155/src/catalog.ts)、[WorkBuddy 设置](https://github.com/dingminhua/dsh-connect-workbuddy/blob/15e2fc9e67bf7ab44c0751e818b5be14e46cf155/src/client/WorkBuddyCard.tsx)、[WorkBuddy 思考能力](https://github.com/dingminhua/dsh-connect-workbuddy/blob/15e2fc9e67bf7ab44c0751e818b5be14e46cf155/src/off-thinking.ts)、[Trae 模型元数据](https://github.com/dingminhua/dsh-connect-trae/blob/696c740ac4da19f573f9e4e1231d254aebcb9db1/src/catalog.ts)、[Trae 设置](https://github.com/dingminhua/dsh-connect-trae/blob/696c740ac4da19f573f9e4e1231d254aebcb9db1/src/client/TraeUsageCard.tsx)。

## 本次定位与修复

v0.6.0 的 `modelInfo` 丢弃 `maxContextWindow`、`defaultContextWindow`、`supportedContextWindows`；预制路由固定 200K。另有实际请求层问题：Qoder 传输按 `contextOptions.isDefault` 选择窗口，仅修改 DSH 展示仍会使用原始默认档位。

修复覆盖原始模型、普通路由、动态免费模型和 API 共用的路由器。默认采用已发现的最大容量；容量较小的账号不承接该预算，不截断历史、不静默降低容量。调低预算后，能容纳此预算的账号即可参与。Qoder 每次请求独立选择能够容纳预算的最小真实档位，避免并发串档。

已有 200K 隐式默认迁移为最大容量；显式 `contextMode: custom` 及其他已有自定义预算保留。保存的设置随配置导出与导入迁移。原始模型的上下文设置和路由预算独立。

## Qwen 预配置

| 模型 | Trae CN | Qoder CN |
| --- | --- | --- |
| Qwen3.8-Max | `qwen3.8-max` | `qmodel_38max` |
| Qwen3.8-Flash | `qwen3.8-flash` | `qfmodel` |

上述 ID 已与本机已保存的真实目录逐项核对；当前 WorkBuddy 目录未发现这两个模型，不创建虚假的 WorkBuddy 目标。现有用户可在「路由规则 → 添加预配置」补齐，不覆盖已有自定义路由。

Hy4 Preview 预配置使用 WorkBuddy 中国版目录的 `hy4-preview`，当前本机目录声明 960K 上下文；默认采用目录最大值，而不是用回退目录的 1M 覆盖真实结果。其他渠道未发现对应模型，不添加猜测目标。

## 验证边界

上下文上限取自渠道目录，不凭模型名称推断；最大窗口并不保证每个账号都能实际发送满窗口，账号限流、套餐、请求体和上游运行限制仍可能更小。短请求测试只检查连通性，不能据此宣布 1M 容量或图片识别实测通过。测试只在用户主动点击时执行。

仅借鉴设计并独立实现本地管理逻辑，未替换内置协议内核，也未复制这两个参考插件的源码。
