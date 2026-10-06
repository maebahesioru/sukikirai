"use client";
// Twemojiのimg絵文字はコピー時にテキストへ含まれないため、copy時にaltテキストへ置換して復元する
import { useEffect } from "react";

export default function EmojiCopyFix() {
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const frag = range.cloneContents();
      const imgs = frag.querySelectorAll("img.emoji");
      if (imgs.length === 0) return; // 絵文字なしはブラウザ標準のコピーに任せる
      imgs.forEach((img) => img.replaceWith(img.getAttribute("alt") || ""));
      // 実レイアウトで innerText を取りたいので一時的にDOMへ付ける（ブロック改行を保つ）
      const div = document.createElement("div");
      div.style.cssText = "position:fixed;left:-9999px;top:0;white-space:pre-wrap;";
      div.appendChild(frag);
      document.body.appendChild(div);
      const text = div.innerText;
      const html = div.innerHTML;
      document.body.removeChild(div);
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", text);
        e.clipboardData.setData("text/html", html);
        e.preventDefault();
      }
    };
    document.addEventListener("copy", onCopy);
    return () => document.removeEventListener("copy", onCopy);
  }, []);
  return null;
}
