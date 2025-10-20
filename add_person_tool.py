import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, filedialog
import json
import os
import csv
import re

class PersonAdderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("人物追加ツール - ヒカマーズ好き嫌い.com")
        self.root.geometry("600x700")
        self.root.resizable(True, True)
        
        # JSONファイルのパス
        self.json_path = os.path.join(os.path.dirname(__file__), "data", "people.json")
        
        # メインフレーム
        main_frame = ttk.Frame(root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # ウィンドウリサイズ時の挙動設定
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        main_frame.rowconfigure(13, weight=1)
        
        # タイトル
        title_label = ttk.Label(main_frame, text="人物情報を入力", font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        # 名前
        ttk.Label(main_frame, text="名前: *", font=("Arial", 10, "bold")).grid(row=1, column=0, sticky=tk.W, pady=5)
        self.name_entry = ttk.Entry(main_frame, width=40, font=("Arial", 10))
        self.name_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=5)
        
        # ID
        ttk.Label(main_frame, text="ID: *", font=("Arial", 10, "bold")).grid(row=2, column=0, sticky=tk.W, pady=5)
        self.id_entry = ttk.Entry(main_frame, width=40, font=("Arial", 10))
        self.id_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), pady=5)
        ttk.Label(main_frame, text="（半角英数字・ハイフン・アンダースコア。アンダーバーは自動でハイフンに変換）", font=("Arial", 8), foreground="gray").grid(row=3, column=1, sticky=tk.W)
        
        # タグ
        ttk.Label(main_frame, text="タグ:", font=("Arial", 10, "bold")).grid(row=4, column=0, sticky=tk.W, pady=(15, 5))
        self.tags_entry = ttk.Entry(main_frame, width=40, font=("Arial", 10))
        self.tags_entry.grid(row=4, column=1, sticky=(tk.W, tk.E), pady=(15, 5))
        self.tags_entry.insert(0, "ヒカマー")  # デフォルト値
        ttk.Label(main_frame, text="（カンマ区切りで複数入力可: 例「ヒカマー, 配信者」）", font=("Arial", 8), foreground="gray").grid(row=5, column=1, sticky=tk.W)
        
        # 関連人物
        ttk.Label(main_frame, text="関連人物:", font=("Arial", 10, "bold")).grid(row=6, column=0, sticky=tk.W, pady=(15, 5))
        self.related_entry = ttk.Entry(main_frame, width=40, font=("Arial", 10))
        self.related_entry.grid(row=6, column=1, sticky=(tk.W, tk.E), pady=(15, 5))
        ttk.Label(main_frame, text="（カンマ区切りでIDを入力: 例「jujika, person2」）", font=("Arial", 8), foreground="gray").grid(row=7, column=1, sticky=tk.W)
        
        # 説明
        ttk.Label(main_frame, text="説明:", font=("Arial", 10, "bold")).grid(row=8, column=0, sticky=tk.W, pady=(15, 5))
        self.description_text = scrolledtext.ScrolledText(main_frame, width=40, height=5, font=("Arial", 10), wrap=tk.WORD)
        self.description_text.grid(row=8, column=1, sticky=(tk.W, tk.E), pady=(15, 5))
        self.description_text.insert('1.0', "ヒカマー")  # デフォルト値
        
        # ボタンフレーム
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=9, column=0, columnspan=2, pady=(30, 0))
        
        # 追加ボタン
        add_button = ttk.Button(button_frame, text="追加", command=self.add_person, width=15)
        add_button.grid(row=0, column=0, padx=5)
        
        # クリアボタン
        clear_button = ttk.Button(button_frame, text="クリア", command=self.clear_fields, width=15)
        clear_button.grid(row=0, column=1, padx=5)
        
        # プレビューボタン
        preview_button = ttk.Button(button_frame, text="プレビュー", command=self.preview_json, width=15)
        preview_button.grid(row=0, column=2, padx=5)
        
        # CSVインポートボタン
        csv_button = ttk.Button(button_frame, text="CSV一括追加", command=self.open_csv_import, width=15)
        csv_button.grid(row=1, column=0, columnspan=3, pady=(10, 0))
        
        # ステータスバー
        self.status_label = ttk.Label(main_frame, text="準備完了", relief=tk.SUNKEN, anchor=tk.W)
        self.status_label.grid(row=10, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(20, 0))
        
        # 既存の人物一覧
        ttk.Label(main_frame, text="既存の人物一覧:", font=("Arial", 10, "bold")).grid(row=11, column=0, columnspan=2, sticky=tk.W, pady=(20, 5))
        
        # 検索ボックス
        search_frame = ttk.Frame(main_frame)
        search_frame.grid(row=12, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        ttk.Label(search_frame, text="検索:", font=("Arial", 9)).pack(side=tk.LEFT, padx=(0, 5))
        self.search_entry = ttk.Entry(search_frame, font=("Arial", 9))
        self.search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.search_entry.bind('<KeyRelease>', self.filter_people_list)
        
        self.people_listbox = tk.Listbox(main_frame, height=8, font=("Arial", 9))
        self.people_listbox.grid(row=13, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        
        scrollbar = ttk.Scrollbar(main_frame, orient=tk.VERTICAL, command=self.people_listbox.yview)
        scrollbar.grid(row=13, column=2, sticky=(tk.N, tk.S))
        self.people_listbox.config(yscrollcommand=scrollbar.set)
        
        # 削除ボタン
        delete_button_frame = ttk.Frame(main_frame)
        delete_button_frame.grid(row=14, column=0, columnspan=2, pady=(5, 0))
        
        ttk.Button(delete_button_frame, text="選択した人物を削除", command=self.delete_person, width=20).pack(side=tk.LEFT, padx=5)
        ttk.Label(delete_button_frame, text="（リストから人物を選択してください）", font=("Arial", 8), foreground="gray").pack(side=tk.LEFT, padx=5)
        
        # 既存データを読み込み
        self.people_data = []
        self.displayed_people = []  # 現在表示中の人物リスト
        self.load_existing_people()
    
    def load_existing_people(self):
        """既存の人物データを読み込む"""
        try:
            if os.path.exists(self.json_path):
                with open(self.json_path, 'r', encoding='utf-8') as f:
                    self.people_data = json.load(f)
                    self.update_people_listbox()
                    self.status_label.config(text=f"既存の人物: {len(self.people_data)}件")
            else:
                self.people_data = []
                self.status_label.config(text="people.jsonが見つかりません")
        except Exception as e:
            self.people_data = []
            messagebox.showerror("エラー", f"ファイルの読み込みに失敗しました:\n{str(e)}")
    
    def update_people_listbox(self, filtered_data=None):
        """人物リストボックスを更新"""
        self.people_listbox.delete(0, tk.END)
        data_to_display = filtered_data if filtered_data is not None else self.people_data
        self.displayed_people = data_to_display  # 表示中のデータを保持
        for person in data_to_display:
            display_text = f"{person['name']} (ID: {person['id']})"
            self.people_listbox.insert(tk.END, display_text)
    
    def filter_people_list(self, event=None):
        """検索テキストに基づいて人物リストをフィルタリング"""
        search_text = self.search_entry.get().lower()
        
        if not search_text:
            # 検索テキストが空の場合は全員表示
            self.update_people_listbox()
            return
        
        # あいまい検索（名前とIDで検索）
        filtered = []
        for person in self.people_data:
            name_match = search_text in person['name'].lower()
            id_match = search_text in person['id'].lower()
            tags_match = any(search_text in tag.lower() for tag in person.get('tags', []))
            
            if name_match or id_match or tags_match:
                filtered.append(person)
        
        self.update_people_listbox(filtered)
        
        # ステータスバーに検索結果の件数を表示
        if search_text:
            self.status_label.config(text=f"検索結果: {len(filtered)}件 / 全{len(self.people_data)}件")
        else:
            self.status_label.config(text=f"既存の人物: {len(self.people_data)}件")
    
    def clear_fields(self):
        """入力フィールドをクリア"""
        self.name_entry.delete(0, tk.END)
        self.id_entry.delete(0, tk.END)
        self.tags_entry.delete(0, tk.END)
        self.related_entry.delete(0, tk.END)
        self.description_text.delete('1.0', tk.END)
        self.status_label.config(text="入力フィールドをクリアしました")
    
    def validate_id(self, person_id):
        """IDのバリデーション"""
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', person_id):
            return False
        return True
    
    def preview_json(self):
        """JSONプレビューを表示"""
        name = self.name_entry.get().strip()
        person_id = self.id_entry.get().strip()
        
        if not name or not person_id:
            messagebox.showwarning("警告", "名前とIDは必須です")
            return
        
        person_data = self.create_person_data()
        
        # プレビューウィンドウ
        preview_window = tk.Toplevel(self.root)
        preview_window.title("JSONプレビュー")
        preview_window.geometry("500x400")
        
        text_widget = scrolledtext.ScrolledText(preview_window, wrap=tk.WORD, font=("Courier", 10))
        text_widget.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        json_str = json.dumps(person_data, ensure_ascii=False, indent=2)
        text_widget.insert('1.0', json_str)
        text_widget.config(state=tk.DISABLED)
    
    def create_person_data(self):
        """入力データから人物オブジェクトを作成"""
        name = self.name_entry.get().strip()
        person_id = self.id_entry.get().strip()
        tags_str = self.tags_entry.get().strip()
        related_str = self.related_entry.get().strip()
        description = self.description_text.get('1.0', tk.END).strip()
        
        # IDのアンダーバーを自動でハイフンに変換
        person_id = person_id.replace('_', '-')
        
        # タグを配列に変換
        tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()] if tags_str else []
        
        # 関連人物を配列に変換
        related = [r.strip() for r in related_str.split(',') if r.strip()] if related_str else []
        
        return {
            "id": person_id,
            "name": name,
            "tags": tags,
            "relatedPeople": related,
            "description": description if description else ""
        }
    
    def add_person(self):
        """人物をpeople.jsonに追加"""
        # バリデーション
        name = self.name_entry.get().strip()
        person_id = self.id_entry.get().strip()
        # アンダーバーをハイフンに変換
        person_id = person_id.replace('_', '-')
        
        if not name:
            messagebox.showwarning("警告", "名前を入力してください")
            return
        
        if not person_id:
            messagebox.showwarning("警告", "IDを入力してください")
            return
        
        if not self.validate_id(person_id):
            messagebox.showwarning("警告", "IDは半角英数字・ハイフン・アンダースコアのみ使用できます")
            return
        
        try:
            # 既存データを読み込み
            people = []
            if os.path.exists(self.json_path):
                with open(self.json_path, 'r', encoding='utf-8') as f:
                    people = json.load(f)
            
            # IDの重複チェック
            if any(p['id'] == person_id for p in people):
                messagebox.showwarning("警告", f"ID '{person_id}' は既に存在します")
                return
            
            # 新しい人物を追加
            new_person = self.create_person_data()
            people.append(new_person)
            
            # ファイルに保存
            with open(self.json_path, 'w', encoding='utf-8') as f:
                json.dump(people, f, ensure_ascii=False, indent=2)
            
            messagebox.showinfo("成功", f"「{name}」を追加しました！")
            self.status_label.config(text=f"追加成功: {name}")
            
            # フィールドをクリア
            self.clear_fields()
            
            # リストを更新
            self.load_existing_people()
            
        except Exception as e:
            messagebox.showerror("エラー", f"追加に失敗しました:\n{str(e)}")
            self.status_label.config(text="エラーが発生しました")
    
    def delete_person(self):
        """選択した人物を削除"""
        selection = self.people_listbox.curselection()
        
        if not selection:
            messagebox.showwarning("警告", "削除する人物を選択してください")
            return
        
        index = selection[0]
        if index >= len(self.displayed_people):
            messagebox.showerror("エラー", "無効な選択です")
            return
        
        # 表示中のリストから取得
        person = self.displayed_people[index]
        
        # 確認ダイアログ
        result = messagebox.askyesno(
            "削除確認",
            f"以下の人物を削除しますか？\n\n名前: {person['name']}\nID: {person['id']}\n\nこの操作は取り消せません。"
        )
        
        if not result:
            return
        
        try:
            # 元のデータからIDで削除
            person_id = person['id']
            self.people_data = [p for p in self.people_data if p['id'] != person_id]
            
            # ファイルに保存
            with open(self.json_path, 'w', encoding='utf-8') as f:
                json.dump(self.people_data, f, ensure_ascii=False, indent=2)
            
            messagebox.showinfo("成功", f"「{person['name']}」を削除しました")
            self.status_label.config(text=f"削除成功: {person['name']}")
            
            # リストを更新（検索フィルタを再適用）
            self.load_existing_people()
            self.filter_people_list()
            
        except Exception as e:
            messagebox.showerror("エラー", f"削除に失敗しました:\n{str(e)}")
            self.status_label.config(text="エラーが発生しました")
    
    def open_csv_import(self):
        """CSV一括インポートウィンドウを開く"""
        csv_window = tk.Toplevel(self.root)
        csv_window.title("CSV一括インポート")
        csv_window.geometry("900x600")
        csv_window.resizable(True, True)
        
        CSVImportWindow(csv_window, self)

class CSVImportWindow:
    def __init__(self, window, parent_app):
        self.window = window
        self.parent_app = parent_app
        self.csv_data = []
        self.displayed_csv_data = []  # 現在表示中のデータ
        self.checkboxes = []
        self.entries = {}
        
        # メインフレーム
        main_frame = ttk.Frame(window, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # タイトル
        title_label = ttk.Label(main_frame, text="CSV一括インポート", font=("Arial", 14, "bold"))
        title_label.pack(pady=(0, 10))
        
        # ファイル選択フレーム
        file_frame = ttk.Frame(main_frame)
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Button(file_frame, text="CSVファイルを選択", command=self.load_csv).pack(side=tk.LEFT, padx=5)
        self.file_label = ttk.Label(file_frame, text="ファイルが選択されていません", foreground="gray")
        self.file_label.pack(side=tk.LEFT, padx=5)
        
        # 検索フレーム
        search_frame = ttk.Frame(main_frame)
        search_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(search_frame, text="検索:", font=("Arial", 9)).pack(side=tk.LEFT, padx=5)
        self.csv_search_entry = ttk.Entry(search_frame, font=("Arial", 9))
        self.csv_search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
        self.csv_search_entry.bind('<KeyRelease>', self.filter_csv_data)
        
        # キャンバスとスクロールバー（スクロール可能なリスト）
        canvas_frame = ttk.Frame(main_frame)
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        # ウィンドウリサイズ時の挙動設定
        window.columnconfigure(0, weight=1)
        window.rowconfigure(0, weight=1)
        
        self.canvas = tk.Canvas(canvas_frame, bg="white")
        scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=scrollbar.set)
        
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # ボタンフレーム
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(pady=(10, 0))
        
        ttk.Button(button_frame, text="すべて選択", command=self.select_all, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="すべて解除", command=self.deselect_all, width=15).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="選択した人物を追加", command=self.add_selected, width=20).pack(side=tk.LEFT, padx=5)
    
    def load_csv(self):
        """CSVファイルを読み込む"""
        file_path = filedialog.askopenfilename(
            title="CSVファイルを選択",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
        )
        
        if not file_path:
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                self.csv_data = []
                
                for row in reader:
                    if 'display_name' in row and 'handle' in row:
                        # ハンドルから@を除去し、アンダーバーをハイフンに変換
                        handle = row['handle'].replace('@', '').replace('_', '-')
                        # 特殊文字を除去（英数字とハイフンのみ）
                        handle = re.sub(r'[^a-zA-Z0-9-]', '', handle).lower()
                        
                        self.csv_data.append({
                            'name': row['display_name'],
                            'id': handle,
                            'tags': 'ヒカマー',
                            'description': 'ヒカマー'
                        })
            
            if self.csv_data:
                self.file_label.config(text=f"{len(self.csv_data)}件のデータを読み込みました", foreground="green")
                self.displayed_csv_data = self.csv_data.copy()
                self.display_data()
            else:
                messagebox.showwarning("警告", "有効なデータが見つかりませんでした")
                
        except Exception as e:
            messagebox.showerror("エラー", f"CSVファイルの読み込みに失敗しました:\n{str(e)}")
    
    def display_data(self, data_to_display=None):
        """CSVデータを表示"""
        # 既存のウィジェットをクリア
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        
        self.checkboxes = []
        self.entries = {}
        
        if data_to_display is None:
            data_to_display = self.displayed_csv_data
        
        # ヘッダー
        header_frame = ttk.Frame(self.scrollable_frame)
        header_frame.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Label(header_frame, text="追加", width=5, font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text="名前", width=20, font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text="ID", width=20, font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text="タグ", width=15, font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        ttk.Label(header_frame, text="説明", width=15, font=("Arial", 9, "bold")).pack(side=tk.LEFT, padx=2)
        
        # データ行
        for i, person in enumerate(data_to_display):
            row_frame = ttk.Frame(self.scrollable_frame)
            row_frame.pack(fill=tk.X, padx=5, pady=2)
            
            # チェックボックス
            var = tk.BooleanVar(value=True)
            cb = ttk.Checkbutton(row_frame, variable=var, width=5)
            cb.pack(side=tk.LEFT, padx=2)
            self.checkboxes.append(var)
            
            # 名前
            name_entry = ttk.Entry(row_frame, width=20, font=("Arial", 9))
            name_entry.insert(0, person['name'])
            name_entry.pack(side=tk.LEFT, padx=2)
            
            # ID
            id_entry = ttk.Entry(row_frame, width=20, font=("Arial", 9))
            id_entry.insert(0, person['id'])
            id_entry.pack(side=tk.LEFT, padx=2)
            
            # タグ
            tags_entry = ttk.Entry(row_frame, width=15, font=("Arial", 9))
            tags_entry.insert(0, person['tags'])
            tags_entry.pack(side=tk.LEFT, padx=2)
            
            # 説明
            desc_entry = ttk.Entry(row_frame, width=15, font=("Arial", 9))
            desc_entry.insert(0, person['description'])
            desc_entry.pack(side=tk.LEFT, padx=2)
            
            self.entries[i] = {
                'name': name_entry,
                'id': id_entry,
                'tags': tags_entry,
                'description': desc_entry,
                'original_index': self.csv_data.index(person)  # 元のインデックスを保持
            }
    
    def filter_csv_data(self, event=None):
        """検索テキストに基づいてCSVデータをフィルタリング"""
        search_text = self.csv_search_entry.get().lower()
        
        if not search_text:
            # 検索テキストが空の場合は全員表示
            self.displayed_csv_data = self.csv_data.copy()
            self.display_data()
            self.file_label.config(text=f"{len(self.csv_data)}件のデータを読み込みました", foreground="green")
            return
        
        # あいまい検索
        filtered = []
        for person in self.csv_data:
            name_match = search_text in person['name'].lower()
            id_match = search_text in person['id'].lower()
            tags_match = search_text in person['tags'].lower()
            desc_match = search_text in person['description'].lower()
            
            if name_match or id_match or tags_match or desc_match:
                filtered.append(person)
        
        self.displayed_csv_data = filtered
        self.display_data(filtered)
        self.file_label.config(text=f"検索結果: {len(filtered)}件 / 全{len(self.csv_data)}件", foreground="blue")
    
    def select_all(self):
        """すべて選択"""
        for var in self.checkboxes:
            var.set(True)
    
    def deselect_all(self):
        """すべて解除"""
        for var in self.checkboxes:
            var.set(False)
    
    def add_selected(self):
        """選択した人物を追加"""
        try:
            # 既存データを読み込み
            people = []
            if os.path.exists(self.parent_app.json_path):
                with open(self.parent_app.json_path, 'r', encoding='utf-8') as f:
                    people = json.load(f)
            
            added_count = 0
            skipped_count = 0
            errors = []
            
            for i, var in enumerate(self.checkboxes):
                if var.get():  # チェックされている場合
                    name = self.entries[i]['name'].get().strip()
                    person_id = self.entries[i]['id'].get().strip()
                    tags_str = self.entries[i]['tags'].get().strip()
                    description = self.entries[i]['description'].get().strip()
                    
                    # バリデーション
                    if not name or not person_id:
                        errors.append(f"行{i+1}: 名前またはIDが空です")
                        continue
                    
                    # IDの重複チェック
                    if any(p['id'] == person_id for p in people):
                        skipped_count += 1
                        continue
                    
                    # タグを配列に変換
                    tags = [tag.strip() for tag in tags_str.split(',') if tag.strip()]
                    
                    # 新しい人物を追加
                    new_person = {
                        "id": person_id,
                        "name": name,
                        "tags": tags,
                        "relatedPeople": [],
                        "description": description
                    }
                    people.append(new_person)
                    added_count += 1
            
            # ファイルに保存
            if added_count > 0:
                with open(self.parent_app.json_path, 'w', encoding='utf-8') as f:
                    json.dump(people, f, ensure_ascii=False, indent=2)
            
            # 結果メッセージ
            message = f"追加: {added_count}件"
            if skipped_count > 0:
                message += f"\nスキップ（重複）: {skipped_count}件"
            if errors:
                message += f"\nエラー: {len(errors)}件\n" + "\n".join(errors[:5])
            
            messagebox.showinfo("完了", message)
            
            # 親ウィンドウのリストを更新
            self.parent_app.load_existing_people()
            
            # ウィンドウを閉じる
            self.window.destroy()
            
        except Exception as e:
            messagebox.showerror("エラー", f"追加に失敗しました:\n{str(e)}")

def main():
    root = tk.Tk()
    app = PersonAdderApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
