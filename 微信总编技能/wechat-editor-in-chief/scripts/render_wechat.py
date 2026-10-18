"""Render a trusted local article JSON to a new, offline WeChat delivery folder."""
import argparse
import base64
import html
import json
import re
import shutil
from pathlib import Path

P = 'margin:0 0 22px;font-size:17px;line-height:1.95;color:#273345;overflow-wrap:anywhere;'
CAP = 'margin:8px 0 24px;font-size:13px;line-height:1.75;color:#687483;overflow-wrap:anywhere;'
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
    for block in data['blocks']:
        kind=block.get('type')
        if kind not in ('paragraph','heading','quote','note','image'):
            raise ValueError('未知内容类型：'+str(kind))
        if kind=='heading' and block.get('level',2) not in (2,3):
            raise ValueError('heading level 只能为 2 或 3。')
        if kind=='image':
            src=(article_path.parent / block['path']).resolve()
            if not src.is_file() or src.suffix.lower() not in MIME:
                raise ValueError('图片不存在或格式不支持：'+str(src))
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
            src=(article_path.parent/block['path']).resolve()
            name=f'{len(manifest)+1:02d}-{src.stem}{src.suffix.lower()}'
            dest=out/'images'/name
            shutil.copy2(src,dest)
            image_id=f'image-{len(manifest)+1}'
            encoded=base64.b64encode(dest.read_bytes()).decode('ascii')
            caption=' · '.join(str(block[k]) for k in ('caption','credit','source') if block.get(k))
            if block.get('ai_generated'): caption+=' · AI生成概念插画' if caption else 'AI生成概念插画'
            alt=str(block.get('alt',''))
            fragments.append('<p style="margin:24px 0 0"><img id="'+image_id+'" alt="'+html.escape(alt,quote=True)+'" src="data:'+MIME[src.suffix.lower()]+';base64,'+encoded+'" style="display:block;width:100%;height:auto;border:0"></p>')
            if caption: fragments.append('<p style="'+CAP+'">'+inline(caption)+'</p>')
            md.append('!['+alt.replace('[','').replace(']','')+'](<'+dest.as_posix()+'>)'+ ('\n\n'+caption if caption else ''))
            manifest.append({**block,'file':'images/'+name,'source_path':str(src)})
            downloads.append('<button data-image="'+image_id+'" data-filename="'+html.escape(name,quote=True)+'">下载图片 '+str(len(manifest))+'</button>')
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
    (out/'发布说明.txt').write_text('打开 HTML，分别复制标题和正文，粘贴到公众号编辑器。检查图片并做手机预览；缺图时下载原图上传替换。HTML 离线内嵌图片，但不保证微信保留图片或所有样式。\n摘要：'+str(data.get('summary',''))+'\n评论区建议：'+str(data.get('comment','')),encoding='utf-8')
    # Build outside the folder so the archive cannot include itself.
    archive=shutil.make_archive(str(out.parent/(out.name+'-素材包')),'zip',root_dir=out)
    print(json.dumps({'html':str(out/(stem+'.html')),'markdown':str(out/(stem+'.md')),'archive':archive,'images':len(manifest)},ensure_ascii=False))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--article',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--stem',default='article-final')
    args=parser.parse_args()
    try: render(args.article.resolve(),args.out.resolve(),args.stem)
    except (ValueError,OSError,KeyError,TypeError) as exc: parser.exit(1,str(exc)+'\n')
