#!/usr/bin/env python3
"""Собирает index.html из исходников в src/.

src/page.html — каркас страницы; в нём метки /*@CSS@*/ и /*@JS@*/.
src/style.css — стили; src/js/*.js — скрипт, файлы склеиваются по алфавиту в одну общую область.

Метка сборки берётся из прежнего index.html: если содержимое не изменилось,
tools/stamp.py оставит её прежней и приложения у пользователей зря не перезагрузятся.

Запуск: python3 tools/build.py   (потом python3 tools/stamp.py)
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src'
META = re.compile(r'(<meta name="app-build" content=")([^"]*)(">)')


def main() -> int:
    page = (SRC / 'page.html').read_text(encoding='utf-8')
    css = (SRC / 'style.css').read_text(encoding='utf-8')
    parts = []
    for p in sorted((SRC / 'js').glob('*.js')):
        parts.append(p.read_text(encoding='utf-8').rstrip() + '\n')
    js = '\n'.join(parts)
    if '</script' in js.lower():
        print('В скрипте есть «</script» — так страницу собирать нельзя')
        return 2
    for mark in ('/*@CSS@*/', '/*@JS@*/'):
        if page.count(mark) != 1:
            print(f'В src/page.html должна быть ровно одна метка {mark}')
            return 2
    out = page.replace('/*@CSS@*/', css.rstrip()).replace('/*@JS@*/', js.rstrip())

    target = ROOT / 'index.html'
    if target.exists():
        old = META.search(target.read_text(encoding='utf-8'))
        if old:
            out = META.sub(lambda m: m.group(1) + old.group(2) + m.group(3), out, count=1)
    target.write_text(out, encoding='utf-8')
    print(f'index.html: {len(out.encode("utf-8")) // 1024} КБ')
    return 0


if __name__ == '__main__':
    sys.exit(main())
