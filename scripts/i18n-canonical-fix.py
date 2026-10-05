#!/usr/bin/env python3
"""canonicalをロケール対応に一括変換（静的metadata→generateMetadata化含む）"""
import re
import sys

FILES = [
    "app/(main)/page.tsx",
    "app/(main)/people/page.tsx",
    "app/(main)/person/[id]/page.tsx",
    "app/(main)/ranking/[type]/page.tsx",
    "app/(main)/terms/page.tsx",
    "app/(main)/search/page.tsx",
    "app/(main)/polls/create/page.tsx",
    "app/(main)/polls/[id]/page.tsx",
    "app/(main)/polls/page.tsx",
    "app/(main)/tag/[tag]/page.tsx",
    "app/(main)/stats/page.tsx",
    "app/(main)/meta/page.tsx",
    "app/(main)/sousenkyo/page.tsx",
    "app/(main)/today/page.tsx",
]

CANON_RE = re.compile(r'canonical:\s*(["`])([^"`]+)\1')

changed = []
for path in FILES:
    src = open(path, encoding="utf-8").read()
    orig = src

    # 1) imports
    if "getLocale" not in src:
        m = re.search(r'^import .*?;\n', src, re.M)
        ins = 'import { getLocale } from "@/lib/i18n-server";\n'
        src = src[:m.end()] + ins + src[m.end():]
    if "localePath" not in src:
        m = re.search(r'^import .*?;\n', src, re.M)
        ins = 'import { localePath } from "@/lib/i18n-core";\n'
        src = src[:m.end()] + ins + src[m.end():]

    # 2) 静的metadata → generateMetadata
    if re.search(r'export const metadata', src):
        m = re.search(r'export const metadata: Metadata = \{\n', src)
        if not m:
            print(f"SKIP(静的metadata形式不明): {path}")
            continue
        src = src[:m.start()] + 'export async function generateMetadata(): Promise<Metadata> {\n  const locale = await getLocale();\n  return {\n' + src[m.end():]
        # 閉じ: metadataブロックの "};" を探す（m.end()以降で行頭の};）
        close = re.search(r'\n\};\n', src[m.end():])
        if not close:
            print(f"SKIP(閉じ見つからず): {path}")
            continue
        pos = m.end() + close.start()
        src = src[:pos] + '\n  };\n}\n' + src[pos + len('\n};\n'):]
    # 3) 既存generateMetadata: const locale挿入
    elif 'const locale = await getLocale();' not in src:
        m = re.search(r'export (async )?function generateMetadata\([^)]*\)[^{]*\{\n', src)
        if m:
            if not m.group(1):
                src = src[:m.start()] + src[m.start():].replace("export function generateMetadata", "export async function generateMetadata", 1)
                m = re.search(r'export (async )?function generateMetadata\([^)]*\)[^{]*\{\n', src)
            src = src[:m.end()] + '  const locale = await getLocale();\n' + src[m.end():]
        else:
            print(f"SKIP(generateMetadata不明): {path}")
            continue

    # 4) canonical包み
    def wrap(m):
        return f'canonical: localePath(locale, {m.group(1)}{m.group(2)}{m.group(1)})'
    src, n = CANON_RE.subn(wrap, src)
    if n == 0:
        print(f"WARN(canonicalなし): {path}")

    if src != orig:
        open(path, "w", encoding="utf-8").write(src)
        changed.append(f"{path} (canonical×{n})")

print("\n".join(changed))
print(f"計 {len(changed)} ファイル変更")
