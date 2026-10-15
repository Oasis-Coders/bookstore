-- 工单截图存储桶改为私有：截图不再公开可读。
-- image_urls 里存的是存储 path，展示时由服务端 getTicket() 签发 1 小时有效的签名 URL。
-- 上传仍走浏览器客户端（admin+ insert policy 不变）。

update storage.buckets
set public = false
where id = 'ticket-attachments';

-- 私有桶需要显式的读授权：admin / super_admin 可读（签名 URL 签发依赖该策略）
drop policy if exists "ticket-attachments admin select" on storage.objects;
create policy "ticket-attachments admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments'
    and public.has_any_role(array['admin', 'super_admin']));
