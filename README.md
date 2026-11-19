# CCF期刊会议集合网站

一个简洁现代的学术风格网站，展示中国计算机学会(CCF)推荐的期刊和会议信息。

## 🌟 项目特色

- **完整数据**：收录681条CCF推荐目录条目（2026年第七版正式版，含4月9日勘误）
- **智能搜索**：支持按缩写、英文名、中文名搜索
- **多维筛选**：按类型(期刊/会议)和级别(A/B/C类)筛选
- **响应式设计**：完美适配桌面、平板、手机等设备
- **学术风格**：简洁现代的界面设计
- **目录链接**：访问官方目录提供的链接（多数为DBLP）；目录没有链接时不生成空链接

## 📊 数据统计

- **总计**：681条目录条目
- **期刊**：295条 (A类37条 + B类113条 + C类145条)
- **会议**：386条 (A类58条 + B类132条 + C类196条)
- **覆盖领域**：10个主要CCF专业领域

## 🚀 快速开始

### 部署到GitHub Pages

1. **Fork 项目**，然后在 fork 的 Actions 页启用工作流。
2. **启用 GitHub Pages**：在 Settings → Pages → Build and deployment，将 Source 设为 **GitHub Actions**。
   - 在 Actions 中手动运行一次 **Deploy static content to Pages**，确认通过后即可访问。之后推送到 `main` 会自动部署；定时更新每天北京时间 10:17 排程。

3. **访问网站**
   ```
   https://yourusername.github.io/your-repository-name
   ```

### 本地开发

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/ccf-website.git
   cd ccf-website
   ```

2. **启动本地服务器**
   ```bash
   # 使用Python
   python -m http.server 8080
   
   # 或使用Node.js
   npx serve .
   ```

3. **访问网站**
   ```
   http://localhost:8080
   ```

## 📁 项目结构

```
ccf-website/
├── index.html              # 主页面
├── README.md              # 项目说明
├── css/
│   └── styles.css         # 样式文件
├── js/
│   └── main.js           # 主要功能脚本
└── public/
    └── data/
        └── ccf_complete.json  # CCF数据文件
