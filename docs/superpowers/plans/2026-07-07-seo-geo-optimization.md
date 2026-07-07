# SEO / GEO Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变博客视觉风格的前提下，增强 Hugo 站点的 SEO 元信息、结构化数据、抓取入口和 GEO 机器可读性。

**Architecture:** 通过 Hugo 配置、模板 partial、构建产物验证测试和静态抓取说明文件完成优化；不改 SCSS、不改现有页面布局，只在 head、JSON-LD、索引与抓取规则层做增强。历史文章不大规模改写，缺失描述通过模板回退和新文章 archetype 兜底。

**Tech Stack:** Hugo 0.163.1, Go template, YAML, Python/pytest, static text artifacts

## Global Constraints

- 不修改现有 CSS 风格、配色、字体、布局与动效。
- 不做大规模文章正文重写。
- 优先修改模板层、配置层、抓取层、结构化数据层。
- 必须保持 Hugo 站点可正常构建。
- 变更应可回退、局部、可验证。

---

### Task 1: 为构建产物添加 SEO/GEO 回归测试

**Files:**
- Create: `tests/test_seo_geo_outputs.py`

**Interfaces:**
- Consumes: `public/` 目录中的 Hugo 构建产物
- Produces: 基于构建产物的回归测试，供后续任务反复执行

- [ ] Step 1: 写出验证首页、文章页、抓取文件、索引文件的失败测试
- [ ] Step 2: 运行 pytest，确认测试因当前缺少 meta/schema/抓取文件而失败
- [ ] Step 3: 保留测试作为后续实现验收标准

### Task 2: 实现 head 元信息与 JSON-LD 结构化数据

**Files:**
- Modify: `hugo.yaml`
- Modify: `themes/flavor/layouts/partials/head.html`
- Modify: `themes/flavor/layouts/_default/single.html`
- Create: `themes/flavor/layouts/partials/meta.html`
- Create: `themes/flavor/layouts/partials/schema.html`

**Interfaces:**
- Consumes: 页面 frontmatter、站点 params、文章时间 / 标签 / 分类信息
- Produces: 完整 SEO meta、OG/Twitter meta、WebSite/Person/BlogPosting/BreadcrumbList JSON-LD

- [ ] Step 1: 增加站点级 author / image / social / llms 参数
- [ ] Step 2: 抽出 description/summary/image 等回退逻辑到 meta partial
- [ ] Step 3: 在 head 中接入 meta 与 schema partial
- [ ] Step 4: 在文章页输出文章级结构化数据所需字段

### Task 3: 增强索引与抓取入口，并隔离 private 内容

**Files:**
- Modify: `themes/flavor/layouts/_default/index.json`
- Modify: `themes/flavor/layouts/index.html`
- Modify: `themes/flavor/layouts/_default/list.html`
- Modify: `archetypes/default.md`
- Create: `static/robots.txt`
- Create: `static/llms.txt`

**Interfaces:**
- Consumes: 文章 frontmatter、站点信息、页面类型和路径
- Produces: 更友好的 `index.json`、抓取规则文件、新文章模板字段规范

- [ ] Step 1: 为 `index.json` 增加 description / summary / author / lastmod / tags / categories
- [ ] Step 2: 从首页 / 列表页统一 description 摘要回退
- [ ] Step 3: 新增 `robots.txt` 与 `llms.txt`
- [ ] Step 4: 过滤 private 内容，避免进入搜索入口
- [ ] Step 5: 增强 `archetypes/default.md`，给未来文章提供更好的 SEO/GEO 默认字段

### Task 4: 构建验证与产物检查

**Files:**
- No source changes required beyond prior tasks

**Interfaces:**
- Consumes: 所有改动后的模板与配置
- Produces: 构建通过与测试通过的证据

- [ ] Step 1: 运行 `hugo --minify --buildFuture --cleanDestinationDir`
- [ ] Step 2: 运行 `pytest tests/test_seo_geo_outputs.py -q`
- [ ] Step 3: 抽查首页、文章页、`index.json`、`robots.txt`、`llms.txt`
- [ ] Step 4: 确认视觉风格未被修改（仅模板元数据变化）
