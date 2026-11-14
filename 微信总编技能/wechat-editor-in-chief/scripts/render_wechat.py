"""Render a trusted local article JSON to a new, offline WeChat delivery folder."""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote

P = 'margin:0 0 22px;font-size:17px;line-height:1.95;color:#273345;overflow-wrap:anywhere;'
CAP = 'margin:8px 0 24px;font-size:13px;line-height:1.75;color:#687483;overflow-wrap:anywhere;'
PH = 'margin:24px 0 8px;padding:36px 16px;border:2px dashed #a9bcc9;border-radius:8px;background:#f6f9fb;text-align:center;font-size:15px;color:#687483;overflow-wrap:anywhere;'
TOKEN = re.compile(r'\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?://[^\s)]+)\)')
MIME = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp'}


def inline(value):
    text = str(value)
    pieces, last = [], 0
    for m in TOKEN.finditer(text):
        pieces.append(html.escape(text[last:m.start()]))
        if m[1] is not None:
            pieces.append('<strong style="font-weight:700;color:#174e40">'+html.escape(m[1])+'</strong>')
        elif m[2] is not None:
            pieces.append('<code style="background:#f1f4f6;padding:2px 4px">'+html.escape(m[2])+'</code>')
        else:
            pieces.append('<a style="color:#176b54;text-decoration:underline;overflow-wrap:anywhere" href="'+html.escape(m[4], quote=True)+'">'+html.escape(m[3])+'</a>')
        last=m.end()
    pieces.append(html.escape(text[last:]))
    return ''.join(pieces).replace('\n','<br>')