```

## 🔧 功能特性

### 搜索功能
- **实时搜索**：输入即时显示结果
- **多字段搜索**：支持缩写、英文名、中文名
- **模糊匹配**：智能识别关键词

### 筛选功能
- **类型筛选**：全部 / 期刊 / 会议
- **级别筛选**：全部 / A类 / B类 / C类
- **组合筛选**：支持多个条件同时筛选

### 展示功能
- **详细信息**：显示中英文名称、缩写、分类、描述
- **级别标识**：清晰的A/B/C级别标识
- **外链跳转**：一键访问官方网站
- **统计信息**：实时显示筛选结果数量

## 🎨 技术栈

- **前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **样式**：原生CSS，响应式设计
- **字体**：Google Fonts (Inter)
- **图标**：SVG图标
- **数据**：JSON格式存储

## 📱 响应式设计

- **桌面端**：完整功能展示
- **平板端**：适配中等屏幕
- **移动端**：优化触摸体验

## 🔄 数据更新

### 更新CCF数据

1. **获取最新数据**
   - 访问CCF官方目录
   - 下载最新的期刊会议列表

2. **更新数据文件**
   - 编辑 `public/data/ccf_complete.json`
   - 保持数据格式一致性

3. **更新统计信息**
   - 修改 `index.html` 中的默认统计数字
   - 更新 `js/main.js` 中的统计显示逻辑

### 数据格式

```json
{
  "metadata": {
    "title": "中国计算机学会推荐国际学术期刊和会议目录",
    "version": "2026.1",
    "last_updated": "2025-11-04",
    "total_items": 681,
    "journals_count": 295,
    "conferences_count": 386
  },
  "data": {
    "journals": [...],
    "conferences": [...]
  }
}
```

## 🎯 使用场景

- **学术研究**：查找合适的期刊和会议投稿
- **学术评估**：了解期刊会议的CCF级别
- **学习参考**：了解计算机科学领域的重要期刊会议
- **选刊选会**：为学术论文选择合适的发表平台

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🤝 贡献

欢迎提交问题和改进建议！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](../../issues)

## 🙏 致谢

- [中国计算机学会(CCF)](https://www.ccf.org.cn/) - 提供权威的期刊会议推荐目录
- [Google Fonts](https://fonts.google.com/) - 提供Inter字体
- 所有为学术资源整理做出贡献的研究者和机构

---

**最后更新**：2026年11月19日


## 数据来源与复核

- [CCF 第七版正式发布公告](https://www.ccf.org.cn/Academic_Evaluation/By_category/2026-03-31/870181.shtml)，2026-03-31 发布，公告注明 2026-04-09 修正勘误。
- 本次从公告直接链接下载正式 PDF；SHA-256：`271b630b576bf8a4f802e767f5694caded93680e22b3a19bef7902591c45c1d3`。与[华北电力大学公开镜像](https://cce.ncepu.edu.cn/docs/2026-08/75b5af5644e64b519884bf7383f1bde9.pdf)逐字节一致。
- 按 PDF 表格逐行提取 681 条。不同领域重复收录的期刊保留为独立目录条目，因此统计为条目数而非去重刊会数。
- `source_page` 为 PDF 的 1 起始页码；出版社、缩写、名称和网址保留官方内容。官方未提供的 JCC、JATS 网址留空，不猜测地址。
- `ccf_all.json` 保留旧 A 类子集接口并同步至本版；页面读取 `ccf_complete.json`。
- 重建：安装 `PyMuPDF==1.26.6` 后执行 `python scripts/import_ccf_pdf.py /path/to/official.pdf`。
- 校验：`python scripts/validate_data.py`；`node --check js/main.js`。
- 目录限正式长文/Regular paper；Short、Demo、Workshop、Findings 等不在该目录的会议论文范围内。该目录是投稿推荐，不宜作为单一成果评价依据。

### 逐会议日期：CCFDDL 社区数据

`public/data/conference-deadlines.json` 由 [CCFDDL](https://github.com/ccfddl/ccf-deadlines) 社区目录生成，遵循 MIT 许可（原版权及许可见 `docs/licenses/CCFDDL-MIT.txt`）。这与 CCF 等级的官方数据来源不同，也不是逐条官网核验的日程。HPDC 继续优先使用独立官方快照。

采用 **DBLP 路径 + 规范化会议缩写双重匹配**，不把混合会议/track 自动映射给单个会议。每个系列保留上游最新届次、edition ID、全部轮次、摘要/全文/通知/rebuttal、原时区、会议日期和地点。过期届次保留原年份，缺失项目留空，不推算下一届。上游有时按自身约定填入 AoE 或 23:59:59，因此应以会议官网为准。会议主页链接不当作投稿系统链接。

定时工作流先解析 GitHub 的 upstream commit SHA，然后下载该固定版本的 archive；每条保留 commit 固定链接。使用原子写入；覆盖不足 200 条或比上次缩水超过 10% 时拒绝替换。解析/网络失败会保留最后有效记录并标记 `refresh_status: stale`；Actions cache 支持跨次运行回退，没有缓存则使用随仓库提交的快照。若连旧快照也无效则停止部署。权限仍为 contents: read / pages: write / id-token: write。

```sh
python -m pip install PyYAML==6.0.3
python scripts/refresh_conference_deadlines.py
python scripts/refresh_conference_deadlines.py --validate-only
# 可复现特定 checkout：
python scripts/refresh_conference_deadlines.py --source-dir /path/to/ccf-deadlines --revision <40位commit-SHA>
```

Schema v1：`conferences[]` 包含 `catalogue_ids`（官方目录稳定 ID）、`acronym`、`year`、`edition_id`、`rounds[].dates`。只有一个轮次时 `dates` 才提供同一份日期；多个轮次时 `dates` 为空，前端必须展示各轮次。`verified_at` 固定为 null，`fetched_at` 仅指拉取时间；`source_kind: community` 不可显示成“官方已核验”。
