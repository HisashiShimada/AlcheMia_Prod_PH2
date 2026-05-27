--
-- PostgreSQL database dump
--

\restrict G0C9lcUmbgl7QtryTge7ye2gevJRebhPqQNPnmTZubtfwdn6mQC53y1uxCo8ZKe

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
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attribute; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute (
    organization_id uuid NOT NULL,
    attribute_id character varying NOT NULL,
    attribute_name character varying NOT NULL,
    attribute_value character varying,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE attribute; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.attribute IS '属性';


--
-- Name: COLUMN attribute.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.organization_id IS '組織ID';


--
-- Name: COLUMN attribute.attribute_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.attribute_id IS '属性ID';


--
-- Name: COLUMN attribute.attribute_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.attribute_name IS '属性名';


--
-- Name: COLUMN attribute.attribute_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.attribute_value IS '属性値';


--
-- Name: COLUMN attribute.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN attribute.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN attribute.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.create_at IS '作成日時';


--
-- Name: COLUMN attribute.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.attribute.update_at IS '更新日時';


--
-- Name: code_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_master (
    organization_id uuid NOT NULL,
    code_division character varying(30) NOT NULL,
    code_value character varying(30) NOT NULL,
    code_description text,
    code_name character varying(30) NOT NULL,
    code_remark text,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE code_master; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.code_master IS 'コードマスタ';


--
-- Name: COLUMN code_master.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.organization_id IS '組織ID';


--
-- Name: COLUMN code_master.code_division; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.code_division IS 'コード区分';


--
-- Name: COLUMN code_master.code_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.code_value IS 'コード値';


--
-- Name: COLUMN code_master.code_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.code_description IS 'コード概要';


--
-- Name: COLUMN code_master.code_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.code_name IS 'コード名称';


--
-- Name: COLUMN code_master.code_remark; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.code_remark IS '備考';


--
-- Name: COLUMN code_master.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN code_master.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN code_master.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.create_at IS '作成日時';


--
-- Name: COLUMN code_master.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.code_master.update_at IS '更新日時';


--
-- Name: corporation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporation (
    corporation_id uuid NOT NULL,
    corporation_name character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE corporation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.corporation IS '会社';


--
-- Name: COLUMN corporation.corporation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.corporation_id IS '会社ID';


--
-- Name: COLUMN corporation.corporation_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.corporation_name IS '会社名';


--
-- Name: COLUMN corporation.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.is_active IS 'アクティブ判定';


--
-- Name: COLUMN corporation.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN corporation.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN corporation.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.create_at IS '作成日時';


--
-- Name: COLUMN corporation.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.corporation.update_at IS '更新日時';


--
-- Name: creator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.creator (
    organization_id uuid NOT NULL,
    creator_uuid uuid NOT NULL,
    vendor_uuid uuid,
    instrument_uuid uuid,
    corporation_id uuid,
    creator_id character varying NOT NULL,
    creator_name character varying NOT NULL,
    creator_description character varying,
    creator_annotation character varying,
    is_active boolean,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE creator; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.creator IS 'creator';


--
-- Name: COLUMN creator.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.organization_id IS '組織ID';


--
-- Name: COLUMN creator.creator_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.creator_uuid IS 'creator_uuid';


--
-- Name: COLUMN creator.vendor_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.vendor_uuid IS 'vendor_uuid';


--
-- Name: COLUMN creator.instrument_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.instrument_uuid IS 'instrument_uuid';


--
-- Name: COLUMN creator.corporation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.corporation_id IS '会社ID';


--
-- Name: COLUMN creator.creator_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.creator_id IS 'ID';


--
-- Name: COLUMN creator.creator_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.creator_name IS '名称';


--
-- Name: COLUMN creator.creator_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.creator_description IS '説明';


--
-- Name: COLUMN creator.creator_annotation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.creator_annotation IS '注釈';


--
-- Name: COLUMN creator.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.is_active IS 'アクティブ判定';


--
-- Name: COLUMN creator.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN creator.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN creator.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.create_at IS '作成日時';


--
-- Name: COLUMN creator.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.creator.update_at IS '更新日時';


--
-- Name: department; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department (
    organization_id uuid NOT NULL,
    department_cd character varying(50) NOT NULL,
    department_name character varying(50) NOT NULL,
    is_active boolean NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE department; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.department IS '部署';


--
-- Name: COLUMN department.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.organization_id IS '組織ID';


--
-- Name: COLUMN department.department_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.department_cd IS '部署CD';


--
-- Name: COLUMN department.department_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.department_name IS '部署名';


--
-- Name: COLUMN department.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.is_active IS 'アクティブ判定';


--
-- Name: COLUMN department.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN department.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN department.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.create_at IS '作成日時';


--
-- Name: COLUMN department.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.department.update_at IS '更新日時';


--
-- Name: file_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_metadata (
    file_key character varying(500) NOT NULL,
    s3_bucket character varying(100) NOT NULL,
    organization_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_size bigint NOT NULL,
    file_type character varying(100),
    file_extension character varying(10),
    is_maiml_file boolean DEFAULT false,
    maiml_analysis_status character varying(20) DEFAULT 'not_analyzed'::character varying,
    maiml_error_count integer DEFAULT 0,
    maiml_warning_count integer DEFAULT 0,
    maiml_version character varying(20),
    maiml_transitions_count integer,
    maiml_places_count integer,
    maiml_validation_result jsonb DEFAULT '{}'::jsonb,
    maiml_last_analyzed timestamp with time zone,
    last_edit_timestamp timestamp with time zone,
    uploaded_by character varying(100) NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    custom_metadata jsonb DEFAULT '{}'::jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    search_keywords text[],
    description text,
    file_hash character varying(64),
    parent_folder_path character varying(500),
    upload_batch_id character varying(255),
    upload_source character varying(50) DEFAULT 'web_upload'::character varying,
    upload_method character varying(50) DEFAULT 'single'::character varying,
    s3_storage_class character varying(50) DEFAULT 'STANDARD'::character varying,
    s3_etag character varying(100),
    CONSTRAINT file_metadata_upload_method_check CHECK (((upload_method)::text = ANY ((ARRAY['single'::character varying, 'multipart'::character varying, 'resumable'::character varying])::text[])))
);


--
-- Name: TABLE file_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.file_metadata IS 'S3/Swiftファイルのメタデータ管理テーブル';


--
-- Name: COLUMN file_metadata.file_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.file_key IS 'S3キー（主キー）';


--
-- Name: COLUMN file_metadata.s3_bucket; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.s3_bucket IS 'S3バケット名またはSwiftコンテナ名';


--
-- Name: COLUMN file_metadata.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.organization_id IS '組織ID（マルチテナント分離用）';


--
-- Name: COLUMN file_metadata.original_filename; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.original_filename IS '元のファイル名';


--
-- Name: COLUMN file_metadata.file_size; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.file_size IS 'ファイルサイズ（バイト）';


--
-- Name: COLUMN file_metadata.file_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.file_type IS 'MIMEタイプ';


--
-- Name: COLUMN file_metadata.uploaded_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.uploaded_by IS 'アップロードユーザーID';


--
-- Name: COLUMN file_metadata.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.created_at IS '作成日時';


--
-- Name: COLUMN file_metadata.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.updated_at IS '更新日時';


--
-- Name: COLUMN file_metadata.upload_batch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.file_metadata.upload_batch_id IS '一括アップロード時のバッチID';


--
-- Name: instruction_acknowledged_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instruction_acknowledged_history (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    experiment_instruction_id character varying CONSTRAINT instruction_acknowledged_his_experiment_instruction_id_not_null NOT NULL,
    experiment_user_id character varying(50) NOT NULL,
    acknowledged_at timestamp without time zone,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE instruction_acknowledged_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.instruction_acknowledged_history IS '指示確認履歴テーブル';


--
-- Name: COLUMN instruction_acknowledged_history.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.organization_id IS '組織ID';


--
-- Name: COLUMN instruction_acknowledged_history.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.project_id IS 'プロジェクトID';


--
-- Name: COLUMN instruction_acknowledged_history.experiment_instruction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.experiment_instruction_id IS '実験指示ID';


--
-- Name: COLUMN instruction_acknowledged_history.experiment_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.experiment_user_id IS '実験作業者ID';


--
-- Name: COLUMN instruction_acknowledged_history.acknowledged_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.acknowledged_at IS '確認日時';


--
-- Name: COLUMN instruction_acknowledged_history.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN instruction_acknowledged_history.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN instruction_acknowledged_history.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.create_at IS '作成日時';


--
-- Name: COLUMN instruction_acknowledged_history.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instruction_acknowledged_history.update_at IS '更新日時';


--
-- Name: instrument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instrument (
    organization_id uuid NOT NULL,
    instrument_uuid uuid NOT NULL,
    corporation_id uuid,
    instrument_id character varying NOT NULL,
    instrument_name character varying NOT NULL,
    instrument_description character varying,
    instrument_annotation character varying,
    is_active boolean,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE instrument; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.instrument IS 'instrument';


--
-- Name: COLUMN instrument.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.organization_id IS '組織ID';


--
-- Name: COLUMN instrument.instrument_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.instrument_uuid IS 'uuid';


--
-- Name: COLUMN instrument.corporation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.corporation_id IS '会社ID';


--
-- Name: COLUMN instrument.instrument_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.instrument_id IS 'ID';


--
-- Name: COLUMN instrument.instrument_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.instrument_name IS '名称';


--
-- Name: COLUMN instrument.instrument_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.instrument_description IS '説明';


--
-- Name: COLUMN instrument.instrument_annotation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.instrument_annotation IS '注釈';


--
-- Name: COLUMN instrument.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.is_active IS 'アクティブ判定';


--
-- Name: COLUMN instrument.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN instrument.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN instrument.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.create_at IS '作成日時';


--
-- Name: COLUMN instrument.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.instrument.update_at IS '更新日時';


--
-- Name: issue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    issue_id character varying NOT NULL,
    method_id character varying,
    issue_target numeric(2,0),
    task_no numeric(3,0),
    transition_id character varying,
    issue_title character varying,
    issue_type numeric(2,0),
    issue_contents text,
    status numeric(2,0),
    issue_reporter_id character varying(50),
    issue_report_at timestamp without time zone,
    issue_completer_id character varying(50),
    issue_complate_at timestamp without time zone,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE issue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue IS '問題';


--
-- Name: COLUMN issue.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.organization_id IS '組織ID';


--
-- Name: COLUMN issue.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.project_id IS 'プロジェクトID';


--
-- Name: COLUMN issue.issue_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_id IS '問題ID';


--
-- Name: COLUMN issue.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.method_id IS 'メソッドID';


--
-- Name: COLUMN issue.issue_target; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_target IS '問題対象';


--
-- Name: COLUMN issue.task_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.task_no IS 'タスク連番';


--
-- Name: COLUMN issue.transition_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.transition_id IS 'トランジションID';


--
-- Name: COLUMN issue.issue_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_title IS '問題タイトル';


--
-- Name: COLUMN issue.issue_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_type IS '問題タイプ';


--
-- Name: COLUMN issue.issue_contents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_contents IS '問題内容';


--
-- Name: COLUMN issue.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.status IS 'ステータス';


--
-- Name: COLUMN issue.issue_reporter_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_reporter_id IS '問題報告者ID';


--
-- Name: COLUMN issue.issue_report_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_report_at IS '問題報告日時';


--
-- Name: COLUMN issue.issue_completer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_completer_id IS '問題完了者ID';


--
-- Name: COLUMN issue.issue_complate_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.issue_complate_at IS '問題完了日時';


--
-- Name: COLUMN issue.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN issue.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN issue.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.create_at IS '作成日時';


--
-- Name: COLUMN issue.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue.update_at IS '更新日時';


--
-- Name: issue_comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_comment (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    issue_id character varying NOT NULL,
    sequence_no numeric(3,0) NOT NULL,
    comment character varying,
    author_id character varying(50),
    commented_at timestamp without time zone,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE issue_comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_comment IS '問題コメント';


--
-- Name: COLUMN issue_comment.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.organization_id IS '組織ID';


--
-- Name: COLUMN issue_comment.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.project_id IS 'プロジェクトID';


--
-- Name: COLUMN issue_comment.issue_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.issue_id IS '問題ID';


--
-- Name: COLUMN issue_comment.sequence_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.sequence_no IS 'シーケンス番号';


--
-- Name: COLUMN issue_comment.comment; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.comment IS 'コメント';


--
-- Name: COLUMN issue_comment.author_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.author_id IS '記入者ID';


--
-- Name: COLUMN issue_comment.commented_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.commented_at IS '記入日時';


--
-- Name: COLUMN issue_comment.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN issue_comment.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN issue_comment.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.create_at IS '作成日時';


--
-- Name: COLUMN issue_comment.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.issue_comment.update_at IS '更新日時';


--
-- Name: login_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_history (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    organization_id uuid NOT NULL,
    login_at timestamp without time zone,
    login_sf boolean,
    failure_reason character varying(100),
    entry_execute_flg boolean,
    ip_address character varying(45),
    user_agent text,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE login_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.login_history IS 'ログイン履歴';


--
-- Name: COLUMN login_history.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.id IS 'ID';


--
-- Name: COLUMN login_history.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.user_id IS 'ユーザID';


--
-- Name: COLUMN login_history.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.organization_id IS '組織ID';


--
-- Name: COLUMN login_history.login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.login_at IS 'ログイン日時';


--
-- Name: COLUMN login_history.login_sf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.login_sf IS 'ログイン成否';


--
-- Name: COLUMN login_history.failure_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.failure_reason IS '失敗原因';


--
-- Name: COLUMN login_history.entry_execute_flg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.entry_execute_flg IS '二段階認証実行フラグ';


--
-- Name: COLUMN login_history.ip_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.ip_address IS 'IPアドレス';


--
-- Name: COLUMN login_history.user_agent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.user_agent IS 'User-Agent';


--
-- Name: COLUMN login_history.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN login_history.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN login_history.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.create_at IS '作成日時';


--
-- Name: COLUMN login_history.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.login_history.update_at IS '更新日時';


--
-- Name: login_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.login_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: login_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.login_history_id_seq OWNED BY public.login_history.id;


--
-- Name: maiml_analysis_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_analysis_results (
    id integer NOT NULL,
    file_key character varying(500) NOT NULL,
    is_valid boolean DEFAULT false,
    version character varying(20),
    namespace character varying(255),
    errors jsonb DEFAULT '[]'::jsonb,
    warnings jsonb DEFAULT '[]'::jsonb,
    suggestions jsonb DEFAULT '[]'::jsonb,
    statistics jsonb DEFAULT '{}'::jsonb,
    processing_time integer,
    analysis_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE maiml_analysis_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_analysis_results IS 'MaiML分析結果テーブル';


--
-- Name: COLUMN maiml_analysis_results.file_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_analysis_results.file_key IS 'ファイルキー（S3キー）';


--
-- Name: COLUMN maiml_analysis_results.is_valid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_analysis_results.is_valid IS 'バリデーション結果';


--
-- Name: maiml_analysis_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maiml_analysis_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maiml_analysis_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maiml_analysis_results_id_seq OWNED BY public.maiml_analysis_results.id;


--
-- Name: maiml_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_drafts (
    id integer NOT NULL,
    draft_key character varying(255) NOT NULL,
    user_id character varying(100) DEFAULT 'default-user'::character varying NOT NULL,
    draft_name character varying(255) NOT NULL,
    original_file_key character varying(500),
    nodes jsonb DEFAULT '[]'::jsonb NOT NULL,
    arcs jsonb DEFAULT '[]'::jsonb NOT NULL,
    templates jsonb DEFAULT '{"resultTemplates": {}, "materialTemplates": {}, "conditionTemplates": {}}'::jsonb NOT NULL,
    document_data jsonb DEFAULT '{"id": "documentID", "date": "", "name": "document", "uuid": ""}'::jsonb NOT NULL,
    node_count integer DEFAULT 0,
    arc_count integer DEFAULT 0,
    template_count integer DEFAULT 0,
    auto_save_enabled boolean DEFAULT true,
    auto_save_interval integer DEFAULT 300,
    organization_id character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_saved_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_auto_saved_at timestamp with time zone,
    project_id character varying(255),
    CONSTRAINT maiml_drafts_draft_key_check CHECK (((draft_key)::text ~ '^draft_[a-zA-Z0-9_-]+$'::text)),
    CONSTRAINT maiml_drafts_draft_name_check CHECK (((char_length((draft_name)::text) >= 1) AND (char_length((draft_name)::text) <= 255)))
);


--
-- Name: TABLE maiml_drafts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_drafts IS 'MaiMLドラフトテーブル';


--
-- Name: COLUMN maiml_drafts.draft_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_drafts.draft_key IS 'ドラフトキー（一意）';


--
-- Name: COLUMN maiml_drafts.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_drafts.user_id IS 'ユーザID';


--
-- Name: COLUMN maiml_drafts.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_drafts.organization_id IS '組織ID';


--
-- Name: COLUMN maiml_drafts.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_drafts.project_id IS 'プロジェクトID（プロジェクト管理画面からのDraft特定用）';


--
-- Name: maiml_drafts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maiml_drafts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maiml_drafts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maiml_drafts_id_seq OWNED BY public.maiml_drafts.id;


--
-- Name: maiml_event_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_event_log (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    sequence_no numeric(5,0) NOT NULL,
    log jsonb,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE maiml_event_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_event_log IS 'MaiMLイベントログ';


--
-- Name: COLUMN maiml_event_log.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.organization_id IS '組織ID';


--
-- Name: COLUMN maiml_event_log.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.project_id IS 'プロジェクトID';


--
-- Name: COLUMN maiml_event_log.sequence_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.sequence_no IS 'シーケンス番号';


--
-- Name: COLUMN maiml_event_log.log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.log IS 'ログ';


--
-- Name: COLUMN maiml_event_log.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN maiml_event_log.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN maiml_event_log.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.create_at IS '作成日時';


--
-- Name: COLUMN maiml_event_log.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_event_log.update_at IS '更新日時';


--
-- Name: maiml_publish_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_publish_job (
    job_id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type text NOT NULL,
    organization_id text NOT NULL,
    project_name text NOT NULL,
    asset_id bigint,
    status text DEFAULT 'pending'::text NOT NULL,
    triggered_by text,
    trigger_type text DEFAULT 'manual'::text NOT NULL,
    error_message text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT maiml_publish_job_job_type_check CHECK ((job_type = ANY (ARRAY['publish'::text, 'unpublish'::text]))),
    CONSTRAINT maiml_publish_job_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'error'::text]))),
    CONSTRAINT maiml_publish_job_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['manual'::text, 'schedule'::text])))
);


--
-- Name: TABLE maiml_publish_job; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_publish_job IS 'bullmq 非同期処理のジョブ進捗管理テーブル。公開・非公開ジョブの状態をポーリング確認するために使用する。';


--
-- Name: COLUMN maiml_publish_job.job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.job_id IS 'ジョブ一意識別子（UUID）';


--
-- Name: COLUMN maiml_publish_job.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.job_type IS '処理種別: publish（公開）/ unpublish（非公開）';


--
-- Name: COLUMN maiml_publish_job.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.organization_id IS '対象組織 ID';


--
-- Name: COLUMN maiml_publish_job.project_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.project_name IS '対象プロジェクト名';


--
-- Name: COLUMN maiml_publish_job.asset_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.asset_id IS '対象 maiml_asset.asset_id（FK なし: 組織スキーマのため）。公開完了後に更新。非公開ジョブは登録時に設定';


--
-- Name: COLUMN maiml_publish_job.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.status IS 'ジョブステータス: pending / running / done / error';


--
-- Name: COLUMN maiml_publish_job.triggered_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.triggered_by IS 'ジョブをトリガーしたユーザー ID（スケジュール実行時は NULL）';


--
-- Name: COLUMN maiml_publish_job.trigger_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.trigger_type IS 'トリガー種別: manual（手動）/ schedule（スケジュール）';


--
-- Name: COLUMN maiml_publish_job.error_message; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.error_message IS 'エラー時のメッセージ（status=error の場合に記録）';


--
-- Name: COLUMN maiml_publish_job.started_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.started_at IS 'Worker が処理を開始した日時';


--
-- Name: COLUMN maiml_publish_job.finished_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.finished_at IS 'Worker が処理を完了（または失敗）した日時';


--
-- Name: COLUMN maiml_publish_job.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_publish_job.created_at IS 'ジョブ登録日時';


--
-- Name: maiml_schema_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_schema_definitions (
    schema_version character varying(20) NOT NULL,
    schema_content text NOT NULL,
    schema_parsed_metadata jsonb,
    element_definitions jsonb,
    attribute_definitions jsonb,
    datatype_definitions jsonb,
    namespace_definitions jsonb,
    hierarchy_rules jsonb,
    validation_rules jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE maiml_schema_definitions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_schema_definitions IS 'MAIMLスキーマ定義テーブル';


--
-- Name: COLUMN maiml_schema_definitions.schema_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_schema_definitions.schema_version IS 'スキーマバージョン（主キー）';


--
-- Name: COLUMN maiml_schema_definitions.schema_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_schema_definitions.schema_content IS 'XSDスキーマの全文';


--
-- Name: COLUMN maiml_schema_definitions.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_schema_definitions.is_active IS 'アクティブフラグ';


--
-- Name: COLUMN maiml_schema_definitions.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_schema_definitions.created_at IS '作成日時';


--
-- Name: COLUMN maiml_schema_definitions.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_schema_definitions.updated_at IS '最終更新日時';


--
-- Name: maiml_validation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maiml_validation_history (
    validation_id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_id character varying(20),
    file_key character varying(500),
    user_id uuid NOT NULL,
    validation_mode character varying(20) NOT NULL,
    is_valid boolean NOT NULL,
    total_errors integer DEFAULT 0 NOT NULL,
    total_warnings integer DEFAULT 0 NOT NULL,
    error_details jsonb,
    warning_details jsonb,
    validation_duration_ms integer,
    elements_validated integer,
    attributes_validated integer,
    nodes_validated integer,
    arcs_validated integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: TABLE maiml_validation_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.maiml_validation_history IS 'MAIMLバリデーション履歴テーブル';


--
-- Name: COLUMN maiml_validation_history.validation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.validation_id IS 'バリデーションID（UUID、主キー）';


--
-- Name: COLUMN maiml_validation_history.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.organization_id IS '組織ID（マルチテナント分離用）';


--
-- Name: COLUMN maiml_validation_history.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.project_id IS 'プロジェクトID（任意）';


--
-- Name: COLUMN maiml_validation_history.file_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.file_key IS 'S3/Swiftファイルキー（任意）';


--
-- Name: COLUMN maiml_validation_history.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.user_id IS 'バリデーション実行ユーザーID';


--
-- Name: COLUMN maiml_validation_history.validation_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.validation_mode IS 'バリデーションモード（basic/full）';


--
-- Name: COLUMN maiml_validation_history.is_valid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.is_valid IS 'バリデーション結果';


--
-- Name: COLUMN maiml_validation_history.total_errors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.total_errors IS 'エラー総数';


--
-- Name: COLUMN maiml_validation_history.total_warnings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.total_warnings IS '警告総数';


--
-- Name: COLUMN maiml_validation_history.error_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.error_details IS 'エラー詳細（JSONB配列）';


--
-- Name: COLUMN maiml_validation_history.warning_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.warning_details IS '警告詳細（JSONB配列）';


--
-- Name: COLUMN maiml_validation_history.validation_duration_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.validation_duration_ms IS 'バリデーション処理時間（ミリ秒）';


--
-- Name: COLUMN maiml_validation_history.elements_validated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.elements_validated IS '検証した要素数';


--
-- Name: COLUMN maiml_validation_history.attributes_validated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.attributes_validated IS '検証した属性数';


--
-- Name: COLUMN maiml_validation_history.nodes_validated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.nodes_validated IS '検証したPetri Netノード数';


--
-- Name: COLUMN maiml_validation_history.arcs_validated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.arcs_validated IS '検証したPetri Netアーク数';


--
-- Name: COLUMN maiml_validation_history.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.maiml_validation_history.created_at IS 'バリデーション実行日時';


--
-- Name: organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization (
    organization_id uuid NOT NULL,
    organization_cd character varying(50),
    organization_display_name character varying(50),
    organization_email character varying(50),
    chief_user_id character varying(50),
    corporation_id uuid,
    is_entry integer,
    use_deemed_progress boolean DEFAULT true NOT NULL,
    contract_capacity numeric(8,3),
    contract_users integer,
    contract_projects integer,
    is_active boolean,
    create_user_id character varying(50),
    create_at timestamp without time zone,
    update_user_id character varying(50),
    update_at timestamp without time zone,
    default_retention_days integer DEFAULT 30 NOT NULL
);


--
-- Name: TABLE organization; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.organization IS '組織';


--
-- Name: COLUMN organization.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.organization_id IS '組織ID:9eea5300-db8b-4b2d-8e9e-ec306c476b12';


--
-- Name: COLUMN organization.organization_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.organization_cd IS '組織CD';


--
-- Name: COLUMN organization.organization_display_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.organization_display_name IS '組織表示名';


--
-- Name: COLUMN organization.organization_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.organization_email IS '組織E-mail';


--
-- Name: COLUMN organization.chief_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.chief_user_id IS '代表者ユーザID';


--
-- Name: COLUMN organization.corporation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.corporation_id IS '会社ID';


--
-- Name: COLUMN organization.is_entry; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.is_entry IS '二段階認証判定:0:二段階認証なし1:二段階認証あり';


--
-- Name: COLUMN organization.use_deemed_progress; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.use_deemed_progress IS 'みなし進捗使用フラグ';


--
-- Name: COLUMN organization.contract_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.contract_capacity IS '契約容量';


--
-- Name: COLUMN organization.contract_users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.contract_users IS '契約ユーザー数';


--
-- Name: COLUMN organization.contract_projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.contract_projects IS '契約プロジェクト数';


--
-- Name: COLUMN organization.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.is_active IS 'アクティブ判定';


--
-- Name: COLUMN organization.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN organization.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.create_at IS '作成日時';


--
-- Name: COLUMN organization.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN organization.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.update_at IS '更新日時';


--
-- Name: COLUMN organization.default_retention_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization.default_retention_days IS 'MaiMLデータ公開時のデフォルト保持日数（日）。公開 Worker が retention_until 算出時に参照する。1以上の整数必須。';


--
-- Name: organization_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_user (
    user_id character varying(50) NOT NULL,
    organization_id uuid NOT NULL,
    user_name character varying(30) NOT NULL,
    role_cd character varying(30) NOT NULL,
    mail_address character varying(50) NOT NULL,
    department_cd character varying(50),
    is_active boolean,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE organization_user; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.organization_user IS '組織利用者';


--
-- Name: COLUMN organization_user.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.user_id IS 'ユーザID';


--
-- Name: COLUMN organization_user.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.organization_id IS '組織ID';


--
-- Name: COLUMN organization_user.user_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.user_name IS 'ユーザ名';


--
-- Name: COLUMN organization_user.role_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.role_cd IS 'ロールCD';


--
-- Name: COLUMN organization_user.mail_address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.mail_address IS 'メールアドレス';


--
-- Name: COLUMN organization_user.department_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.department_cd IS '所属部署CD';


--
-- Name: COLUMN organization_user.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.is_active IS 'アクティブ判定';


--
-- Name: COLUMN organization_user.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN organization_user.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN organization_user.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.create_at IS '作成日時';


--
-- Name: COLUMN organization_user.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organization_user.update_at IS '更新日時';


--
-- Name: pin_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pin_codes (
    organization_id uuid NOT NULL,
    user_id character varying(50) NOT NULL,
    pin_code character varying(6) NOT NULL,
    session_token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    attempts_count integer DEFAULT 0 NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE pin_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.pin_codes IS 'PINコード:メールPINコード二段階認証用の一時データ';


--
-- Name: COLUMN pin_codes.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.organization_id IS '組織ID';


--
-- Name: COLUMN pin_codes.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.user_id IS 'ユーザID';


--
-- Name: COLUMN pin_codes.pin_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.pin_code IS 'PINコード:6桁数字';


--
-- Name: COLUMN pin_codes.session_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.session_token IS 'セッショントークン';


--
-- Name: COLUMN pin_codes.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.expires_at IS '有効期限';


--
-- Name: COLUMN pin_codes.attempts_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.attempts_count IS '試行回数';


--
-- Name: COLUMN pin_codes.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN pin_codes.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN pin_codes.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.create_at IS '作成日時';


--
-- Name: COLUMN pin_codes.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pin_codes.update_at IS '更新日時';


--
-- Name: project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    project_name character varying,
    description text,
    department_cd character varying(50),
    owner_user_id character varying(50),
    project_status numeric(2,0),
    project_maiml_flg boolean,
    checkout_status numeric(2,0),
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE project; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project IS 'プロジェクト';


--
-- Name: COLUMN project.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.organization_id IS '組織ID';


--
-- Name: COLUMN project.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.project_id IS 'プロジェクトID';


--
-- Name: COLUMN project.project_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.project_name IS 'プロジェクト名';


--
-- Name: COLUMN project.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.description IS '概要';


--
-- Name: COLUMN project.department_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.department_cd IS '部署CD';


--
-- Name: COLUMN project.owner_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.owner_user_id IS '所有者ユーザID';


--
-- Name: COLUMN project.project_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.project_status IS 'プロジェクトステータス';


--
-- Name: COLUMN project.project_maiml_flg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.project_maiml_flg IS 'プロジェクトMaiml有無';


--
-- Name: COLUMN project.checkout_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.checkout_status IS 'チェックアウトステータス';


--
-- Name: COLUMN project.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN project.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN project.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.create_at IS '作成日時';


--
-- Name: COLUMN project.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project.update_at IS '更新日時';


--
-- Name: project_instruction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_instruction (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    experiment_instruction_id character varying NOT NULL,
    method_id character varying,
    instruction_target numeric(2,0),
    priority numeric(2,0),
    type numeric(2,0),
    task_no numeric(3,0),
    transition_id character varying,
    instruction_status numeric(2,0),
    instructions text,
    instruction_user_id character varying(50),
    instruction_date timestamp without time zone,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE project_instruction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_instruction IS 'プロジェクト指示';


--
-- Name: COLUMN project_instruction.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.organization_id IS '組織ID';


--
-- Name: COLUMN project_instruction.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.project_id IS 'プロジェクトID';


--
-- Name: COLUMN project_instruction.experiment_instruction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.experiment_instruction_id IS '実験指示ID';


--
-- Name: COLUMN project_instruction.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.method_id IS 'メソッドID';


--
-- Name: COLUMN project_instruction.instruction_target; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.instruction_target IS '指示対象:1:ファイル全体、2:タスク、3:トランジション';


--
-- Name: COLUMN project_instruction.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.priority IS '優先度';


--
-- Name: COLUMN project_instruction.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.type IS 'タイプ';


--
-- Name: COLUMN project_instruction.task_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.task_no IS 'タスク連番';


--
-- Name: COLUMN project_instruction.transition_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.transition_id IS 'トランジションID';


--
-- Name: COLUMN project_instruction.instruction_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.instruction_status IS '指示送信ステータス:0:未送信、1:送信済み';


--
-- Name: COLUMN project_instruction.instructions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.instructions IS '指示内容';


--
-- Name: COLUMN project_instruction.instruction_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.instruction_user_id IS '実験指示ユーザID';


--
-- Name: COLUMN project_instruction.instruction_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.instruction_date IS '指示送信日';


--
-- Name: COLUMN project_instruction.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN project_instruction.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN project_instruction.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.create_at IS '作成日時';


--
-- Name: COLUMN project_instruction.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_instruction.update_at IS '更新日時';


--
-- Name: project_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_task (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id character varying NOT NULL,
    experiment_order numeric(2,0) NOT NULL,
    experiment_condition numeric(2,0),
    attempts_count numeric(3,0),
    worker_linked_flg boolean,
    create_user_id character varying(50),
    create_at timestamp without time zone,
    update_user_id character varying(50),
    update_at timestamp without time zone
);


--
-- Name: TABLE project_task; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_task IS 'プロジェクトタスク';


--
-- Name: COLUMN project_task.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.organization_id IS '組織ID';


--
-- Name: COLUMN project_task.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.project_id IS 'プロジェクトID';


--
-- Name: COLUMN project_task.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.method_id IS 'メソッドID';


--
-- Name: COLUMN project_task.experiment_order; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.experiment_order IS '実験順序';


--
-- Name: COLUMN project_task.experiment_condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.experiment_condition IS '実験条件';


--
-- Name: COLUMN project_task.attempts_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.attempts_count IS '試行回数';


--
-- Name: COLUMN project_task.worker_linked_flg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.worker_linked_flg IS '作業者連携済フラグ';


--
-- Name: COLUMN project_task.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN project_task.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.create_at IS '作成日時';


--
-- Name: COLUMN project_task.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN project_task.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task.update_at IS '更新日時';


--
-- Name: project_task_detail; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_task_detail (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id character varying NOT NULL,
    task_no numeric(3,0) NOT NULL,
    task_status numeric(2,0),
    experiment_start_at timestamp without time zone,
    experiment_end_at timestamp without time zone,
    experiment_user_id character varying(50),
    reviewed_at timestamp without time zone,
    review_user_id character varying(50),
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE project_task_detail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.project_task_detail IS 'プロジェクトタスク_詳細';


--
-- Name: COLUMN project_task_detail.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.organization_id IS '組織ID';


--
-- Name: COLUMN project_task_detail.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.project_id IS 'プロジェクトID';


--
-- Name: COLUMN project_task_detail.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.method_id IS 'メソッドID';


--
-- Name: COLUMN project_task_detail.task_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.task_no IS 'タスク連番';


--
-- Name: COLUMN project_task_detail.task_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.task_status IS 'タスクステータス';


--
-- Name: COLUMN project_task_detail.experiment_start_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.experiment_start_at IS '実験開始日';


--
-- Name: COLUMN project_task_detail.experiment_end_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.experiment_end_at IS '実験終了日';


--
-- Name: COLUMN project_task_detail.experiment_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.experiment_user_id IS '実験作業者ID';


--
-- Name: COLUMN project_task_detail.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.reviewed_at IS 'レビュー完了日';


--
-- Name: COLUMN project_task_detail.review_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.review_user_id IS 'レビュアーID';


--
-- Name: COLUMN project_task_detail.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN project_task_detail.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN project_task_detail.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.create_at IS '作成日時';


--
-- Name: COLUMN project_task_detail.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.project_task_detail.update_at IS '更新日時';


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    organization_id uuid NOT NULL,
    role_cd character varying(30) NOT NULL,
    role_name character varying(50),
    initial_screen_function_cd character varying(30),
    is_active boolean NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role IS 'ロール';


--
-- Name: COLUMN role.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.organization_id IS '組織ID';


--
-- Name: COLUMN role.role_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.role_cd IS 'ロールCD';


--
-- Name: COLUMN role.role_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.role_name IS 'ロール名';


--
-- Name: COLUMN role.initial_screen_function_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.initial_screen_function_cd IS '初期画面機能CD';


--
-- Name: COLUMN role.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.is_active IS 'アクティブ判定';


--
-- Name: COLUMN role.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN role.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN role.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.create_at IS '作成日時';


--
-- Name: COLUMN role.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role.update_at IS '更新日時';


--
-- Name: role_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permission (
    organization_id uuid NOT NULL,
    role_cd character varying(30) NOT NULL,
    function_cd character varying(30) NOT NULL,
    permission integer NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE role_permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.role_permission IS 'ロール権限';


--
-- Name: COLUMN role_permission.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.organization_id IS '組織ID';


--
-- Name: COLUMN role_permission.role_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.role_cd IS 'ロールCD';


--
-- Name: COLUMN role_permission.function_cd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.function_cd IS '機能CD';


--
-- Name: COLUMN role_permission.permission; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.permission IS '権限:0:書込可 1:読取専用';


--
-- Name: COLUMN role_permission.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN role_permission.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN role_permission.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.create_at IS '作成日時';


--
-- Name: COLUMN role_permission.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.role_permission.update_at IS '更新日時';


--
-- Name: template_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_data (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id character varying NOT NULL,
    task_no numeric(3,0) NOT NULL,
    place_id character varying NOT NULL,
    property_set jsonb,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE template_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.template_data IS 'テンプレート実績';


--
-- Name: COLUMN template_data.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.organization_id IS '組織ID';


--
-- Name: COLUMN template_data.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.project_id IS 'プロジェクトID';


--
-- Name: COLUMN template_data.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.method_id IS 'メソッドID';


--
-- Name: COLUMN template_data.task_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.task_no IS 'タスク連番';


--
-- Name: COLUMN template_data.place_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.place_id IS 'プレースID';


--
-- Name: COLUMN template_data.property_set; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.property_set IS 'プロパティセット';


--
-- Name: COLUMN template_data.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN template_data.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN template_data.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.create_at IS '作成日時';


--
-- Name: COLUMN template_data.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.template_data.update_at IS '更新日時';


--
-- Name: transition_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transition_data (
    organization_id uuid NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id character varying NOT NULL,
    task_no numeric(3,0) NOT NULL,
    transition_id character varying NOT NULL,
    status numeric(2,0),
    progress_rate numeric(3,0),
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE transition_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transition_data IS 'トランジション実績';


--
-- Name: COLUMN transition_data.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.organization_id IS '組織ID';


--
-- Name: COLUMN transition_data.project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.project_id IS 'プロジェクトID';


--
-- Name: COLUMN transition_data.method_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.method_id IS 'メソッドID';


--
-- Name: COLUMN transition_data.task_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.task_no IS 'タスク連番';


--
-- Name: COLUMN transition_data.transition_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.transition_id IS 'トランジションID';


--
-- Name: COLUMN transition_data.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.status IS 'ステータス';


--
-- Name: COLUMN transition_data.progress_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.progress_rate IS '進捗率';


--
-- Name: COLUMN transition_data.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN transition_data.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN transition_data.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.create_at IS '作成日時';


--
-- Name: COLUMN transition_data.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_data.update_at IS '更新日時';


--
-- Name: transition_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transition_set (
    transition_set_id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    project_name text,
    file_id uuid NOT NULL,
    file_path text NOT NULL,
    method_uuid uuid NOT NULL,
    transition_id text NOT NULL,
    instruction_ids text[],
    instruction_descs text[],
    input_place_ids text[] DEFAULT '{}'::text[] NOT NULL,
    output_place_ids text[] DEFAULT '{}'::text[] NOT NULL,
    input_place_count integer DEFAULT 0 NOT NULL,
    output_place_count integer DEFAULT 0 NOT NULL,
    input_text text DEFAULT ''::text NOT NULL,
    transition_text text DEFAULT ''::text NOT NULL,
    output_text text DEFAULT ''::text NOT NULL,
    structure_text text DEFAULT ''::text NOT NULL,
    input_mt_count integer,
    input_ct_count integer,
    input_rt_count integer,
    output_mt_count integer,
    output_ct_count integer,
    output_rt_count integer,
    emb_input public.vector(768) NOT NULL,
    emb_transition public.vector(768) NOT NULL,
    emb_output public.vector(768) NOT NULL,
    emb_structure public.vector(768) NOT NULL,
    technique text,
    embedding_model_version text DEFAULT 'embeddinggemma-768d-v1'::text NOT NULL,
    norm_template_version text DEFAULT 'v2.5'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE transition_set; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transition_set IS 'セマンティック検索（トランジションセット型）のコアテーブル';


--
-- Name: COLUMN transition_set.transition_set_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.transition_set_id IS '主キー（UUID）';


--
-- Name: COLUMN transition_set.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.organization_id IS '組織ID（マルチテナント分離用）';


--
-- Name: COLUMN transition_set.project_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.project_name IS 'プロジェクト名（S3パスから抽出、NULL許容）';


--
-- Name: COLUMN transition_set.file_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.file_id IS 'MAIMLファイルの識別子';


--
-- Name: COLUMN transition_set.method_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.method_uuid IS 'method要素のUUID';


--
-- Name: COLUMN transition_set.transition_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.transition_id IS 'PNML transition要素のID';


--
-- Name: COLUMN transition_set.emb_input; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.emb_input IS '入力ベクトル（768次元）';


--
-- Name: COLUMN transition_set.emb_transition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.emb_transition IS '遷移ベクトル（768次元）';


--
-- Name: COLUMN transition_set.emb_output; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.emb_output IS '出力ベクトル（768次元）';


--
-- Name: COLUMN transition_set.emb_structure; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.emb_structure IS '構造ベクトル（768次元）';


--
-- Name: COLUMN transition_set.technique; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transition_set.technique IS '分析手法コード（RAMAN, XRF, GC-MS等）';


--
-- Name: upload_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_batch (
    batch_id character varying(100) NOT NULL,
    batch_name character varying(255) NOT NULL,
    upload_type character varying(50) NOT NULL,
    organization_id uuid NOT NULL,
    upload_by character varying(50) NOT NULL,
    total_files integer NOT NULL,
    completed_files integer DEFAULT 0,
    failed_files integer DEFAULT 0,
    status character varying(50) DEFAULT 'in_progress'::character varying NOT NULL,
    start_time timestamp without time zone DEFAULT now() NOT NULL,
    end_time timestamp without time zone,
    create_at timestamp without time zone DEFAULT now() NOT NULL,
    update_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_completed_files CHECK ((completed_files >= 0)),
    CONSTRAINT check_failed_files CHECK ((failed_files >= 0)),
    CONSTRAINT check_progress CHECK (((completed_files + failed_files) <= total_files)),
    CONSTRAINT check_total_files CHECK ((total_files > 0))
);


--
-- Name: TABLE upload_batch; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.upload_batch IS 'アップロードバッチ管理テーブル';


--
-- Name: COLUMN upload_batch.batch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.batch_id IS 'バッチ識別子（主キー）';


--
-- Name: COLUMN upload_batch.upload_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.upload_type IS 'アップロード種別（single/bulk/folder/draft）';


--
-- Name: COLUMN upload_batch.upload_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.upload_by IS 'アップロード実行者';


--
-- Name: COLUMN upload_batch.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.status IS 'バッチステータス（in_progress/completed/completed_with_errors/failed）';


--
-- Name: COLUMN upload_batch.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.create_at IS 'レコード作成日時';


--
-- Name: COLUMN upload_batch.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.upload_batch.update_at IS 'レコード更新日時';


--
-- Name: user_authentication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_authentication (
    user_id character varying(50) NOT NULL,
    organization_id uuid NOT NULL,
    password character varying(255) NOT NULL,
    is_temporary_flg boolean DEFAULT false NOT NULL,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE user_authentication; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_authentication IS '利用者認証';


--
-- Name: COLUMN user_authentication.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.user_id IS 'ユーザID';


--
-- Name: COLUMN user_authentication.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.organization_id IS '組織ID';


--
-- Name: COLUMN user_authentication.password; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.password IS 'ハッシュパスワード';


--
-- Name: COLUMN user_authentication.is_temporary_flg; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.is_temporary_flg IS '仮パスワードフラグ';


--
-- Name: COLUMN user_authentication.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN user_authentication.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN user_authentication.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.create_at IS '作成日時';


--
-- Name: COLUMN user_authentication.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_authentication.update_at IS '更新日時';


--
-- Name: vendor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor (
    organization_id uuid NOT NULL,
    vendor_uuid uuid NOT NULL,
    corporation_id uuid,
    vendor_id character varying NOT NULL,
    vendor_name character varying NOT NULL,
    vendor_description character varying,
    vendor_annotation character varying,
    is_active boolean,
    create_user_id character varying(50),
    update_user_id character varying(50),
    create_at timestamp without time zone,
    update_at timestamp without time zone
);


--
-- Name: TABLE vendor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vendor IS 'vendor';


--
-- Name: COLUMN vendor.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.organization_id IS '組織ID';


--
-- Name: COLUMN vendor.vendor_uuid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.vendor_uuid IS 'uuid';


--
-- Name: COLUMN vendor.corporation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.corporation_id IS '会社ID';


--
-- Name: COLUMN vendor.vendor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.vendor_id IS 'ID';


--
-- Name: COLUMN vendor.vendor_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.vendor_name IS '名称';


--
-- Name: COLUMN vendor.vendor_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.vendor_description IS '説明';


--
-- Name: COLUMN vendor.vendor_annotation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.vendor_annotation IS '注釈';


--
-- Name: COLUMN vendor.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.is_active IS 'アクティブ判定';


--
-- Name: COLUMN vendor.create_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.create_user_id IS '作成者ユーザID';


--
-- Name: COLUMN vendor.update_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.update_user_id IS '更新者ユーザID';


--
-- Name: COLUMN vendor.create_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.create_at IS '作成日時';


--
-- Name: COLUMN vendor.update_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vendor.update_at IS '更新日時';


--
-- Name: login_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history ALTER COLUMN id SET DEFAULT nextval('public.login_history_id_seq'::regclass);


--
-- Name: maiml_analysis_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_analysis_results ALTER COLUMN id SET DEFAULT nextval('public.maiml_analysis_results_id_seq'::regclass);


--
-- Name: maiml_drafts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_drafts ALTER COLUMN id SET DEFAULT nextval('public.maiml_drafts_id_seq'::regclass);


--
-- Name: attribute attribute_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute
    ADD CONSTRAINT attribute_pkc PRIMARY KEY (organization_id, attribute_id);


--
-- Name: code_master code_master_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_master
    ADD CONSTRAINT code_master_pkc PRIMARY KEY (organization_id, code_division, code_value);


--
-- Name: corporation corporation_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporation
    ADD CONSTRAINT corporation_pkc PRIMARY KEY (corporation_id);


--
-- Name: creator creator_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.creator
    ADD CONSTRAINT creator_pkc PRIMARY KEY (organization_id, creator_uuid);


--
-- Name: department department_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department
    ADD CONSTRAINT department_pkey PRIMARY KEY (organization_id, department_cd);


--
-- Name: file_metadata file_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_metadata
    ADD CONSTRAINT file_metadata_pkey PRIMARY KEY (file_key);


--
-- Name: instruction_acknowledged_history instruction_acknowledged_history_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instruction_acknowledged_history
    ADD CONSTRAINT instruction_acknowledged_history_pkc PRIMARY KEY (organization_id, project_id, experiment_instruction_id, experiment_user_id);


--
-- Name: instrument instrument_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instrument
    ADD CONSTRAINT instrument_pkc PRIMARY KEY (organization_id, instrument_uuid);


--
-- Name: issue_comment issue_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_comment
    ADD CONSTRAINT issue_comment_pkey PRIMARY KEY (organization_id, project_id, issue_id, sequence_no);


--
-- Name: issue issue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue
    ADD CONSTRAINT issue_pkey PRIMARY KEY (organization_id, project_id, issue_id);


--
-- Name: login_history login_history_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkc PRIMARY KEY (id);


--
-- Name: maiml_analysis_results maiml_analysis_results_file_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_analysis_results
    ADD CONSTRAINT maiml_analysis_results_file_key_key UNIQUE (file_key);


--
-- Name: maiml_analysis_results maiml_analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_analysis_results
    ADD CONSTRAINT maiml_analysis_results_pkey PRIMARY KEY (id);


--
-- Name: maiml_drafts maiml_drafts_draft_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_drafts
    ADD CONSTRAINT maiml_drafts_draft_key_key UNIQUE (draft_key);


--
-- Name: maiml_drafts maiml_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_drafts
    ADD CONSTRAINT maiml_drafts_pkey PRIMARY KEY (id);


--
-- Name: maiml_event_log maiml_event_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_event_log
    ADD CONSTRAINT maiml_event_log_pkey PRIMARY KEY (organization_id, project_id, sequence_no);


--
-- Name: maiml_publish_job maiml_publish_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_publish_job
    ADD CONSTRAINT maiml_publish_job_pkey PRIMARY KEY (job_id);


--
-- Name: maiml_schema_definitions maiml_schema_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_schema_definitions
    ADD CONSTRAINT maiml_schema_definitions_pkey PRIMARY KEY (schema_version);


--
-- Name: maiml_validation_history maiml_validation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maiml_validation_history
    ADD CONSTRAINT maiml_validation_history_pkey PRIMARY KEY (validation_id);


--
-- Name: organization organization_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization
    ADD CONSTRAINT organization_pkc PRIMARY KEY (organization_id);


--
-- Name: organization_user organization_user_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_user
    ADD CONSTRAINT organization_user_pkc PRIMARY KEY (user_id, organization_id);


--
-- Name: pin_codes pin_codes_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pin_codes
    ADD CONSTRAINT pin_codes_pkc PRIMARY KEY (organization_id, user_id);


--
-- Name: project_instruction project_instruction_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_instruction
    ADD CONSTRAINT project_instruction_pkc PRIMARY KEY (organization_id, project_id, experiment_instruction_id);


--
-- Name: project project_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project
    ADD CONSTRAINT project_pkc PRIMARY KEY (organization_id, project_id);


--
-- Name: project_task_detail project_task_detail_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_task_detail
    ADD CONSTRAINT project_task_detail_pkc PRIMARY KEY (organization_id, project_id, method_id, task_no);


--
-- Name: project_task project_task_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_task
    ADD CONSTRAINT project_task_pkc PRIMARY KEY (organization_id, project_id, method_id, experiment_order);


--
-- Name: role_permission role_permission_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permission
    ADD CONSTRAINT role_permission_pkc PRIMARY KEY (organization_id, role_cd, function_cd);


--
-- Name: role role_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkc PRIMARY KEY (organization_id, role_cd);


--
-- Name: template_data template_data_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_data
    ADD CONSTRAINT template_data_pkc PRIMARY KEY (organization_id, project_id, method_id, task_no, place_id);


--
-- Name: transition_data transition_data_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transition_data
    ADD CONSTRAINT transition_data_pkc PRIMARY KEY (organization_id, project_id, method_id, task_no, transition_id);


--
-- Name: transition_set transition_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transition_set
    ADD CONSTRAINT transition_set_pkey PRIMARY KEY (transition_set_id);


--
-- Name: upload_batch upload_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_batch
    ADD CONSTRAINT upload_batch_pkey PRIMARY KEY (batch_id);


--
-- Name: transition_set uq_transition_set_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transition_set
    ADD CONSTRAINT uq_transition_set_key UNIQUE (organization_id, file_id, method_uuid, transition_id);


--
-- Name: user_authentication user_authentication_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_authentication
    ADD CONSTRAINT user_authentication_pkc PRIMARY KEY (user_id, organization_id);


--
-- Name: vendor vendor_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor
    ADD CONSTRAINT vendor_pkc PRIMARY KEY (organization_id, vendor_uuid);


--
-- Name: idx_file_metadata_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_batch_id ON public.file_metadata USING btree (upload_batch_id);


--
-- Name: idx_file_metadata_custom_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_custom_metadata_gin ON public.file_metadata USING gin (custom_metadata);


--
-- Name: idx_file_metadata_file_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_file_hash ON public.file_metadata USING btree (file_hash);


--
-- Name: idx_file_metadata_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_organization_id ON public.file_metadata USING btree (organization_id);


--
-- Name: idx_file_metadata_parent_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_parent_folder ON public.file_metadata USING btree (parent_folder_path);


--
-- Name: idx_file_metadata_search_keywords_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_search_keywords_gin ON public.file_metadata USING gin (search_keywords);


--
-- Name: idx_file_metadata_tags_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_tags_gin ON public.file_metadata USING gin (tags);


--
-- Name: idx_file_metadata_upload_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_upload_batch ON public.file_metadata USING btree (upload_batch_id);


--
-- Name: idx_file_metadata_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_metadata_uploaded_by ON public.file_metadata USING btree (uploaded_by);


--
-- Name: idx_instruction_ack_history_instruction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruction_ack_history_instruction ON public.instruction_acknowledged_history USING btree (experiment_instruction_id);


--
-- Name: idx_instruction_ack_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruction_ack_history_org ON public.instruction_acknowledged_history USING btree (organization_id);


--
-- Name: idx_instruction_ack_history_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruction_ack_history_project ON public.instruction_acknowledged_history USING btree (project_id);


--
-- Name: idx_instruction_ack_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_instruction_ack_history_user ON public.instruction_acknowledged_history USING btree (experiment_user_id);


--
-- Name: idx_issue_comment_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_comment_issue_id ON public.issue_comment USING btree (issue_id, sequence_no);


--
-- Name: idx_issue_comment_org_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_comment_org_issue ON public.issue_comment USING btree (organization_id, issue_id);


--
-- Name: idx_issue_org_method_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_org_method_task ON public.issue USING btree (organization_id, method_id, task_no) WHERE (issue_target IS NOT NULL);


--
-- Name: idx_issue_org_project_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_org_project_created ON public.issue USING btree (organization_id, project_id, create_at DESC);


--
-- Name: idx_issue_org_project_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_org_project_status ON public.issue USING btree (organization_id, project_id, status);


--
-- Name: idx_issue_org_transition; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issue_org_transition ON public.issue USING btree (organization_id, transition_id) WHERE (transition_id IS NOT NULL);


--
-- Name: idx_login_history_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_query ON public.login_history USING btree (organization_id, user_id, entry_execute_flg);


--
-- Name: idx_login_history_rate_limit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_history_rate_limit ON public.login_history USING btree (login_at, login_sf);


--
-- Name: idx_maiml_analysis_results_errors_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_errors_gin ON public.maiml_analysis_results USING gin (errors);


--
-- Name: idx_maiml_analysis_results_file_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_file_key ON public.maiml_analysis_results USING btree (file_key);


--
-- Name: idx_maiml_analysis_results_is_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_is_valid ON public.maiml_analysis_results USING btree (is_valid);


--
-- Name: idx_maiml_analysis_results_statistics_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_statistics_gin ON public.maiml_analysis_results USING gin (statistics);


--
-- Name: idx_maiml_analysis_results_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_timestamp ON public.maiml_analysis_results USING btree (analysis_timestamp DESC);


--
-- Name: idx_maiml_analysis_results_warnings_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_analysis_results_warnings_gin ON public.maiml_analysis_results USING gin (warnings);


--
-- Name: idx_maiml_drafts_last_saved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_last_saved ON public.maiml_drafts USING btree (user_id, last_saved_at DESC);


--
-- Name: idx_maiml_drafts_org_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_org_project ON public.maiml_drafts USING btree (organization_id, project_id);


--
-- Name: idx_maiml_drafts_org_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_org_user ON public.maiml_drafts USING btree (organization_id, user_id);


--
-- Name: idx_maiml_drafts_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_organization_id ON public.maiml_drafts USING btree (organization_id);


--
-- Name: idx_maiml_drafts_original_file; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_original_file ON public.maiml_drafts USING btree (original_file_key) WHERE (original_file_key IS NOT NULL);


--
-- Name: idx_maiml_drafts_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_project_id ON public.maiml_drafts USING btree (project_id);


--
-- Name: idx_maiml_drafts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_drafts_user_id ON public.maiml_drafts USING btree (user_id);


--
-- Name: idx_maiml_schema_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_schema_active ON public.maiml_schema_definitions USING btree (is_active);


--
-- Name: idx_maiml_schema_element_definitions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_schema_element_definitions ON public.maiml_schema_definitions USING gin (element_definitions);


--
-- Name: idx_maiml_schema_hierarchy_rules; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_schema_hierarchy_rules ON public.maiml_schema_definitions USING gin (hierarchy_rules);


--
-- Name: idx_maiml_schema_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_schema_version ON public.maiml_schema_definitions USING btree (schema_version);


--
-- Name: idx_maiml_validation_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_created_at ON public.maiml_validation_history USING btree (created_at);


--
-- Name: idx_maiml_validation_history_error_details; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_error_details ON public.maiml_validation_history USING gin (error_details);


--
-- Name: idx_maiml_validation_history_file_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_file_key ON public.maiml_validation_history USING btree (file_key);


--
-- Name: idx_maiml_validation_history_is_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_is_valid ON public.maiml_validation_history USING btree (is_valid);


--
-- Name: idx_maiml_validation_history_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_org_id ON public.maiml_validation_history USING btree (organization_id);


--
-- Name: idx_maiml_validation_history_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_project_id ON public.maiml_validation_history USING btree (project_id);


--
-- Name: idx_maiml_validation_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_user_id ON public.maiml_validation_history USING btree (user_id);


--
-- Name: idx_maiml_validation_history_warning_details; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maiml_validation_history_warning_details ON public.maiml_validation_history USING gin (warning_details);


--
-- Name: idx_organizaton_organization_cd; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_organizaton_organization_cd ON public.organization USING btree (organization_cd);


--
-- Name: idx_pin_codes_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pin_codes_token ON public.pin_codes USING btree (session_token);


--
-- Name: idx_project_create_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_create_at ON public.project USING btree (create_at DESC);


--
-- Name: idx_project_instruction_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_instruction_status ON public.project_instruction USING btree (organization_id, project_id, instruction_status);


--
-- Name: idx_project_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_org_status ON public.project USING btree (organization_id, project_status);


--
-- Name: idx_project_org_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_org_status_created ON public.project USING btree (organization_id, project_status, create_at DESC);


--
-- Name: idx_project_task_detail_exp_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_task_detail_exp_user ON public.project_task_detail USING btree (experiment_user_id);


--
-- Name: idx_project_task_detail_org_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_task_detail_org_user ON public.project_task_detail USING btree (organization_id, experiment_user_id);


--
-- Name: idx_ts_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_file_id ON public.transition_set USING btree (file_id);


--
-- Name: idx_ts_method_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_method_uuid ON public.transition_set USING btree (method_uuid);


--
-- Name: idx_ts_org_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_org_project ON public.transition_set USING btree (organization_id, project_name);


--
-- Name: idx_ts_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_organization_id ON public.transition_set USING btree (organization_id);


--
-- Name: idx_ts_technique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_technique ON public.transition_set USING btree (technique);


--
-- Name: idx_ts_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ts_updated_at ON public.transition_set USING btree (updated_at);


--
-- Name: idx_upload_batch_create_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batch_create_at ON public.upload_batch USING btree (create_at DESC);


--
-- Name: idx_upload_batch_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batch_organization ON public.upload_batch USING btree (organization_id);


--
-- Name: idx_upload_batch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batch_status ON public.upload_batch USING btree (status);


--
-- Name: idx_upload_batch_upload_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batch_upload_by ON public.upload_batch USING btree (upload_by);


--
-- Name: ix_publish_job_org_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_publish_job_org_project ON public.maiml_publish_job USING btree (organization_id, project_name);


--
-- Name: ix_publish_job_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_publish_job_status ON public.maiml_publish_job USING btree (status);


--
-- Name: ix_publish_job_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_publish_job_type_status ON public.maiml_publish_job USING btree (job_type, status);


--
-- Name: ts_emb_input_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ts_emb_input_hnsw ON public.transition_set USING hnsw (emb_input public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: ts_emb_output_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ts_emb_output_hnsw ON public.transition_set USING hnsw (emb_output public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: ts_emb_structure_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ts_emb_structure_hnsw ON public.transition_set USING hnsw (emb_structure public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: ts_emb_transition_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ts_emb_transition_hnsw ON public.transition_set USING hnsw (emb_transition public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- PostgreSQL database dump complete
--

\unrestrict G0C9lcUmbgl7QtryTge7ye2gevJRebhPqQNPnmTZubtfwdn6mQC53y1uxCo8ZKe

