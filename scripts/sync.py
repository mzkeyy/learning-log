#!/usr/bin/env python3
"""Obsidian の「学習」フォルダから公開用ノートを content/ にコピーする。

- EXCLUDE に挙げたノートはコピーしない
- 除外ノートへのリンク・言及、claude.ai の Artifact リンク行は取り除く
- 先頭の `# 見出し` はフロントマターの title に移す(サイトがタイトルを二重に表示しないように)
- 取り除き漏れや個人情報らしい文字列があればエラーで止まる(scripts/check.py)
- 前回から追加・変更・削除されたノートを一覧で出す(公開前に目で確認する用)

使い方: python3 scripts/sync.py
"""

import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

import check

SOURCE = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/ログ/学習"
REPO = Path(__file__).resolve().parent.parent
CONTENT = REPO / "content"
INDEX = REPO / "pages/index.md"

# 公開しないノートや語句は private/publish-rules.json に書く(git に入れない)
RULES = check.load_rules()
FORBIDDEN = check.forbidden_patterns()

# 公開しないフォルダ・ファイル(SOURCE からの相対パス)
EXCLUDE = RULES["exclude"]

# 除外ノートへの wikilink(エイリアス付き [[名前|表示]] も含む)
EX = r"\[\[(?:" + "|".join(map(re.escape, RULES["excluded_links"])) + r")[^\]]*\]\]"
EX_LINK = re.compile(EX)
# 「/ [[除外]](補足)」「[[除外]](補足) / 」のように他のリンクと並んでいる部分
EX_AFTER_SLASH = re.compile(r"\s*/\s*" + EX + r"(?:\([^)]*\))?")
EX_BEFORE_SLASH = re.compile(EX + r"(?:\([^)]*\))?\s*/\s*")
# 「([[除外|お金の事故]])」のような括弧書き
EX_PAREN = re.compile(r"\(" + EX + r"\)")
# 「[図解を開く: …](artifact)」の行と、callout 内の「> [構成図](artifact) ― 説明」の行
ARTIFACT = r"https://claude\.ai/artifact/"
ARTIFACT_LINE = re.compile(r"^(?:>\s*)?\[[^\]]*\]\(" + ARTIFACT + r"[^)]*\).*$")
CALLOUT_HEADER = re.compile(r"^>\s*\[![^\]]+\]")
# 除外ノートの元資料(出典 URL など)を指す行
DROP_LINE = re.compile("|".join(RULES["drop_lines"]) or r"(?!)")

# 公開しない個別の記述(元の文字列 -> 置き換え後)
REPLACEMENTS = RULES["replacements"]

# 表の中では [[名前\|表示]] と | をエスケープするので、| の前の \ はリンク先に含めない
WIKILINK = re.compile(r"\[\[([^\]|#\\]+)(#[^\]|\\]*)?\\?(?:\|([^\]]*))?\]\]")
# フェンスコードブロックとインラインコード(この中の [[...]] はリンクではない)
CODE = re.compile(r"^```.*?^```|`[^`\n]*`", re.S | re.M)


def is_excluded(rel: Path) -> bool:
    return any(rel == Path(e) or Path(e) in rel.parents for e in EXCLUDE)


def strip_line(line: str) -> str | None:
    """除外ノートへの参照を取り除いた行を返す。行ごと消す場合は None。"""
    if not EX_LINK.search(line):
        return line
    line = EX_PAREN.sub("", line)
    line = EX_AFTER_SLASH.sub("", line)
    line = EX_BEFORE_SLASH.sub("", line)
    if EX_LINK.search(line):
        return None
    return line


def unlink_missing(text: str, notes: set[str]) -> str:
    """存在しないノートへの wikilink を、表示テキストだけ残して外す(コード内は触らない)。"""

    def repl(m: re.Match) -> str:
        target = m.group(1).strip().split("/")[-1].removesuffix(".md")
        if target in notes:
            return m.group(0)
        return m.group(3) or m.group(1)

    out, pos = [], 0
    for c in CODE.finditer(text):
        out.append(WIKILINK.sub(repl, text[pos : c.start()]))
        out.append(c.group(0))
        pos = c.end()
    out.append(WIKILINK.sub(repl, text[pos:]))
    return "".join(out)


