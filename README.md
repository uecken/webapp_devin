# マルチリムモンスター (Multi-Limb Monster)

WebRTCを使用して複数のプレイヤーが一つのキャラクターの異なる肢体を操作する協力型ゲーム。

## 概要

「マルチリムモンスター」は、複数のプレイヤーが一体のキャラクターの異なる肢体（腕、脚など）を操作して協力するWebゲームです。QWOPのような意図的に難しい操作性で、障害物コースを乗り越えるステージクリア型のゲームプレイを提供します。

### 特徴

- 各プレイヤーが1つの肢体（左腕、右腕、左脚、右脚）を操作
- WebRTCを使用したリアルタイム通信で肢体の位置を同期
- 物理ベースの動きと衝突検出
- 複数のステージと障害物
- 協力して障害物を乗り越え、ゴールを目指すゲームプレイ

## 技術スタック

### バックエンド
- [FastAPI](https://fastapi.tiangolo.com/) - 高性能なPythonウェブフレームワーク
- [WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) - リアルタイム通信
- [Poetry](https://python-poetry.org/) - Pythonパッケージ管理

### フロントエンド
- [React](https://reactjs.org/) - UIライブラリ
- [TypeScript](https://www.typescriptlang.org/) - 型安全なJavaScript
- [Vite](https://vitejs.dev/) - 高速な開発環境
- [Simple-Peer](https://github.com/feross/simple-peer) - WebRTC実装
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSSフレームワーク

## セットアップ方法

### 前提条件
- Node.js (v18以上)
- Python (v3.10以上)
- Poetry

### バックエンドのセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/uecken/webapp_devin.git
cd webapp_devin

# バックエンドの依存関係をインストール
cd backend
poetry install

# バックエンドサーバーを起動
poetry run uvicorn app.main:app --reload
```

バックエンドサーバーは http://localhost:8000 で実行されます。

### フロントエンドのセットアップ

```bash
# 別のターミナルで
cd webapp_devin/frontend

# フロントエンドの依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

フロントエンドは http://localhost:5173 で実行されます。

## 使い方

1. ブラウザで http://localhost:5173 にアクセス
2. プレイヤー名を入力し、操作したい肢体（左腕、右腕、左脚、右脚）を選択
3. 新しいルームを作成するか、既存のルームに参加
4. マウスを使用して肢体を動かし、他のプレイヤーと協力してキャラクターを操作
5. 障害物を避けながらゴールを目指す

## デプロイ

### バックエンドのデプロイ

```bash
cd backend
# Fly.ioを使用したデプロイ例
fly launch
fly deploy
```

### フロントエンドのデプロイ

```bash
cd frontend
npm run build
# 生成されたdistフォルダをお好みのホスティングサービスにデプロイ
```

## ライセンス

MIT

## 作者

uecken
