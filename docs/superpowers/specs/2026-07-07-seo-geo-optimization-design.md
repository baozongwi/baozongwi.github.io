# SEO / GEO 优化设计（不改博客视觉风格）

## 目标
在不修改博客主题视觉风格、布局结构与交互体验的前提下，提升站点对传统搜索引擎（SEO）和 AI 搜索 / 答案引擎（GEO）的可理解性、可抓取性与可引用性。

## 约束
- 不修改现有 CSS 风格、配色、字体、布局与动效。
- 不做大规模文章正文重写。
- 优先修改模板层、配置层、抓取层、结构化数据层。
- 必须保持 Hugo 站点可正常构建。
- 变更应可回退、局部、可验证。

## 范围
1. 站点级 SEO 元信息完善
2. 文章级结构化数据（JSON-LD）
3. GEO 友好的机器可读索引增强
4. robots.txt 与 llms.txt 抓取入口
5. 对 private 内容的公开抓取隔离
6. 新文章 frontmatter 模板增强
7. 列表页与文章页 description / summary 回退策略

## 非目标
- 不更换主题
- 不重做导航
- 不批量重写 200+ 历史文章
- 不引入需要额外服务端的功能

## 关键思路
### SEO
- 在 `head` 中补齐更完整的 meta 信息：description、canonical、Open Graph、Twitter Card、robots。
- 为首页 / 列表页 / 文章页输出更稳定的一致信息。
- 为缺失 description 的页面提供安全回退。

### GEO
- 为首页与文章页补充 `WebSite` / `Person` / `BlogPosting` / `BreadcrumbList` 等 JSON-LD。
- 让 `index.json` 输出更适合机器抽取的字段：description、summary、author、lastmod、tags、categories。
- 增加 `llms.txt`，告诉 AI crawler 哪些路径优先读取。

### private 内容隔离
- private 内容不应继续进入公开 feed / 搜索索引 / robots 推荐入口。
- 通过模板过滤与抓取规则降低被抓取概率，且不影响现有加密逻辑。

## 受影响文件
- `hugo.yaml`
- `themes/flavor/layouts/partials/head.html`
- `themes/flavor/layouts/_default/single.html`
- `themes/flavor/layouts/_default/list.html`
- `themes/flavor/layouts/index.html`
- `themes/flavor/layouts/_default/index.json`
- `archetypes/default.md`
- `static/robots.txt`
- `static/llms.txt`
- 新增若干布局 partial / 测试文件

## 验证标准
- Hugo 构建成功。
- 首页与文章页 head 中出现预期 meta / canonical / og / twitter。
- 文章页输出合法 JSON-LD。
- `robots.txt` 与 `llms.txt` 存在且内容符合优化目标。
- `index.json` 字段增强。
- private 页面不再出现在搜索索引入口中。
- 站点视觉风格无显著变化。
