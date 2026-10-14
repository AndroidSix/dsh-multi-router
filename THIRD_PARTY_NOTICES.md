# Third-Party Notices / 第三方声明

本文件记录 `dsh-multi-router` 中包含的第三方代码及其许可证。

## 包含方式（Vendoring）

本包在 `upstream/` 目录下**按固定 commit 引入**了三个上游项目的源码，用于其认证解析、模型发现与聊天传输模块。引入的 commit 与版本记录在 [`upstream-lock.json`](./upstream-lock.json)，可通过 `npm run fetch-upstream` 复现（脚本会校验检出内容与 lock 文件一致）。

- 三个上游项目均为 **MIT 许可**，允许使用、复制、修改、合并、出版与再分发，条件是**保留版权声明与许可文本**。
- 每个上游目录内保留其原始 `LICENSE` 文件；本文件同时汇总各家许可文本与本地改动说明。
- 使用或再分发本项目时，你必须**同时**遵守本项目 [`LICENSE`](./LICENSE) 与下列三个上游项目的 MIT 许可要求。
- 上游项目的维护、更新与可用性不由本项目负责。

## 本地集成改动 / Local Integration Changes

- WorkBuddy 的共享适配器额外透传集成后 provider 目录中**显式声明**的 Minimal 推理模式；WorkBuddy 原有的模型发现逻辑与 provider 专有的档位词表未作改动。
- 三家代码被打包进同一个插件宿主，账号池、路由与用量统计为本项目新增实现。

---

## 1. workbuddy

- Source: <https://github.com/corrinehu/dsh-workbuddy-connect.git>
- Commit: `caad7a9447e9c5c4f09653c6d5c2c34782c9ad81`
- Version: 0.7.3
- License: MIT
- Copyright (c) 2026 Corrine Hu

```text
MIT License

Copyright (c) 2026 Corrine Hu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 2. trae

- Source: <https://github.com/dingminhua/dsh-connect-trae.git>
- Commit: `43f29df900f10fa2a5817e5740d196637bc062dd`
- Version: 3.4.3
- License: MIT
- Copyright (c) 2026 LaoDing

```text
MIT License

Copyright (c) 2026 LaoDing

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 上游 trae 自身的第三方参考

被引入的 `dsh-connect-trae` 项目在其文档中声明：其设计与实现参考了 `dsh-trae-api`（<https://github.com/Wang-JQ77/dsh-trae-api>，MIT）与 `laojichao/trae-local-api`（未声明许可），方式为「借鉴架构思路 + 独立实现」，未整体复制其源码，亦未再分发。该说明属于上游项目自身的声明，完整原文见 `upstream/trae/THIRD_PARTY_NOTICES.md`。本项目沿用同样的立场：仅引入上游已发布的 MIT 源码，不额外复制上述参考项目的代码。

---

## 3. qoder

- Source: <https://github.com/masknull/dsh-qoder-connect.git>
- Commit: `160461bc8d5905e79bef631eb5057dd918b7ca10`
- Version: 0.2.3
- License: MIT
- Copyright (c) 2026 Corrine Hu

```text
MIT License

Copyright (c) 2026 Corrine Hu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 运行时依赖

`@deepseek-ai/*`（cordis、schemastery、dsh-llm 系列）、`@earendil-works/pi-ai`、`react` 等作为 peer / npm 依赖随各自发布包携带其许可证，不在本文档逐条记录。

## 免责与用途

引入上述代码不构成对任何平台的授权。本项目**仅供个人学习研究**，解析客户端本地登录态或使用未公开接口可能违反对应平台服务条款，详见 [`DISCLAIMER.md`](./DISCLAIMER.md)。

若你对本文件的完整性有疑问或发现遗漏，请提交 issue 或 PR。
