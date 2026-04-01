import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 如果环境变量未配置，使用 mock 客户端（用于本地开发）
const isMock = !supabaseUrl || supabaseUrl === 'https://xxxxxxxxxxxxxx.supabase.co'

export const supabase = isMock
  ? null
  : createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = !isMock

/*
 * Supabase 数据库 Schema（在 Supabase SQL Editor 中执行）:
 *
 * -- 开启向量扩展
 * create extension if not exists vector;
 *
 * -- 文档表
 * create table documents (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users,
 *   title text not null,
 *   content text,
 *   summary text,
 *   keywords jsonb default '[]',
 *   tags jsonb default '[]',
 *   source_type text default 'manual',
 *   source_url text,
 *   file_url text,
 *   file_type text,
 *   folder_id uuid,
 *   word_count int default 0,
 *   view_count int default 0,
 *   embedding vector(1536),
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 *
 * -- 文件夹表
 * create table folders (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users,
 *   name text not null,
 *   parent_id uuid references folders(id),
 *   created_at timestamptz default now()
 * );
 *
 * -- 研究任务表
 * create table research_tasks (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users,
 *   query text not null,
 *   status text default 'pending',
 *   result_doc_id uuid references documents(id),
 *   error text,
 *   created_at timestamptz default now(),
 *   completed_at timestamptz
 * );
 *
 * -- 活动记录表
 * create table activities (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references auth.users,
 *   date date default current_date,
 *   docs_created int default 0,
 *   annotations_count int default 0,
 *   tags_added int default 0,
 *   study_minutes int default 0
 * );
 *
 * -- RLS 策略（用户只能访问自己的数据）
 * alter table documents enable row level security;
 * create policy "Users own documents" on documents for all using (auth.uid() = user_id);
 *
 * alter table folders enable row level security;
 * create policy "Users own folders" on folders for all using (auth.uid() = user_id);
 */
