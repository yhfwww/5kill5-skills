# HTML 发布规范与使用方法

这是本地发布稿，不是网站部署。按钮由用户点击才复制，不自动写剪贴板，不上传素材。

## 从同一内容源输出

运行（路径按环境替换）：

```sh
python -X utf8 <skill-dir>/scripts/render_wechat.py --article article.json --out output --stem article-final
```

脚本只用 Python 标准库，无网络请求。输出目录必须不存在，防止覆盖旧稿。生成 MD、离线 HTML、images、图片清单、发布说明和 ZIP。修改后输出到新的版本目录。

文章 JSON 示例：

```json
{
  "title": "文章标题",
  "publication": "公众号名称（可省略）",
  "author": "作者署名（可省略）",
  "date": "发布日期（可省略）",
  "summary": "供公众号摘要栏使用，不混进正文。",
  "comment": "一句话观点。",
  "blocks": [
    {"type": "paragraph", "text": "一个**关键判断**，附[原始来源](https://example.com/report)。"},
    {"type": "heading", "level": 2, "text": "变化在哪里"},
    {"type": "image", "path": "cover.png", "alt": "图片内容描述", "caption": "图注", "credit": "作者", "source": "", "license": "原创", "purpose": "概念解释", "ai_generated": true, "prompt": "最终生成提示词"},
    {"type": "image", "prompt": "扁平插画：早高峰地铁车厢里看手机的通勤者，冷色调，16:9", "alt": "通勤场景示意", "caption": "待补图", "purpose": "氛围"},
    {"type": "quote", "text": "有出处的短引文。"},
    {"type": "note", "text": "数据的适用条件。"}
  ]
}
```

title、blocks 必填；其余元数据可选。支持 paragraph、heading（2/3级）、quote、note、image；文本仅支持简单加粗、行内代码和 HTTP(S) 链接，不是完整 Markdown 解析器，原始 HTML 会转义。表格/数据图先另行绘制成 PNG。图片支持 PNG/JPEG/GIF/WebP；路径相对 JSON 或绝对路径，输入应为可信本地稿件。

图片块省略 `path`、只给 `prompt` 时输出“配图占位 N（待补图）”及生成提示词，用于暂无作图工具或图片待补的情况；占位不是真实配图，清单中标记 `placeholder: true`，交付时必须说明待补张数。

图片的 caption、credit、source 会进入图注；license、purpose、prompt 保留在清单中。ai_generated 为 true 时自动增加“AI生成概念插画”图注。生成图不要冒充资料截图；图表的重要条件和单位须明确写入 caption。MD 的图片使用导出绝对路径，移动目录后需要更新；HTML 以 `images/` 相对路径引用图片，与 `images/` 同目录时可离线打开。

## 复制正文是交付功能

`#wechat-body` 是唯一复制目标；文章标题在外，工具栏、下载链接、摘要、评论区建议和脚本也在外。正文署名留在内。样式使用简单 section/p/strong/a/img 并内联，不依赖页面 CSS 类、外部字体或脚本呈现内容。

点击按钮优先使用 ClipboardItem 同时写 `text/html` 与 `text/plain`，保留段落、强调、图片和图注。失败时选中正文，通过 copy 事件与 execCommand 尝试；仍失败则保持选中状态，提示 Ctrl+C/Cmd+C。只有写入成功才显示成功，绝不把“已选中”说成“已复制”。标题另有独立复制按钮。

HTML 通过 `images/` 相对路径引用图片，不做 base64 内嵌，避免多图把页面撑到几十 MB；离线预览时 HTML 必须与 `images/` 保持同目录，移动或分享请连同目录或素材 ZIP 一起。相对路径的图片不保证微信接收，需在粘贴后检查。提供每张图片的下载按钮和独立 images 目录；缺图时在公众号素材库上传原图并替换。不要擅自上传图床。微信可能清洗样式，最终以编辑器及手机预览为准。

## 验收与交付说明

检查桌面与约 390px 手机宽度无横向溢出，图片全部加载或占位框正常显示，图表文字可读。测试复制载荷包含正文、内联样式及图片引用（图片本身不会随剪贴板传输，粘贴后需补传），并排除 h1、工具栏、按钮和脚本。覆盖现代复制、降级和手动选择提示；标题复制独立验证。

自动化可使用页面内剪贴板替身拦截载荷，避免改动用户系统剪贴板。区分“载荷验证通过”和“已在微信后台粘贴验证”；只有实际操作过才声称后者。告诉用户：打开 HTML → 复制标题 → 复制正文（带格式）→ 粘贴到公众号编辑器 → 检查图片和手机预览。
