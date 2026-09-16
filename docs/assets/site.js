/* ============================================================
   site.js · 站点数据（章节列表的唯一事实来源）
   侧边栏、首页卡片、上一章/下一章导航均由此渲染
   ============================================================ */
window.K8C = window.K8C || {};

K8C.groups = [
  { id: 'main',    label: '主线 · 一小时建立框架' },
  { id: 'topic',   label: '专题 · 按需展开' },
  { id: 'appendix',label: '附录' }
];

K8C.chapters = [
  /* ---- 主线 ---- */
  { group:'main', num:'00', file:'00-what-is-k8s.html', title:'K8s 是什么',
    desc:'它解决什么问题、和 Docker 是什么关系、什么场景该用（不该用）',
    mins:12, ready:true },
  { group:'main', num:'01', file:'01-how-it-works.html', title:'工作原理',
    desc:'四条贯穿 K8s 的核心思想。理解了它们，80% 的 K8s 对象可以自己推导出来',
    mins:18, ready:true },
  { group:'main', num:'02', file:'02-architecture.html', title:'架构总览',
    desc:'控制平面与节点组件的职责划分，每个组件是干什么的',
    mins:15, ready:true },
  { group:'main', num:'03', file:'03-birth-of-a-pod.html', title:'一个 Pod 的诞生',
    desc:'从 kubectl apply 到容器跑起来的全过程 —— 全书主轴，串起所有组件',
    mins:20, ready:true },

  /* ---- 专题 ---- */
  { group:'topic', num:'04', file:'04-object-map.html', title:'对象全景图',
    desc:'核心对象分类索引：先建立分类框架，不抠细节', mins:12, ready:true },
  { group:'topic', num:'05', file:'05-workloads.html', title:'工作负载',
    desc:'Deployment / StatefulSet / DaemonSet / Job，各自适用什么场景', mins:15, ready:true },
  { group:'topic', num:'06', file:'06-networking.html', title:'网络',
    desc:'Pod 互通、Service 四种类型、Ingress、DNS 解析链路', mins:20, ready:true },
  { group:'topic', num:'07', file:'07-storage.html', title:'存储',
    desc:'PV / PVC / StorageClass，动态供给与回收策略', mins:14, ready:true },
  { group:'topic', num:'08', file:'08-config-and-secret.html', title:'配置与密钥',
    desc:'ConfigMap / Secret，配置注入的几种方式与热更新问题', mins:12, ready:true },
  { group:'topic', num:'09', file:'09-scheduling-and-resources.html', title:'调度与资源',
    desc:'requests / limits、QoS、HPA 自动扩缩容、亲和性、污点与容忍', mins:18, ready:true },
  { group:'topic', num:'10', file:'10-security.html', title:'安全',
    desc:'RBAC、ServiceAccount、NetworkPolicy、Pod 安全准入', mins:15, ready:true },
  { group:'topic', num:'11', file:'11-extensibility.html', title:'扩展机制',
    desc:'CRD、Operator、准入控制 —— K8s 如何被扩展', mins:16, ready:true },
  { group:'topic', num:'12', file:'12-ops-and-troubleshooting.html', title:'运维与排障',
    desc:'kubectl 常用操作、常见故障排查树', mins:18, ready:true },

  /* ---- 附录 ---- */
  { group:'appendix', num:'', file:'glossary.html', title:'术语对照表',
    desc:'中英术语对照，跟随社区实际语感', mins:8, ready:true },
  { group:'appendix', num:'', file:'interview-cheatsheet.html', title:'面试速查',
    desc:'高频问题 + 加分表述 + 陷阱题清单', mins:10, ready:true }
];

K8C.chapterById = function (num) {
  return K8C.chapters.find(function (c) { return c.num === num; }) || null;
};

/* ============================================================
   术语注册表 · B 级「首次出现链接」
   只收「在某一章有详解、别处先会遇到」的名词。
   有「名词提示」框的 A 级名词（Pod / Service / Deployment /
   ReplicaSet / kubectl / API Server / etcd）不进此表——框已带链接。
   main.js 在每页为每个术语的首次出现挂一个链接，指向详解章。
   ============================================================ */
K8C.terms = [
  { name:'控制循环', target:'01' },
  { name:'kubelet', target:'02' },
  { name:'调度器', target:'02' },
  { name:'节点', target:'02' },
  { name:'集群', target:'02' },
  { name:'探针', target:'03' },
  { name:'命名空间', target:'04' },
  { name:'StatefulSet', target:'05' },
  { name:'DaemonSet', target:'05' },
  { name:'CronJob', target:'05' },
  { name:'Job', target:'05' },
  { name:'NetworkPolicy', target:'06' },
  { name:'Ingress', target:'06' },
  { name:'CoreDNS', target:'06' },
  { name:'EndpointSlice', target:'06' },
  { name:'StorageClass', target:'07' },
  { name:'PVC', target:'07' },
  { name:'PV', target:'07' },
  { name:'ConfigMap', target:'08' },
  { name:'Secret', target:'08' },
  { name:'ServiceAccount', target:'10' },
  { name:'RBAC', target:'10' },
  { name:'污点', target:'09' },
  { name:'容忍', target:'09' },
  { name:'亲和性', target:'09' },
  { name:'QoS', target:'09' },
  { name:'驱逐', target:'09' },
  { name:'HPA', target:'09' },
  { name:'CRD', target:'11' },
  { name:'Operator', target:'11' }
];