def render(article_path, out, stem):
    if out.exists():
        raise ValueError('输出目录已存在，请使用新版本目录，避免覆盖旧稿。')
    if (out.parent/(out.name+'-素材包.zip')).exists():
        raise ValueError('素材包已存在，请使用新版本目录。')
    if not re.fullmatch(r'[\w-]+', stem):
        raise ValueError('stem 仅支持文字、数字、下划线和连字符。')
    data=json.loads(article_path.read_text(encoding='utf-8-sig'))
    if not isinstance(data.get('title'),str) or not data['title'].strip() or not isinstance(data.get('blocks'),list):
        raise ValueError('title 必须非空，blocks 必须为数组。')
    # Validate all source paths and block types before creating output.
    for index, block in enumerate(data['blocks'], start=1):
        kind=block.get('type')
        if kind not in ('paragraph','heading','quote','note','image'):
            raise ValueError('第 %d 个 block 类型未知：%s' % (index, str(kind)))
        if kind=='heading' and block.get('level',2) not in (2,3):
            raise ValueError('第 %d 个 heading 的 level 只能为 2 或 3。' % index)
        if kind=='image':
            raw_path=block.get('path')
            if raw_path:
                src=(article_path.parent / str(raw_path)).resolve()
                if not src.is_file() or src.suffix.lower() not in MIME:
                    raise ValueError('第 %d 张图片不存在或格式不支持：%s' % (index, src))
            elif not str(block.get('prompt','')).strip():
                raise ValueError('第 %d 个 image 缺少 path；暂无配图时请提供 prompt，以便生成占位图与提示词。' % index)
    out.mkdir(parents=True)
    (out/'images').mkdir()
    fragments, md, manifest, downloads=[],['# '+data['title']],[],[]
    byline=' · '.join(str(data[k]) for k in ('publication','author','date') if data.get(k))
    if byline:
        fragments.append('<p style="'+CAP+'">'+html.escape(byline)+'</p>')
        md.append(byline)
    for block in data['blocks']:
        kind=block['type']; text=str(block.get('text',''))
        if kind=='image':
            caption=' · '.join(str(block[k]) for k in ('caption','credit','source') if block.get(k))
            if block.get('ai_generated'): caption+=' · AI生成概念插画' if caption else 'AI生成概念插画'
            alt=str(block.get('alt',''))
            number=len(manifest)+1
            if not block.get('path'):
                # No image yet: keep a visible placeholder and carry the prompt forward.
                prompt=str(block.get('prompt','')).strip()
                fragments.append('<div style="'+PH+'">配图占位 %02d（待补图）</div>' % number)
                if caption: fragments.append('<p style="'+CAP+'">'+inline(caption)+'</p>')
                fragments.append('<p style="'+CAP+'">生成提示词：'+inline(prompt)+'</p>')
                md.append('[配图占位 %02d｜待补图]' % number + ('\n\n生成提示词：'+prompt if prompt else '') + ('\n\n'+caption if caption else ''))
                manifest.append({**block,'file':'','placeholder':True})
                continue
            src=(article_path.parent/str(block['path'])).resolve()
            name=f'{number:02d}-{src.stem}{src.suffix.lower()}'
            dest=out/'images'/name
            shutil.copy2(src,dest)
            image_id=f'image-{number}'
            rel='images/'+name
            fragments.append('<p style="margin:24px 0 0"><img id="'+image_id+'" alt="'+html.escape(alt,quote=True)+'" src="'+html.escape(quote(rel),quote=True)+'" style="display:block;width:100%;height:auto;border:0"></p>')
            if caption: fragments.append('<p style="'+CAP+'">'+inline(caption)+'</p>')
            md.append('!['+alt.replace('[','').replace(']','')+'](<'+dest.as_posix()+'>)'+ ('\n\n'+caption if caption else ''))
            manifest.append({**block,'file':rel,'source_path':str(src)})
            downloads.append('<button data-image="'+image_id+'" data-filename="'+html.escape(name,quote=True)+'">下载图片 '+str(number)+'</button>')
        elif kind=='heading':
            level=block.get('level',2)
            fragments.append(f'<h{level} style="margin:32px 0 16px;font-size:{23 if level==2 else 20}px;line-height:1.5;color:#174e40;overflow-wrap:anywhere">'+inline(text)+f'</h{level}>')
            md.append('#'*level+' '+text)
        else:
            style=P
            if kind in ('quote','note'):style+='padding:12px 16px;background:#f3f7f5;border-left:3px solid #43816b;'
            fragments.append('<p style="'+style+'">'+inline(text)+'</p>')
            md.append(('> ' if kind in ('quote','note') else '')+text)
    body='<section id="wechat-body" style="max-width:677px;margin:0 auto;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'PingFang SC\',\'Microsoft YaHei\',sans-serif">'+''.join(fragments)+'</section>'
    extras=''.join('<p>'+html.escape(label)+inline(data[key])+'</p>' for key,label in [('summary','摘要：'),('comment','评论区建议：')] if data.get(key))+''.join(downloads)
    template=(Path(__file__).resolve().parent.parent/'assets'/'wechat.html').read_text(encoding='utf-8')
    replacements={'TITLE':html.escape(data['title']),'BODY':body,'EXTRAS':extras}
    page=re.sub(r'@@(TITLE|BODY|EXTRAS)@@',lambda m:replacements[m[1]],template)
    (out/(stem+'.html')).write_text(page,encoding='utf-8')
    (out/(stem+'.md')).write_text('\n\n'.join(md)+'\n',encoding='utf-8')
    (out/'image-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    placeholders=sum(1 for item in manifest if item.get('placeholder'))
    (out/'发布说明.txt').write_text('打开 HTML，分别复制标题和正文，粘贴到公众号编辑器。HTML 引用同目录 images/ 中的图片，移动或分享时请连同 images/ 或整个素材包一起；粘贴后检查图片并做手机预览，缺图时下载原图上传替换。微信可能清洗样式或丢失图片。\n配图：%d 张，其中占位待补 %d 张。\n摘要：%s\n评论区建议：%s' % (len(manifest), placeholders, str(data.get('summary','')), str(data.get('comment',''))), encoding='utf-8')
    # Build outside the folder so the archive cannot include itself.
    archive=shutil.make_archive(str(out.parent/(out.name+'-素材包')),'zip',root_dir=out)
    print(json.dumps({'html':str(out/(stem+'.html')),'markdown':str(out/(stem+'.md')),'archive':archive,'images':len(manifest)-placeholders,'placeholders':placeholders},ensure_ascii=False))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--article',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--stem',default='article-final')
    args=parser.parse_args()
    try: render(args.article.resolve(),args.out.resolve(),args.stem)
    except (ValueError,OSError,KeyError,TypeError) as exc: parser.exit(1,str(exc)+'\n')