def transform(text: str, modified: str) -> tuple[str, list[str]]:
    removed = []
    for old, new in REPLACEMENTS:
        if old in text:
            text = text.replace(old, new)
            removed.append(f"{old} -> {new!r}")
    out = []
    lines = text.split("\n")
    skip_blank = False
    for line in lines:
        if skip_blank and line.strip() == "":
            skip_blank = False
            continue
        skip_blank = False
        if ARTIFACT_LINE.match(line):
            removed.append(line)
            # 構成図リンクしか入っていない callout は見出しごと消す
            if line.startswith(">") and out and CALLOUT_HEADER.match(out[-1]):
                out.pop()
            skip_blank = True
            continue
        if DROP_LINE.search(line):
            removed.append(line)
            continue
        new = strip_line(line)
        if new is None:
            removed.append(line)
            skip_blank = out and out[-1].strip() == ""
            continue
        if new != line:
            removed.append(f"{line}\n      -> {new}")
        out.append(new)

    # 先頭の H1 をフロントマターの title に移し、元ファイルの更新日を modified に入れる
    # (CI ではファイルの日付がビルド時刻になるため)
    if not (out and out[0].strip() == "---"):
        meta = [f"modified: {modified}"]
        first = next((i for i, l in enumerate(out) if l.strip()), None)
        if first is not None and out[first].startswith("# "):
            title = out[first][2:].strip().replace('"', '\\"')
            meta.insert(0, f'title: "{title}"')
            out = out[first + 1 :]
            while out and not out[0].strip():
                out.pop(0)
        out = ["---", *meta, "---", ""] + out
    return "\n".join(out), removed


def count_notes(topic: str) -> int | None:
    """トピックのノート数。フォルダならその中の .md の数、単独ノートなら 1。"""
    if (CONTENT / topic).is_dir():
        return sum(1 for _ in (CONTENT / topic).rglob("*.md"))
    if (CONTENT / f"{topic}.md").is_file():
        return 1
    return None


def render_index(text: str, total: int) -> tuple[str, list[str]]:
    """トップページの {{total}} と {{n:トピック,…}} をノート数に置き換える。"""
    missing = []

    def repl(m: re.Match) -> str:
        n = 0
        for topic in m.group(1).split(","):
            c = count_notes(topic.strip())
            if c is None:
                missing.append(topic.strip())
            n += c or 0
        return str(n)

    text = re.sub(r"\{\{n:([^}]+)\}\}", repl, text.replace("{{total}}", str(total)))
    return text, missing


def print_changes() -> None:
    """前回のコミットから変わったノート。push する前にここに出たものを確認する"""
    status = subprocess.run(
        ["git", "status", "--porcelain", "-uall", "-z", "content/"],
        cwd=REPO, check=True, capture_output=True, text=True, encoding="utf-8",
    ).stdout
    labels = {"??": "追加", "M": "変更", "D": "削除"}
    changes = [(labels.get(e[:2].strip(), e[:2].strip()), e[3:]) for e in status.split("\0") if e]
    if not changes:
        print("前回から変わったノートはありません")
        return
    print("前回から変わったノート(公開して大丈夫か確認してください):")
    for label, path in changes:
        print(f"  {label}: {path}")


def main() -> int:
    if not SOURCE.is_dir():
        print(f"元フォルダが見つかりません: {SOURCE}", file=sys.stderr)
        return 1

    if CONTENT.exists():
        shutil.rmtree(CONTENT)
    CONTENT.mkdir()

    files = [
        src
        for src in sorted(SOURCE.rglob("*"))
        if src.is_file()
        and not any(p.startswith(".") for p in src.relative_to(SOURCE).parts)
        and not is_excluded(src.relative_to(SOURCE))
    ]
    notes = {src.stem for src in files if src.suffix == ".md"}

    count = 0
    problems = []
    for src in files:
        rel = src.relative_to(SOURCE)
        dest = CONTENT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix != ".md":
            shutil.copy2(src, dest)
            continue
        modified = date.fromtimestamp(src.stat().st_mtime).isoformat()
        text, removed = transform(src.read_text(encoding="utf-8"), modified)
        text = unlink_missing(text, notes)
        dest.write_text(text, encoding="utf-8")
        count += 1
        for r in removed:
            if not re.search(ARTIFACT, r):
                print(f"[{rel}] 削除: {r}")
        problems += [f"{rel}:{n}: [{kind}] {s}" for n, kind, s in check.scan(text, FORBIDDEN)]

    index, missing = render_index(INDEX.read_text(encoding="utf-8"), count)
    (CONTENT / "index.md").write_text(index, encoding="utf-8")
    problems += [f"pages/index.md: 見つからないトピック {name}" for name in missing]

    print(f"\n{count} ノートを content/ にコピーしました")
    print_changes()
    if problems:
        print("\n公開してはいけない文字列が残っています:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
