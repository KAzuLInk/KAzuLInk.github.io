# KAzuLink · 烛龙电控记录

一个复刻「闲居」(Hexo + Matery) 风格的**纯静态个人博客**，带 **Markdown 编译通道**。

- 风格：卡片式布局 + 滚动动画 + 右侧弹出分类
- 写作：用 Markdown 写文章，跑一条命令自动编译成网页
- 部署：GitHub Pages 免费托管（0 成本、0 维护）

---

## 目录结构

```
blog/
├── index.html           首页（编译脚本会自动更新文章列表）
├── about.html           关于页
├── categories.html      分类页（编译脚本会自动更新）
├── posts/               ← 你写文章的地方（Markdown 源文件）
│   ├── code-layering.md
│   ├── feedforward.md
│   └── template.md      文章模板（写新文章时复制它）
├── images/              文章配图
├── css/style.css        样式
├── js/main.js           交互
├── build.js             ← 编译脚本（运行 node build.js）
└── README.md            本文件
```

> 注意：`post-*.html` 是编译生成的产物，**不要手改它们**。要改文章内容，去改 `posts/` 里对应的 `.md` 文件，再重新编译。

---

## 编译通道：怎么写一篇新文章

1. 复制 `posts/template.md`，改成英文文件名，例如 `posts/lqr.md`；
2. 改文件顶部 `---` 之间的元信息：

   ```yaml
   title: 文章标题
   date: 2026-08-18
   category: 入门/框架
   tags: [标签1, 标签2]
   slug: lqr
   ```

3. 用 Markdown 写正文（语法见下面速查表）；
4. 在 `blog/` 目录下运行：

   ```
   node build.js
   ```

5. 脚本会自动：
   - 生成文章页 `post-lqr.html`
   - 更新首页「最新笔记」列表
   - 更新分类页
   - 更新篇数统计（首页抽屉 + 分类卡片）

**分类六选一**（`category` 字段只能填这六个之一）：

`入门/框架` · `电机控制` · `平衡轮腿` · `底盘/云台` · `比赛复盘` · `踩坑记录`

---

## Markdown 速查

| 你想写什么 | 写法 |
|---|---|
| 小标题 | `## 一、小标题`（`###` 是更小的标题） |
| 普通段落 | 直接写文字，空一行分段 |
| 代码块 | ```` ``` ```` 开头、```` ``` ```` 结尾，中间放代码 |
| 无序列表 | `- 项目一` |
| 有序列表 | `1. 第一步` |
| 引用/强调 | `> 想强调的话` |
| 加粗 | `**重点**` |
| 行内代码 | `` `代码` ``（反引号包起来） |
| 图片 | `![图注文字](images/图片名.png)` 单独一行 |

示例：

````markdown
## 一、调参心得

先调 `Kp`，再调 `Kd`：

```
kp = 1.0
kd = 0.05
```

> 抖动往往不是 K 太大，而是角速度反馈不够。
````

图片放在 `images/` 目录下，Markdown 里引用 `images/xxx.png`。

---

## 本地预览

双击 `index.html`，或在浏览器里打开。图标和动画走 CDN，需要联网。

---

## 怎么改个人信息

| 要改什么 | 去哪里改 |
|---|---|
| 头像 / 站点图标 | 替换 `preview.jpg`（建议 1:1 正方形） |
| 站点名 KAzuLink | `index.html` 的 `.brand` 和 `.hero .site-title` |
| 昵称、简介、身份 | `index.html` 的 `.profile-card` 里 |
| 社交链接 | `index.html` 的 `.profile-links` |
| 关于页内容 | `about.html` |

---

## 怎么部署到 GitHub Pages（免费上线）

1. 注册 [GitHub](https://github.com)；
2. 新建仓库，名字必须是 `KAzuLInk.github.io`（你的 GitHub 用户名是 KAzuLInk）；
3. 把 `blog/` 目录里的**所有文件**上传到仓库根目录（网页版直接拖进去，或 `git push`）；
   - 提示：`posts/`、`build.js` 也可以上传，不影响；只传编译产物 `*.html` + `css/` + `js/` + `images/` + `preview.jpg` 也能正常访问；
4. 仓库 → `Settings` → `Pages` → Source 选 `main` 分支根目录 → Save；
5. 等一两分钟，访问 `https://kazulink.github.io` 就能打开了（GitHub Pages 地址会统一转成小写）。

这个网址就是你的公开地址，任何人（手机/电脑）都能直接看，不需要服务器、不花钱、不用维护。

---

## 关于文章修订

每篇文章信息栏有「最后更新」字段，文末有「持续修订」提示。以后你改了某篇文章的 `.md`，把 `date` 保持原样，重新编译即可；想体现"修订过"，可以在 front matter 里加一行 `updated: 2026-09-18`。
