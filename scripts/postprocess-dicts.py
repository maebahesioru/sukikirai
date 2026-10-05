#!/usr/bin/env python3
"""辞書の後処理: 検証 + 新規キーの追記（translate UI 4語）"""
import json
import sys
import os

BASE = os.path.expanduser("~/repos/sukikirai/lib/i18n/messages")

# en.json に後から追加された4語（サブエージェントの翻訳対象外だった分）
POST = {
    "翻訳": {"zh-Hans": "翻译", "zh-Hant": "翻譯", "ko": "번역", "es": "Traducir", "fr": "Traduire"},
    "翻訳中...": {"zh-Hans": "翻译中...", "zh-Hant": "翻譯中...", "ko": "번역 중...", "es": "Traduciendo...", "fr": "Traduction..."},
    "翻訳を閉じる": {"zh-Hans": "关闭翻译", "zh-Hant": "關閉翻譯", "ko": "번역 닫기", "es": "Ocultar traducción", "fr": "Masquer la traduction"},
    "翻訳できませんでした": {"zh-Hans": "翻译失败", "zh-Hant": "翻譯失敗", "ko": "번역 실패", "es": "Error de traducción", "fr": "Échec de la traduction"},
}

en = json.load(open(f"{BASE}/en.json", encoding="utf-8"))
en_keys = set(en.keys())

for lang in ["zh-Hans", "zh-Hant", "ko", "es", "fr"]:
    path = f"{BASE}/{lang}.json"
    if not os.path.exists(path):
        print(f"!! {lang}: ファイル無し（サブエージェント未完了）")
        continue
    d = json.load(open(path, encoding="utf-8"))
    # 検証
    missing = en_keys - set(d.keys()) - set(POST.keys())
    extra = set(d.keys()) - en_keys
    empty = [k for k, v in d.items() if not str(v).strip()]
    # 追記
    added = 0
    for k, m in POST.items():
        if k not in d:
            d[k] = m[lang]
            added += 1
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    print(f"{lang}: {len(d)}エントリ (追記{added}) / 欠け{len(missing)} / 余分{len(extra)} / 空値{len(empty)}")
    if missing:
        print(f"   欠け例: {sorted(missing)[:3]}")
