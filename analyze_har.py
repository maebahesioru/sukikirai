import json
import sys

# HARファイルを読み込む
with open('hikamers-suki-kira.vercel.app.json', 'r', encoding='utf-8') as f:
    har_data = json.load(f)

# ファイルサイズを集計
files = []
total_size = 0

for entry in har_data['log']['entries']:
    url = entry['request']['url']
    size = entry['response']['content']['size']
    mime_type = entry['response']['content']['mimeType']
    
    total_size += size
    files.append({
        'url': url,
        'size': size,
        'mime_type': mime_type,
        'size_kb': round(size / 1024, 2)
    })

# サイズでソート
files_sorted = sorted(files, key=lambda x: x['size'], reverse=True)

print("=" * 100)
print("📊 データ転送量の内訳（上位30ファイル）")
print("=" * 100)
print()

# 上位30ファイルを表示
for i, file in enumerate(files_sorted[:30], 1):
    filename = file['url'].split('/')[-1][:60]
    print(f"{i:2}. {file['size_kb']:>8.2f} KB | {file['mime_type'][:30]:<30} | {filename}")

print()
print("=" * 100)
print("📈 MIMEタイプ別の集計")
print("=" * 100)
print()

# MIMEタイプ別に集計
mime_stats = {}
for file in files:
    mime = file['mime_type']
    if mime not in mime_stats:
        mime_stats[mime] = {'count': 0, 'total_size': 0}
    mime_stats[mime]['count'] += 1
    mime_stats[mime]['total_size'] += file['size']

# サイズでソート
mime_sorted = sorted(mime_stats.items(), key=lambda x: x[1]['total_size'], reverse=True)

for mime, stats in mime_sorted:
    size_kb = round(stats['total_size'] / 1024, 2)
    print(f"{mime[:40]:<40} | {stats['count']:>3}個 | {size_kb:>10.2f} KB")

print()
print("=" * 100)
print(f"📦 総データ転送量: {round(total_size / 1024, 2)} KB ({round(total_size / 1024 / 1024, 2)} MB)")
print(f"📄 総ファイル数: {len(files)}個")
print("=" * 100)
