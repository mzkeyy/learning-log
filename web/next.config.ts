import type { NextConfig } from "next";
import { BASE_PATH } from "./src/lib/config";

const nextConfig: NextConfig = {
  // GitHub Pages はサーバーを持たないので、ビルド時に全ページを HTML にして out/ へ書き出す
  output: "export",
  // サイトは https://mzkeyy.github.io/learning-log/ に置くので、すべての URL にこの接頭辞を付ける
  basePath: BASE_PATH,
  // /DNS ではなく /DNS/ で出力し、DNS/index.html として配置する
  trailingSlash: true,
  // 画像最適化はサーバー機能なので、静的出力では無効にする
  images: { unoptimized: true },
};

export default nextConfig;
