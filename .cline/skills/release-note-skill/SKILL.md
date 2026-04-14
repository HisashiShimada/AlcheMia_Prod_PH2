---
name: release-note-skill
description: リリースノートの作成時に使用する
---

# release-note-skill

## Usage

- リリースノートを作成する際は `docs\release-note-guide.md`（このスキルディレクトリ内）を参照する
- リリースノートを更新・修正する際は `docs\release-note-guide.md`（このスキルディレクトリ内）を参照する

## Steps

1. ユーザーの指示に「前回リリースのコミットハッシュ」と「今回リリースのコミットハッシュ」が含まれているか確認する
   - **含まれていない場合**: `ask_followup_question` ツールを使って必ず以下の2点をユーザーに確認する
     - 前回リリースのコミットハッシュ（例: `693f490a...`）
     - 今回リリースのコミットハッシュ（例: `5b7c00dc...`）
   - **含まれている場合**: そのまま次のステップへ進む
2. `git log` でコミット一覧を取得し、各コミットの変更内容を調査する
3. タスク計画書（`docs/` 配下の PLAN.md 等）を参照して変更の詳細を把握する
4. `docs\release-note-guide.md` のテンプレートに従いリリースノートを作成する
5. `docs/deliverables/release_notes_YYYYMMDD.md` として保存する
6. リリースコミットにタグを付ける
   - `ask_followup_question` ツールを使って、バージョン番号（形式: `v00.00.00`）をユーザーに確認する
   - 以下の形式で注釈付きタグを作成する:
     - タグ名: `release-YYYYMMDD-<バージョン>` （例: `release-20260413-v01.00.00`）
     - コマンド: `git tag -a release-YYYYMMDD-<バージョン> <今回リリースのコミットハッシュ> -m "release-YYYYMMDD-<バージョン>"`
   - リモートへのプッシュは行わない（ユーザーから明示的に指示があった場合のみ実施）
