#!/usr/bin/env python3
"""公開してはいけない文字列が含まれていないか調べる。

調べるもの:
- private/publish-rules.json の forbidden(社名・アプリ名・本名など。この一覧自体は公開しない)
- 個人情報や秘密情報によくある形(メールアドレス、電話番号、郵便番号、ホームフォルダのパス、API キー)

使い方:
  python3 scripts/check.py              追跡中の全ファイルを調べる
  python3 scripts/check.py A..B         A から B までのコミットで追加された行を調べる(pre-push フックが使う)
  python3 scripts/check.py --pre-push   git の pre-push フックとして動く(push されるコミットを調べる)
"""

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RULES = REPO / "private/publish-rules.json"

# 例として書いてよいメールアドレスのドメイン
SAFE_EMAIL = re.compile(
    r"@(?:example\.(?:com|org|net|jp)|(?:users\.)?noreply\.github\.com|github\.com)$"
)
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# 例として書いてよいホームフォルダ名
SAFE_HOME = {"you", "user", "username", "name", "me", "xxx", "runner", "Shared", "forge"}
HOME = re.compile(r"/(?:Users|home)/([\w.-]+)")

PATTERNS = [
    ("電話番号", re.compile(r"(?<![\w.-])(?:\+81-?|0)\d{1,4}-\d{1,4}-\d{4}(?![\w-])")),
    ("郵便番号", re.compile(r"〒\s?\d{3}-?\d{4}")),
    ("claude.ai の Artifact リンク", re.compile(r"claude\.ai/artifact")),
    ("秘密鍵", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("API キー", re.compile(r"\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}|\bsk-ant-[\w-]{20,}|\bAKIA[0-9A-Z]{16}\b")),
]


def load_rules() -> dict:
    if not RULES.is_file():
        sys.exit(
            f"{RULES.relative_to(REPO)} がありません。"
            "scripts/publish-rules.example.json を参考に作ってください(このファイルは git に入りません)"
        )
    return json.loads(RULES.read_text(encoding="utf-8"))


def scan(text: str, forbidden: list[re.Pattern]) -> list[tuple[int, str, str]]:
    """(行番号, 種類, 見つかった文字列) の一覧"""
    hits = []
    for lineno, line in enumerate(text.split("\n"), 1):
        for pat in forbidden:
            for m in pat.finditer(line):
                hits.append((lineno, "非公開の語句", m.group(0)))
        for kind, pat in PATTERNS:
            for m in pat.finditer(line):
                hits.append((lineno, kind, m.group(0)))
        for m in EMAIL.finditer(line):
            if not SAFE_EMAIL.search(m.group(0)):
                hits.append((lineno, "メールアドレス", m.group(0)))
        for m in HOME.finditer(line):
            if m.group(1) not in SAFE_HOME:
                hits.append((lineno, "ホームフォルダのパス", m.group(0)))
    return hits


def forbidden_patterns() -> list[re.Pattern]:
    return [re.compile(p) for p in load_rules()["forbidden"]]


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=REPO, check=True, capture_output=True, text=True, encoding="utf-8"
    ).stdout


def check_files(forbidden: list[re.Pattern]) -> list[str]:
    problems = []
    for rel in git("ls-files", "-z").split("\0"):
        path = REPO / rel
        if not rel or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue  # 画像などのバイナリ
        problems += [f"{rel}:{n}: [{kind}] {s}" for n, kind, s in scan(text, forbidden)]
        problems += [f"{rel}: [{kind}] ファイル名に {s}" for n, kind, s in scan(rel, forbidden)]
    return problems


def check_range(spec: list[str], forbidden: list[re.Pattern]) -> list[str]:
    """コミットで追加された行・ファイル名と、コミットの作者・メッセージを調べる"""
    problems = []
    for sha in git("rev-list", *spec).split():
        info = git("show", "-s", "--format=%an <%ae>%n%cn <%ce>%n%B", sha)
        problems += [f"{sha[:7]} (作者・メッセージ): [{k}] {s}" for _, k, s in scan(info, forbidden)]
        current = "?"
        for line in git("show", "--format=", "--no-color", "-U0", sha).split("\n"):
            if line.startswith("+++ "):
                current = line[6:] if line.startswith("+++ b/") else line[4:]
                text = current
            elif line.startswith("+"):
                text = line[1:]
            else:
                continue
            problems += [f"{sha[:7]} {current}: [{k}] {s}" for _, k, s in scan(text, forbidden)]
    return problems


def pre_push(forbidden: list[re.Pattern]) -> list[str]:
    """git が標準入力に「ローカルref ローカルsha リモートref リモートsha」を1行ずつ渡してくる"""
    problems = []
    for line in sys.stdin:
        _, local_sha, _, remote_sha = line.split()
        if set(local_sha) == {"0"}:
            continue  # ブランチの削除
        if set(remote_sha) == {"0"}:
            spec = [local_sha, "--not", "--remotes"]  # 新しいブランチ: まだどこにも push していないコミット
        else:
            spec = [f"{remote_sha}..{local_sha}"]
        problems += check_range(spec, forbidden)
    return problems


def main() -> int:
    forbidden = forbidden_patterns()
    args = sys.argv[1:]
    if args == ["--pre-push"]:
        problems = pre_push(forbidden)
    elif args:
        problems = check_range(args, forbidden)
    else:
        problems = check_files(forbidden)

    if problems:
        print("公開してはいけないかもしれない文字列が見つかりました:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        print(
            "\n内容を直してからやり直してください。"
            "誤検出で、どうしても push したいときは git push --no-verify",
            file=sys.stderr,
        )
        return 1
    print("公開前チェック: 問題なし")
    return 0


if __name__ == "__main__":
    sys.exit(main())
