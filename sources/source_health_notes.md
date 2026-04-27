# 基督教资讯源健康说明

更新时间：2026-04-02（Asia/Shanghai）

## 当前主构建状态

- 本轮真实入库：`47` 条
- 本轮成功信源：`10`
- 本轮失败信源：`6`
- 本轮批次超时：`2`
- 当前来源分层：
  - `stable`：`10` 个实际跑通
  - `experimental`：继续保留但不影响主站稳定
  - `manual`：先保留元数据，不纳入自动抓取

## 当前稳定跑通

- 今日基督教（中文）
  - 入口：`https://zh.christianitytoday.com/feed/`
  - 方式：固定 feed
  - 说明：中文深度内容，适合进入「值得学」与「值得读」

- 《世代》 Kosmos China
  - 入口：`https://www.kosmoschina.org/feed`
  - 方式：固定 feed
  - 说明：公共神学与城市文化内容质量高

- 基督教论坛报
  - 入口：`https://ct.org.tw/html/news/?ID=avir.txt`
  - 方式：列表页解析
  - 说明：需要走代理链，已验证可稳定抓到

- 时代论坛
  - 入口：`https://www.christiantimes.org.hk/Common/Reader/Version/Show.jsp?Charset=big5_hkscs&Pid=2&Version=2013`
  - 方式：列表页解析
  - 说明：需要走代理链，已验证可稳定抓到

- Christianity Today
  - 入口：`https://www.christianitytoday.com/feed/`
  - 方式：固定 feed

- ChurchLeaders
  - 入口：`https://churchleaders.com/feed`
  - 方式：固定 feed

- Mission Network News
  - 入口：`https://www.missionnetworknews.org/feed/`
  - 方式：固定 feed

- Aleteia
  - 入口：`https://aleteia.org/feed/`
  - 方式：固定 feed
  - 说明：当前环境下更依赖 insecure TLS

- RELEVANT
  - 入口：`https://relevantmagazine.com/feed/`
  - 方式：固定 feed

- The Christian Post
  - 入口：`https://www.christianpost.com/rss`
  - 方式：固定 feed

## 当前实验层

这些来源被保留在实验层，不会拖垮主构建，但仍值得继续适配：

- Christian Today
  - 现状：`SSL EOF`
  - 判断：更像站点 TLS/出口链路问题，不是解析器单点问题

- Premier Christian News
  - 现状：已切到首页头条列表解析，不再依赖受 Cloudflare 保护的 RSS 路径
  - 判断：当前已验证可稳定抓取，可纳入稳定层

- Ecumenical News
  - 现状：常见 RSS 入口 `404/500`
  - 判断：需要重新找入口，不适合继续用通用 feed 发现

- Evangelical Focus
  - 现状：已切到首页内嵌文章数据解析，不再依赖不存在的 `/feed`
  - 判断：当前已验证可稳定抓取，可纳入稳定层

- Baptist Press
  - 现状：首页新闻卡片可解析，feed 仍为空频道，`wp-json` 不稳定且常见 403
  - 判断：已切到首页新闻列表解析，当前可稳定纳入稳定层

- Religion News Service
  - 现状：RSS 已稳定可抓取
  - 判断：当前已纳入稳定层

- WORLD
  - 现状：前台页面普遍 403，但官方 GraphQL 接口可公开读取文章列表
  - 判断：已改成 GraphQL 入口，当前已验证可稳定抓取，可纳入稳定层

## 当前手工层

这些来源先保留元数据和入口说明，不纳入自动抓取：

- 中国基督教网
- 基督邮报中文
- China Christian Daily
- 福音时报
- 世界华人基督教联盟媒体
- ReFrame Ministries Chinese
- 《教会》 ChurchChina

原因不是“它们没价值”，而是当前还缺稳定 feed 或单站解析入口。

## 这轮确认下来的关键结论

### 1. 不是所有撞墙都是平台问题

像 `基督教论坛报`、`时代论坛` 这两家，最后确认主要是我们自己的抓取策略有问题：

- 默认绕开代理会抓不到
- 页面结构和旧解析器也对不上

修完后它们已经进入稳定层。

### 2. 代理链既是问题，也是解法

当前环境下，很多英文源更适合绕开系统代理；
但少数中文站反而必须通过当前代理链才能拿到稳定 HTML。

所以现在策略不是“一刀切全直连”，而是：

- 默认绕开环境代理
- 对少数来源按站点启用 `use_env_proxy`

### 3. 主站优先目标已经从“接尽可能多来源”切到“稳定完成构建”

现在失败源允许留在实验层，但不能再拖垮整轮更新。

## 下一步建议

1. 优先给实验层站点补列表页入口
2. 把慢源单独拆成次级批次，不影响主站更新
3. 继续给手工层中文站补单站解析
