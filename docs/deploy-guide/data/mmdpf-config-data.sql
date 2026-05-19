--
-- PostgreSQL database dump
--

\restrict dEHRl6ya6jCWjamD2qNUZP7viitZOa4njKYD2SMaeJi6wOQA8WXs8EHRhH1Iul1

-- Dumped from database version 18.2 (Debian 18.2-1.pgdg13+1)
-- Dumped by pg_dump version 18.2 (Debian 18.2-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: code_master; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.code_master DISABLE TRIGGER ALL;

COPY public.code_master (organization_id, code_division, code_value, code_description, code_name, code_remark, create_user_id, update_user_id, create_at, update_at) FROM stdin;
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	checkout_status	0	プロジェクトのチェックアウト状態	チェックイン中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	checkout_status	1	プロジェクトのチェックアウト状態	チェックアウト済	\N		system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	experiment_condition	0	繰り返し実験時の条件指定	全て同一条件で実行	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	experiment_condition	1	繰り返し実験時の条件指定	実験ごとに条件を変更	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_priority	0	実験指示の優先度	低	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_priority	1	実験指示の優先度	通常	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_priority	2	実験指示の優先度	中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_priority	3	実験指示の優先度	高	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_status	0	指示送信ステータス	未送信	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_status	1	指示送信ステータス	送信済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_target	0	指示送信時の指示範囲	ファイル全体	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_target	1	指示送信時の指示範囲	特定タスク	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_target	2	指示送信時の指示範囲	特定トランジション	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_type	0	実験指示のタイプ	一般	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_type	1	実験指示のタイプ	セットアップ	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_type	2	実験指示のタイプ	測定	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_type	3	実験指示のタイプ	安全	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	instruction_type	4	実験指示のタイプ	清掃	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	0	問題のタイプ	材料不足2	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	1	問題のタイプ	機器故障	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	2	問題のタイプ	手順不明確	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	3	問題のタイプ	安全性の懸念	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	4	問題のタイプ	品質問題	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	5	問題のタイプ	時間制約	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	issue_type	6	問題のタイプ	その他	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	0	プロジェクトの進捗ステータス	プロジェクト計画中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	1	プロジェクトの進捗ステータス	タスク実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	2	プロジェクトの進捗ステータス	タスク実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	3	プロジェクトの進捗ステータス	タスク結果レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	4	プロジェクトの進捗ステータス	プロジェクト完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	project_status	5	プロジェクトの進捗ステータス	タスク異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	task_status	0	タスクの進捗ステータス	実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	task_status	1	タスクの進捗ステータス	実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	task_status	2	タスクの進捗ステータス	レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	task_status	3	タスクの進捗ステータス	完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	task_status	4	タスクの進捗ステータス	異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493N
21fe198b-2ccf-490c-88b4-a4b37dc29de1	checkout_status	0	プロジェクトのチェックアウト状態	チェックイン中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	checkout_status	1	プロジェクトのチェックアウト状態	チェックアウト済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	experiment_condition	0	繰り返し実験時の条件指定	全て同一条件で実行	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	experiment_condition	1	繰り返し実験時の条件指定	実験ごとに条件を変更	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_priority	0	実験指示の優先度	低	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_priority	1	実験指示の優先度	通常	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_priority	2	実験指示の優先度	中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_priority	3	実験指示の優先度	高	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_status	0	指示送信ステータス	未送信	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_status	1	指示送信ステータス	送信済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_target	0	指示送信時の指示範囲	ファイル全体	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_target	1	指示送信時の指示範囲	特定タスク	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_target	2	指示送信時の指示範囲	特定トランジション	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_type	0	実験指示のタイプ	一般	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_type	1	実験指示のタイプ	セットアップ	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_type	2	実験指示のタイプ	測定	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_type	3	実験指示のタイプ	安全	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	instruction_type	4	実験指示のタイプ	清掃	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	0	問題のタイプ	材料不足2	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	1	問題のタイプ	機器故障	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	2	問題のタイプ	手順不明確	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	3	問題のタイプ	安全性の懸念	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	4	問題のタイプ	品質問題	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	5	問題のタイプ	時間制約	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	issue_type	6	問題のタイプ	その他	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	0	プロジェクトの進捗ステータス	プロジェクト計画中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	1	プロジェクトの進捗ステータス	タスク実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	2	プロジェクトの進捗ステータス	タスク実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	3	プロジェクトの進捗ステータス	タスク結果レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	4	プロジェクトの進捗ステータス	プロジェクト完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	project_status	5	プロジェクトの進捗ステータス	タスク異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	task_status	0	タスクの進捗ステータス	実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	task_status	1	タスクの進捗ステータス	実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	task_status	2	タスクの進捗ステータス	レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	task_status	3	タスクの進捗ステータス	完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
21fe198b-2ccf-490c-88b4-a4b37dc29de1	task_status	4	タスクの進捗ステータス	異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	checkout_status	0	プロジェクトのチェックアウト状態	チェックイン中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	checkout_status	1	プロジェクトのチェックアウト状態	チェックアウト済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	experiment_condition	0	繰り返し実験時の条件指定	全て同一条件で実行	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	experiment_condition	1	繰り返し実験時の条件指定	実験ごとに条件を変更	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_priority	0	実験指示の優先度	低	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_priority	1	実験指示の優先度	通常	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_priority	2	実験指示の優先度	中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_priority	3	実験指示の優先度	高	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_status	0	指示送信ステータス	未送信	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_status	1	指示送信ステータス	送信済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_target	0	指示送信時の指示範囲	ファイル全体	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_target	1	指示送信時の指示範囲	特定タスク	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_target	2	指示送信時の指示範囲	特定トランジション	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_type	0	実験指示のタイプ	一般	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_type	1	実験指示のタイプ	セットアップ	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_type	2	実験指示のタイプ	測定	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_type	3	実験指示のタイプ	安全	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	instruction_type	4	実験指示のタイプ	清掃	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	0	問題のタイプ	材料不足2	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	1	問題のタイプ	機器故障	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	2	問題のタイプ	手順不明確	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	3	問題のタイプ	安全性の懸念	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	4	問題のタイプ	品質問題	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	5	問題のタイプ	時間制約	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	issue_type	6	問題のタイプ	その他	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	0	プロジェクトの進捗ステータス	プロジェクト計画中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	1	プロジェクトの進捗ステータス	タスク実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	2	プロジェクトの進捗ステータス	タスク実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	3	プロジェクトの進捗ステータス	タスク結果レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	4	プロジェクトの進捗ステータス	プロジェクト完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	project_status	5	プロジェクトの進捗ステータス	タスク異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	task_status	0	タスクの進捗ステータス	実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	task_status	1	タスクの進捗ステータス	実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	task_status	2	タスクの進捗ステータス	レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	task_status	3	タスクの進捗ステータス	完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
31f28d33-f8f8-41d9-b3fa-a896e3be6860	task_status	4	タスクの進捗ステータス	異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	checkout_status	0	プロジェクトのチェックアウト状態	チェックイン中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	checkout_status	1	プロジェクトのチェックアウト状態	チェックアウト済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	experiment_condition	0	繰り返し実験時の条件指定	全て同一条件で実行	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	experiment_condition	1	繰り返し実験時の条件指定	実験ごとに条件を変更	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_priority	0	実験指示の優先度	低	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_priority	1	実験指示の優先度	通常	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_priority	2	実験指示の優先度	中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_priority	3	実験指示の優先度	高	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_status	0	指示送信ステータス	未送信	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_status	1	指示送信ステータス	送信済	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_target	0	指示送信時の指示範囲	ファイル全体	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_target	1	指示送信時の指示範囲	特定タスク	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_target	2	指示送信時の指示範囲	特定トランジション	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_type	0	実験指示のタイプ	一般	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_type	1	実験指示のタイプ	セットアップ	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_type	2	実験指示のタイプ	測定	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_type	3	実験指示のタイプ	安全	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	instruction_type	4	実験指示のタイプ	清掃	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	0	問題のタイプ	材料不足2	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	1	問題のタイプ	機器故障	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	2	問題のタイプ	手順不明確	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	3	問題のタイプ	安全性の懸念	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	4	問題のタイプ	品質問題	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	5	問題のタイプ	時間制約	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	issue_type	6	問題のタイプ	その他	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	0	プロジェクトの進捗ステータス	プロジェクト計画中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	1	プロジェクトの進捗ステータス	タスク実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	2	プロジェクトの進捗ステータス	タスク実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	3	プロジェクトの進捗ステータス	タスク結果レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	4	プロジェクトの進捗ステータス	プロジェクト完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	project_status	5	プロジェクトの進捗ステータス	タスク異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	task_status	0	タスクの進捗ステータス	実行待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	task_status	1	タスクの進捗ステータス	実行中	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	task_status	2	タスクの進捗ステータス	レビュー待ち	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	task_status	3	タスクの進捗ステータス	完了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
370e959e-19fd-40a1-9584-6f45ea138d93	task_status	4	タスクの進捗ステータス	異常終了	\N	system.test@example.com	system.test@example.com	2026-02-27 11:43:27.493	2026-02-27 11:43:27.493
\.


ALTER TABLE public.code_master ENABLE TRIGGER ALL;

--
-- Data for Name: corporation; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.corporation DISABLE TRIGGER ALL;

COPY public.corporation (corporation_id, corporation_name, is_active, create_user_id, update_user_id, create_at, update_at) FROM stdin;
0ae8bbc6-af07-41d2-ba1a-135b1ec7eedf	アルファテクノロジーズ株式会社	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-01-21 11:22:11.278
299f2930-fd70-4b53-acea-5e790671114d	ゼータラボラトリーズ株式会社	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-02-19 13:22:51.236
341d061e-78fe-4b32-9f80-eaf910433491	イータファーマ株式会社	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-02-27 08:39:58.474
\.


ALTER TABLE public.corporation ENABLE TRIGGER ALL;

--
-- Data for Name: department; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.department DISABLE TRIGGER ALL;

COPY public.department (organization_id, department_cd, department_name, is_active, create_user_id, update_user_id, create_at, update_at) FROM stdin;
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	DEP001	材料合成部	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-01-21 11:22:11.278
21fe198b-2ccf-490c-88b4-a4b37dc29de1	DEP002	分析評価部	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-02-19 13:22:51.236
31f28d33-f8f8-41d9-b3fa-a896e3be6860	DEP003	ナノ材料研究部	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-02-27 08:39:58.474
370e959e-19fd-40a1-9584-6f45ea138d93	DEP004	システム管理部	t	system.admin@example.com	system.admin@example.com	2026-01-21 11:22:11.278	2026-02-26 19:04:05.529
\.


ALTER TABLE public.department ENABLE TRIGGER ALL;

--
-- Data for Name: organization; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.organization DISABLE TRIGGER ALL;

COPY public.organization (organization_id, organization_cd, organization_display_name, organization_email, chief_user_id, corporation_id, is_entry, use_deemed_progress, contract_capacity, contract_users, contract_projects, is_active, create_user_id, create_at, update_user_id, update_at, default_retention_days) FROM stdin;
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ORG001-AIML	AIML研究所	lab001@example.com	system.admin@example.com	299f2930-fd70-4b53-acea-5e790671114d	0	t	999.000	999	999	t	system.admin@example.com	2026-01-07 10:59:39.396	system.admin@example.com	2026-03-18 07:31:06.672575	30
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ORG003-AIST	AIST研究所	success@success.co.jp	success@hachiro.co.jp	299f2930-fd70-4b53-acea-5e790671114d	0	f	999.000	999	999	t	system.admin@example.com	2026-02-19 08:31:28.343	system.admin@example.com	2026-02-19 09:02:35.453	30
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ORG005-SSV	SSV研究所	test3@test3.co.jp	ca-test3@saburo.co.jp	341d061e-78fe-4b32-9f80-eaf910433491	0	t	999.000	999	999	t	system.admin@example.com	2026-02-19 17:16:16.53	system.admin@example.com	2026-02-19 17:16:16.53	30
370e959e-19fd-40a1-9584-6f45ea138d93	ORG011-SYSTEM-MNG	システム管理組織	check-test2@test2.co.jp	check-test2@jiro.co.jp	0ae8bbc6-af07-41d2-ba1a-135b1ec7eedf	0	f	999.000	999	999	t	system.admin@example.com	2026-02-26 18:05:52.211	system.admin@example.com	2026-02-26 18:59:53.123	30
\.


ALTER TABLE public.organization ENABLE TRIGGER ALL;

--
-- Data for Name: organization_user; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.organization_user DISABLE TRIGGER ALL;

COPY public.organization_user (user_id, organization_id, user_name, role_cd, mail_address, department_cd, is_active, create_user_id, update_user_id, create_at, update_at) FROM stdin;
provider@example.com	370e959e-19fd-40a1-9584-6f45ea138d93	プロバイダ　四郎	ROLE001	provider@example.com		t	system.admin@example.com	system.admin@example.com	2026-01-07 11:17:08	2026-01-07 11:17:08
system.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	システム管理　太郎	ROLE002	system.admin@aiml.com	DEP003	t	system.admin@example.com	system.admin@example.com	2026-02-25 09:21:44.865	2026-02-25 09:21:44.865
data.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	データ管理　太郎	ROLE003	data.admin@aiml.com	DEP001	t	system.admin@example.com	system.admin@example.com	2026-01-07 11:17:08	2026-03-11 02:27:24.747723
exp.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	実験管理　太郎	ROLE004	exp.admin@aiml.com	DEP003	t	system.admin@example.com	system.admin@example.com	2026-02-25 16:04:56.154	2026-02-25 16:04:56.154
worker@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	実験作業　太郎	ROLE005	worker@aiml.com	DEP003	t	system.admin@example.com	system.admin@example.com	2026-02-20 15:46:53.657	2026-02-20 15:57:20.778
system.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	システム管理　次郎	ROLE002	system.admin@aist.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 08:31:28.343	2026-02-19 08:31:28.343
data.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	データ管理　次郎	ROLE003	data.admin@aist.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 08:31:28.343	2026-02-19 08:31:28.343
exp.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	実験管理　次郎	ROLE004	exp.admin@aist.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 08:31:28.343	2026-02-19 08:31:28.343
worker@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	実験作業　次郎	ROLE005	worker@aist.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 08:31:28.343	2026-02-19 08:31:28.343
system.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	システム管理　花子	ROLE002	system.admin@ssv.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 17:16:16.53	2026-02-19 17:16:16.53
data.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	データ管理　花子	ROLE003	data.admin@ssv.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 17:16:16.53	2026-02-19 17:16:16.53
exp.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	実験管理　花子	ROLE004	exp.admin@ssv.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 17:16:16.53	2026-02-19 17:16:16.53
worker@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	実験作業　花子	ROLE005	worker@ssv.com	\N	t	system.admin@example.com	system.admin@example.com	2026-02-19 17:16:16.53	2026-02-19 17:16:16.53
\.


ALTER TABLE public.organization_user ENABLE TRIGGER ALL;

--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.role DISABLE TRIGGER ALL;

COPY public.role (organization_id, role_cd, role_name, initial_screen_function_cd, is_active, create_user_id, update_user_id, create_at, update_at) FROM stdin;
370e959e-19fd-40a1-9584-6f45ea138d93	ROLE001	プロバイダー	010000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-02-12 09:34:19.892
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE002	システム管理者	020000	t	system.admin@example.com	system.admin@example.com	2026-02-27 08:45:01.145	2026-02-27 08:45:01.145
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE003	データ管理者	030000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE004	実験管理者	040000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE005	実験作業者	050000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE002	システム管理者	020000	t	system.admin@example.com	system.admin@example.com	2026-02-27 08:45:01.145	2026-02-27 08:45:01.145
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE003	データ管理者	030000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE004	実験管理者	040000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE005	実験作業者	050000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE002	システム管理者	020000	t	system.admin@example.com	system.admin@example.com	2026-02-27 08:45:01.145	2026-02-27 08:45:01.145
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE003	データ管理者	030000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE004	実験管理者	040000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE005	実験作業者	050000	t	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
\.


ALTER TABLE public.role ENABLE TRIGGER ALL;

--
-- Data for Name: role_permission; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.role_permission DISABLE TRIGGER ALL;

COPY public.role_permission (organization_id, role_cd, function_cd, permission, create_user_id, update_user_id, create_at, update_at) FROM stdin;
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE001	010000	1	system.admin@example.com	system.admin@example.com	2026-02-18 09:05:31.884	2026-02-18 09:05:31.884
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE002	020000	1	system.admin@example.com	system.admin@example.com	2026-03-09 05:46:14.766103	2026-03-09 05:46:14.766103
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE003	030000	1	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE003	040000	0	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE004	040000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
a0718dc5-21f3-44e6-87e9-cc2ae83f3385	ROLE005	050000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE001	010000	1	system.admin@example.com	system.admin@example.com	2026-02-18 09:05:31.884	2026-02-18 09:05:31.884
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE002	020000	1	system.admin@example.com	system.admin@example.com	2026-03-09 05:46:14.766103	2026-03-09 05:46:14.766103
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE003	030000	1	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE003	040000	0	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE004	040000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
21fe198b-2ccf-490c-88b4-a4b37dc29de1	ROLE005	050000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE001	010000	1	system.admin@example.com	system.admin@example.com	2026-02-18 09:05:31.884	2026-02-18 09:05:31.884
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE002	020000	1	system.admin@example.com	system.admin@example.com	2026-03-09 05:46:14.766103	2026-03-09 05:46:14.766103
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE003	030000	1	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE003	040000	0	system.admin@example.com	system.admin@example.com	2026-02-02 00:00:00	2026-02-02 00:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE004	040000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
31f28d33-f8f8-41d9-b3fa-a896e3be6860	ROLE005	050000	1	system.admin@example.com	system.admin@example.com	2026-01-30 10:00:00	2026-01-30 10:00:00
\.


ALTER TABLE public.role_permission ENABLE TRIGGER ALL;

--
-- Data for Name: user_authentication; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.user_authentication DISABLE TRIGGER ALL;

COPY public.user_authentication (user_id, organization_id, password, is_temporary_flg, password_expires_at, create_user_id, update_user_id, create_at, update_at) FROM stdin;
provider@example.com	370e959e-19fd-40a1-9584-6f45ea138d93	$2b$12$6tRfE85Sd6db4G4gNa5Gyu94k8I1Lx38.K4/Q42SIao8.QGg0xi4e	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
system.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	$2b$12$es73DezKzUGLOjmcEnMMR.BHOr8OaAGwlXbxaXObznq8i4./QhBI6	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
data.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	$2b$12$vjsxb8r.do6CGZdAshU41OyjiiLZQfjOTZXCoHDeUK7.6cBz8Hv.q	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
exp.admin@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	$2b$12$wEd3r00O7fj0rJjCP5TptOEFaRdpJ/pU9DY7Qg010XwPvEwxWCIUy	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
worker@aiml.com	a0718dc5-21f3-44e6-87e9-cc2ae83f3385	$2b$12$DnL8R6fCYVX2..Ui3FZ9Mu5OdTbj4M388NjzXR6yeRqC72ZE/BOi.	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
system.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	$2b$12$es73DezKzUGLOjmcEnMMR.BHOr8OaAGwlXbxaXObznq8i4./QhBI6	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
data.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	$2b$12$vjsxb8r.do6CGZdAshU41OyjiiLZQfjOTZXCoHDeUK7.6cBz8Hv.q	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
exp.admin@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	$2b$12$wEd3r00O7fj0rJjCP5TptOEFaRdpJ/pU9DY7Qg010XwPvEwxWCIUy	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
worker@aist.com	21fe198b-2ccf-490c-88b4-a4b37dc29de1	$2b$12$DnL8R6fCYVX2..Ui3FZ9Mu5OdTbj4M388NjzXR6yeRqC72ZE/BOi.	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
system.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	$2b$12$es73DezKzUGLOjmcEnMMR.BHOr8OaAGwlXbxaXObznq8i4./QhBI6	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
data.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	$2b$12$vjsxb8r.do6CGZdAshU41OyjiiLZQfjOTZXCoHDeUK7.6cBz8Hv.q	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
exp.admin@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	$2b$12$wEd3r00O7fj0rJjCP5TptOEFaRdpJ/pU9DY7Qg010XwPvEwxWCIUy	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
worker@ssv.com	31f28d33-f8f8-41d9-b3fa-a896e3be6860	$2b$12$DnL8R6fCYVX2..Ui3FZ9Mu5OdTbj4M388NjzXR6yeRqC72ZE/BOi.	f	2026-04-25 15:01:06.51	system.admin@example.com	system.admin@example.com	2026-02-25 15:01:06.698	2026-02-25 15:01:06.698
\.


ALTER TABLE public.user_authentication ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict dEHRl6ya6jCWjamD2qNUZP7viitZOa4njKYD2SMaeJi6wOQA8WXs8EHRhH1Iul1

