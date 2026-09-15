# k8s-cliche

> Kubernetes 里那些老生常谈、但你绕不过去的知识。
> **先有地图，再进丛林。**

**零第三方依赖 · 全手搓**（含 Canvas 图表引擎与语法高亮）｜ **静态站点 · GitHub Pages 部署** ｜ **CC-BY 4.0**

一份写给**初学者**与**面试者**的 Kubernetes 入门纲领：它是什么、干什么用的、分成哪几块、这些块之间怎么协作。有了这张地图，之后的任何深入你都知道自己站在哪。

**在线阅读**：部署于 GitHub Pages（见仓库 Settings → Pages，源为 `docs/` 目录）。

---

## 项目形态

- 纯静态 HTML / CSS / JavaScript，**零第三方依赖**，全部手搓（含 Canvas 图表引擎与语法高亮）
- `docs/` 为站点根目录，可直接被 GitHub Pages 部署
- 图表以「数据描述 + Canvas 渲染」方式实现，关键流程支持逐步动画演示

## 目录结构

```
docs/                          # 站点根目录（GitHub Pages 源）
├── index.html               # 首页（目录、阅读进度）
├── 404.html                 # 自包含的 404 页
├── 00-…12-*.html            # 主线四章 + 专题九章
├── glossary.html            # 附录 · 术语对照表
├── interview-cheatsheet.html# 附录 · 面试速查
└── assets/
    ├── style.css            # 全部样式（设计令牌 / 组件 / 响应式 / 打印）
    ├── site.js              # 章节数据（唯一事实来源）
    ├── diagram.js           # Canvas 图表引擎（节点/边/分组/动画）
    └── main.js              # 主题、侧栏、页内目录、代码高亮、进度等
```

`docs/` 下的静态页面即唯一事实来源：修改内容直接编辑对应 HTML（图表为页面内联的数据描述 + `assets/diagram.js` 渲染）；新增章节可复制现有页面作外壳模板。

## 内容规划

**主线（约 1 小时，必读）**

| 章节 | 内容 |
| :-- | :-- |
| 00 · 工作原理 | 四条贯穿 K8s 的基本原理 |
| 01 · K8s 是什么 | 解决什么问题、和 Docker 什么关系 |
| 02 · 架构总览 | 控制平面与节点组件的职责划分 |
| 03 · 一个 Pod 的诞生 | 从 `kubectl apply` 到容器跑起来（全书主轴） |

**专题（按需展开）**：04 对象全景图 · 05 工作负载 · 06 网络 · 07 存储 · 08 配置与密钥 · 09 调度与资源 · 10 安全 · 11 扩展机制 · 12 运维与排障

**附录**：术语对照表 · 面试速查

每章固定结构：一句话答案 → 为什么需要它 → 核心概念 → 怎么工作 → 面试官视角 → 常见误区 → 延伸。

## 本地预览

站点为纯静态、无构建步骤、运行期无任何网络请求，直接用浏览器打开即可：

```
docs/index.html
```

主题偏好与阅读进度存于浏览器 localStorage，在 `file://` 下同样可用。

## 部署（GitHub Pages）

1. 仓库 Settings → Pages → Source 选择 `Deploy from a branch`
2. Branch 选择 `main`，目录选择 `/docs`
3. `docs/.nojekyll` 已就位，跳过 Jekyll 处理

## 写作约定

- 中文为主；术语有通行中文名的用中文并括号标注英文，如：节点（Node）、调度器（Scheduler）
- 社区惯用英文的保留英文：Pod、Deployment、Service；组件名直接用：kubelet、etcd、kube-proxy
- 专注基础原理，不追新版本；涉及版本相关内容明确标注

## 许可

内容以 [CC-BY 4.0](LICENSE.txt) 许可发布。
