"""公開してはいけないものが漏れないことのテスト(sync.py の変換と check.py の検出)。

本物の非公開ルール(private/)は使わず、scripts/publish-rules.example.json で動かすので CI でも走る。

実行: python3 -m unittest discover -s scripts/tests -v
"""

import os
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent
os.environ["PUBLISH_RULES"] = str(SCRIPTS / "publish-rules.example.json")
sys.path.insert(0, str(SCRIPTS))

import check  # noqa: E402
import sync  # noqa: E402

FORBIDDEN = check.forbidden_patterns()

# 検出されるはずの文字列。このファイル自体が push 前チェックに引っかからないよう、分けて書いて実行時につなぐ
ARTIFACT = "https://claude.ai/" + "artifact/abc"
EMAIL = "taro.yamada" + "@gmail.com"
PHONE = "090-1234-" + "5678"
POSTAL = "〒150-" + "0001"
HOME = "/Users/" + "taro/Projects"
PRIVATE_KEY = "-----BEGIN OPENSSH " + "PRIVATE KEY-----"


def body(text: str) -> str:
    """transform の結果からフロントマターを除いた本文"""
    out, _ = sync.transform(text, "2026-01-01")
    return out.split("---\n", 2)[2].strip("\n")


def kinds(text: str) -> list[str]:
    return [kind for _, kind, _ in check.scan(text, FORBIDDEN)]


class TransformTest(unittest.TestCase):
    def test_除外ノートへのリンクだけの行は消える(self):
        self.assertEqual(body("前\n- [[公開しないノート]]\n後"), "前\n後")

    def test_エイリアス付きのリンクも消える(self):
        self.assertEqual(body("- [[公開しないフォルダ/手順|社内の手順]]\n残る"), "残る")

    def test_他のリンクと並んでいるときは除外分だけ消える(self):
        self.assertEqual(body("- [[A]] / [[公開しないノート]](補足)"), "- [[A]]")
        self.assertEqual(body("- [[公開しないノート]](補足) / [[A]]"), "- [[A]]")

    def test_括弧書きの言及は括弧ごと消える(self):
        self.assertEqual(body("お金の事故([[公開しないノート|事故例]])に注意"), "お金の事故に注意")

    def test_Artifactリンクの行は消える(self):
        self.assertEqual(body(f"[図解を開く: 図]({ARTIFACT})\n\n本文"), "本文")

    def test_Artifactリンクしかないcalloutは見出しごと消える(self):
        text = f"本文\n> [!tip] 図解\n> [構成図]({ARTIFACT}) ― 説明\n後"
        self.assertEqual(body(text), "本文\n後")

    def test_非公開の出典の行は消える(self):
        self.assertEqual(body("出典: https://社内サイト.example.com/doc\n残る"), "残る")

    def test_個別の置き換えが効く(self):
        self.assertEqual(body("アプリを作る(例: [[非公開アプリ]])。"), "アプリを作る。")

    def test_先頭のH1はタイトルになる(self):
        out, _ = sync.transform('# "認証" の基本\n\n本文', "2026-01-01")
        self.assertIn('title: "\\"認証\\" の基本"', out)
        self.assertIn("modified: 2026-01-01", out)
        self.assertNotIn("# ", out.split("---\n", 2)[2])

    def test_除外ノートの名前が残らない(self):
        text = "\n".join([
            "- [[公開しないノート]]",
            "- [[A]] / [[公開しないフォルダ/x]](補足)",
            "([[公開しないノート|別名]])",
        ])
        self.assertNotIn("公開しない", body(text))


class UnlinkMissingTest(unittest.TestCase):
    def test_存在しないノートへのリンクは文字だけ残す(self):
        self.assertEqual(sync.unlink_missing("[[無い|表示名]] と [[無い]]", set()), "表示名 と 無い")

    def test_存在するノートへのリンクは残す(self):
        self.assertEqual(sync.unlink_missing("[[認証#見出し]]", {"認証"}), "[[認証#見出し]]")

    def test_表の中のエスケープしたエイリアスも存在するノートとして扱う(self):
        text = "| [[認証\\|表示]] |"
        self.assertEqual(sync.unlink_missing(text, {"認証"}), text)

    def test_表の中の見出し付きリンクもエスケープを含めない(self):
        text = "| [[認証#見出し\\|表示]] |"
        self.assertEqual(sync.unlink_missing(text, {"認証"}), text)
        self.assertEqual(sync.WIKILINK.search(text).group(2), "#見出し")

    def test_表の中の存在しないノートは名前にエスケープを残さない(self):
        self.assertEqual(sync.unlink_missing("| [[無い\\|]] |", set()), "| 無い |")

    def test_コードの中は触らない(self):
        text = "`[[無い]]`\n```\n[[無い]]\n```"
        self.assertEqual(sync.unlink_missing(text, set()), text)


class ScanTest(unittest.TestCase):
    def test_非公開の語句(self):
        self.assertEqual(kinds("非公開アプリ名 の話"), ["非公開の語句"])

    def test_メールアドレス(self):
        self.assertEqual(kinds(f"連絡先 {EMAIL}"), ["メールアドレス"])

    def test_例として書くメールアドレスは許可(self):
        for ok in ["user@example.com", "git@github.com", "1+bot@users.noreply.github.com", "noreply@anthropic.com"]:
            self.assertEqual(kinds(ok), [], ok)

    def test_電話番号と郵便番号(self):
        self.assertEqual(kinds(PHONE), ["電話番号"])
        self.assertEqual(kinds(POSTAL), ["郵便番号"])

    def test_電話番号に似た数字は誤検出しない(self):
        for ok in ["2026-10-25", "v1.2-3456-7890", "192.168.0.1", "ISBN 978-4-1234-5678-9"]:
            self.assertEqual(kinds(ok), [], ok)

    def test_ホームフォルダのパス(self):
        self.assertEqual(kinds(HOME), ["ホームフォルダのパス"])
        self.assertEqual(kinds("/Users/you/Projects と /home/runner/work"), [])

    def test_秘密鍵とAPIキー(self):
        self.assertEqual(kinds(PRIVATE_KEY), ["秘密鍵"])
        self.assertEqual(kinds("ghp_" + "a" * 36), ["API キー"])
        self.assertEqual(kinds("AKIA" + "A" * 16), ["API キー"])

    def test_Artifactリンク(self):
        self.assertEqual(kinds(ARTIFACT), ["claude.ai の Artifact リンク"])

    def test_行番号(self):
        self.assertEqual(check.scan(f"a\nb\n{PHONE}", FORBIDDEN)[0][0], 3)


if __name__ == "__main__":
    unittest.main()
