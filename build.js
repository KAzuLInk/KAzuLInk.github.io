#!/usr/bin/env node
/**
 * KAzuLink 编译脚本
 *
 * 用法：在 blog 目录下运行  node build.js
 *
 * 作用：
 *   1. 读取 posts/*.md（Markdown 源文件）
 *   2. 渲染成 HTML 文章页（post-{slug}.html）
 *   3. 自动更新 index.html 的首页文章列表
 *   4. 自动更新 categories.html 的分类文章列表与篇数
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_DIR = ROOT;               // 生成结果输出到 blog 根目录
const POSTS_DIR = path.join(ROOT, 'posts');
const IMAGES_DIR = path.join(ROOT, 'images');

// 分类映射：分类名 -> { 锚点 id, 图标 }
const CATEGORIES = {
  '入门/框架': { id: 'framework', icon: 'fa-layer-group' },
  '电机控制': { id: 'motor', icon: 'fa-gauge-high' },
  '平衡轮腿': { id: 'leg', icon: 'fa-person-running' },
  '底盘/云台': { id: 'chassis', icon: 'fa-gears' },
  '比赛复盘': { id: 'review', icon: 'fa-flag-checkered' },
  '踩坑记录': { id: 'pitfall', icon: 'fa-triangle-exclamation' },
};

// ============================================================
// 工具函数
// ============================================================

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 行内元素渲染
function renderInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');                 // 行内代码
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">'); // 图片
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');     // 链接
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');        // 加粗
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');                    // 斜体
  return s;
}

// Markdown 块级渲染
function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块 ```...```
    if (/^```/.test(line.trim())) {
      i++;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      html.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
      continue;
    }

    // 标题 # ## ### ####
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      html.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 无序列表 - 或 *
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^\s*[-*]\s+/, '')) + '</li>');
        i++;
      }
      html.push('<ul>' + items.join('') + '</ul>');
      continue;
    }

    // 有序列表 1.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + renderInline(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
        i++;
      }
      html.push('<ol>' + items.join('') + '</ol>');
      continue;
    }

    // 引用 >
    if (/^>\s?/.test(line)) {
      const parts = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(renderInline(lines[i].replace(/^>\s?/, '')));
        i++;
      }
      html.push('<blockquote>' + parts.join('<br>') + '</blockquote>');
      continue;
    }

    // 图片单独成行 ![caption](src)
    const img = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
    if (img) {
      html.push(
        `<figure class="figure">` +
        `<img src="${img[2]}" alt="${escapeHtml(img[1])}">` +
        `<figcaption class="caption">${escapeHtml(img[1])}</figcaption>` +
        `</figure>`
      );
      i++;
      continue;
    }

    // 空行
    if (line.trim() === '') { i++; continue; }

    // 段落（累积到空行或下一个块级元素）
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4}\s|```|>\s?|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i]) &&
      !/^!\[([^\]]*)\]\(([^)]+)\)$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) {
      html.push('<p>' + renderInline(para.join(' ')) + '</p>');
    }
  }

  return html.join('\n');
}

// 解析 front matter（--- 包裹的元数据）
function parseFrontMatter(src) {
  const m = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  m[1].split(/\r?\n/).forEach((line) => {
    const kv = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(line);
    if (!kv) return;
    const key = kv[1];
    let val = kv[2].trim();
    if (key === 'tags') {
      val = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    }
    meta[key] = val;
  });
  return { meta, body: src.slice(m[0].length) };
}

// 去掉 markdown 标记，取纯文本（用于生成摘要）
function stripMarkdown(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`_\-\d\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// 模板
// ============================================================

// 完整文章页
function pageShell(p) {
  const tags = (p.tags || []).join(' · ');
  const updated = p.updated || p.date;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(p.title)}">
  <title>${escapeHtml(p.title)} · KAzuLink</title>
  <link rel="icon" type="image/png" href="preview.jpg">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <header class="navbar-fixed">
    <nav id="headNav" class="nav-transparent">
      <div class="container">
        <div class="brand">
          <a href="index.html" class="waves-effect">
            <img src="preview.jpg" class="logo-img" alt="LOGO">
            <span>KAzuLink</span>
          </a>
        </div>
        <ul class="nav-menu">
          <li><a href="index.html" class="waves-effect"><i class="fas fa-home"></i><span>首页</span></a></li>
          <li><a href="about.html" class="waves-effect"><i class="fas fa-user"></i><span>关于</span></a></li>
          <li><a href="categories.html" class="waves-effect"><i class="fas fa-bookmark"></i><span>分类</span></a></li>
          <li><a href="https://github.com/KAzuLInk" target="_blank" class="waves-effect"><i class="fab fa-github"></i><span>GitHub</span></a></li>
        </ul>
      </div>
    </nav>
  </header>

  <section class="page-hero">
    <h1 data-aos="fade-up">${escapeHtml(p.title)}</h1>
    <p data-aos="fade-up" data-aos-delay="100">分类：${escapeHtml(p.category)}</p>
  </section>

  <main class="container">
    <div class="article" data-aos="fade-up">
      <div class="article-meta">
        <span><i class="fas fa-calendar"></i> ${p.date}</span>
        <span><i class="fas fa-bookmark"></i> ${escapeHtml(p.category)}</span>
        <span><i class="fas fa-tags"></i> ${escapeHtml(tags)}</span>
        <span><i class="fas fa-user"></i> KAzu</span>
        <span><i class="fas fa-rotate"></i> 最后更新 ${updated}</span>
      </div>

${p.bodyHtml}

      <div class="article-note">
        <i class="fas fa-rotate"></i> 本文会随着作者的成长持续修订 · 最后更新于 ${updated}
      </div>
    </div>
  </main>

  <footer>
    <p>© 2026 KAzuLink · 烛龙战队电控记录</p>
    <p>Made with <span class="heart">❤</span> by <a href="about.html">KAzu</a> · 灵感来自「闲居」</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
`;
}

// 首页文章卡片
function postCard(p, idx) {
  const delay = idx >= 3 ? 300 : idx * 100;
  const delayAttr = idx === 0 ? '' : ` data-aos-delay="${delay}"`;
  return `        <article class="card post-card hoverable" data-aos="fade-up"${delayAttr}>
          <div class="post-meta">
            <span><i class="fas fa-calendar"></i>${p.date}</span>
            <span><i class="fas fa-bookmark"></i>${escapeHtml(p.category)}</span>
            <span><i class="fas fa-tags"></i>${escapeHtml((p.tags || []).join(' · '))}</span>
          </div>
          <h3><a href="post-${p.slug}.html">${escapeHtml(p.title)}</a></h3>
          <p class="post-excerpt">${escapeHtml(p.excerpt)}</p>
        </article>`;
}

// 分类页文章条目
function catItem(p) {
  return `          <li><a href="post-${p.slug}.html">${escapeHtml(p.title)}</a><span class="date">${p.date}</span></li>`;
}

// 分类 section
function catSection(catKey, posts) {
  const cat = CATEGORIES[catKey];
  const body = posts.length
    ? '<ul>\n' + posts.map(catItem).join('\n') + '\n        </ul>'
    : '<p class="cat-empty">暂无文章</p>';
  return `      <section id="${cat.id}" class="cat-section" data-aos="fade-up">
        <h2><i class="fas ${cat.icon}"></i>${escapeHtml(catKey)}</h2>
        ${body}
      </section>`;
}

// ============================================================
// 主流程
// ============================================================

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('找不到 posts/ 目录，请在 blog/ 下运行本脚本');
    process.exit(1);
  }

  // 1. 读取并解析所有 markdown
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && f !== 'template.md');
  const posts = files.map((f) => {
    const src = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const { meta, body } = parseFrontMatter(src);
    if (!meta.title || !meta.date || !meta.category) {
      console.error(`  ✗ ${f} 缺少 title / date / category（front matter 必填）`);
      process.exit(1);
    }
    const slug = meta.slug || f.replace(/\.md$/, '');
    const excerpt = meta.excerpt || stripMarkdown(body).slice(0, 80) || '';
    return { ...meta, slug, excerpt, bodyHtml: renderMarkdown(body) };
  });

  // 按日期倒序
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 2. 生成文章页
  let generated = [];
  for (const p of posts) {
    const out = path.join(OUT_DIR, `post-${p.slug}.html`);
    fs.writeFileSync(out, pageShell(p), 'utf8');
    generated.push(`post-${p.slug}.html`);
  }

  // 3. 更新 index.html 文章列表
  const indexPath = path.join(OUT_DIR, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf8');
  const cards = posts.map(postCard).join('\n\n');
  indexHtml = replaceBetween(indexHtml, '<!-- POSTS_START -->', '<!-- POSTS_END -->', '\n' + cards + '\n      ');
  // 更新右侧抽屉的分类篇数
  for (const key of Object.keys(CATEGORIES)) {
    const cat = CATEGORIES[key];
    const n = posts.filter((p) => p.category === key).length;
    const re = new RegExp(`(categories\\.html#${cat.id}"[\\s\\S]*?<span class="count">)\\d+(</span>)`);
    indexHtml = indexHtml.replace(re, `$1${n}$2`);
  }
  // 更新个人卡片文章总数
  indexHtml = indexHtml.replace(/(<div class="stat"><b>)\d+(<\/b><span>文章<\/span>)/, `$1${posts.length}$2`);
  fs.writeFileSync(indexPath, indexHtml, 'utf8');

  // 4. 更新 categories.html 分类列表与篇数
  const catPath = path.join(OUT_DIR, 'categories.html');
  let catHtml = fs.readFileSync(catPath, 'utf8');
  const sections = Object.keys(CATEGORIES)
    .map((key) => catSection(key, posts.filter((p) => p.category === key)))
    .join('\n\n');
  catHtml = replaceBetween(catHtml, '<!-- CAT_SECTIONS_START -->', '<!-- CAT_SECTIONS_END -->', '\n' + sections + '\n    ');
  // 更新每个分类卡片的篇数
  for (const key of Object.keys(CATEGORIES)) {
    const cat = CATEGORIES[key];
    const n = posts.filter((p) => p.category === key).length;
    const re = new RegExp(`(<a class="cat-card" href="#${cat.id}"[\\s\\S]*?<span class="count">)\\d+( 篇</span>)`);
    catHtml = catHtml.replace(re, `$1${n}$2`);
  }
  fs.writeFileSync(catPath, catHtml, 'utf8');

  // 5. 输出统计
  console.log('✅ 编译完成');
  console.log(`   文章总数：${posts.length}`);
  console.log('   生成页面：');
  generated.forEach((g) => console.log('     - ' + g));
  console.log('   已更新：index.html、categories.html');
}

// 替换两个标记之间的内容
function replaceBetween(html, startMark, endMark, newContent) {
  const start = html.indexOf(startMark);
  const end = html.indexOf(endMark);
  if (start === -1 || end === -1) {
    console.error(`找不到标记 ${startMark} / ${endMark}`);
    process.exit(1);
  }
  const afterStart = start + startMark.length;
  return html.slice(0, afterStart) + newContent + html.slice(end);
}

main();
