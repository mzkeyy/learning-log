#!/usr/bin/env python3
"""ビルド結果(web/out)の内部リンクがすべて実在するファイルを指しているか調べる。

ページ内の href / src のうちサイト内(/learning-log/…)を指すものを集め、
out/ の中に対応するファイルがあるかを見る。1つでも切れていればエラーで止まる(CI で公開前に実行)。

使い方: python3 scripts/check_links.py [out ディレクトリ]
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO = Path(__file__).resolve().parent.parent
BASE_PATH = "/learning-log"


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if value and name in ("href", "src"):
                self.links.append(value)
            if value and name == "id":
                self.ids.add(value)


def target_file(out: Path, path: str) -> Path | None:
    """URL のパス → out/ の中のファイル。サイト外なら None"""
    if path != BASE_PATH and not path.startswith(BASE_PATH + "/"):
        return None
    rel = unquote(path[len(BASE_PATH):]).lstrip("/")
    file = out / rel
    # 「/Next.js/Next.js」のように最後が拡張子っぽいと Next.js は末尾の / を付けない。
    # GitHub Pages は同名のフォルダがあれば「…/」へリダイレクトするので、そのフォルダの index.html を見る
    if rel == "" or path.endswith("/") or file.is_dir():
        return file / "index.html"
    return file


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "web/out"
    pages = {p: LinkParser() for p in out.rglob("*.html")}
    if not pages:
        print(f"{out} に HTML がありません。先に npm run build を実行してください", file=sys.stderr)
        return 1
    for page, parser in pages.items():
        parser.feed(page.read_text(encoding="utf-8"))

    broken, checked = [], 0
    for page, parser in pages.items():
        for link in parser.links:
            url = urlsplit(link)
            if url.scheme or url.netloc or not url.path.startswith("/"):
                continue  # 外部リンク、ページ内リンク(#…)、data: など
            file = target_file(out, url.path)
            if file is None:
                broken.append((page, link, "サイトの外(/learning-log/ 以外)を指している"))
                continue
            checked += 1
            if not file.is_file():
                broken.append((page, link, "ページ・ファイルが無い"))
            elif url.fragment and file.suffix == ".html":
                # 見出しへのリンク(#…)は、リンク先に同じ id があるか
                ids = pages[file].ids if file in pages else set()
                if unquote(url.fragment) not in ids:
                    broken.append((page, link, "見出しが無い"))

    print(f"{len(pages)} ページの内部リンク {checked} 件を調べました")
    if broken:
        print(f"\n切れているリンクが {len(broken)} 件あります:", file=sys.stderr)
        for page, link, why in broken[:50]:
            print(f"  {page.relative_to(out)}: {unquote(link)} ({why})", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
