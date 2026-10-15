'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * 上传工单截图到 ticket-attachments，返回存储路径（path）。
 * 存储桶是私有的：image_urls 里只存 path，展示时由服务端 getTicket()
 * 统一签发短期签名 URL。历史数据里存的是完整公开 URL，服务端会兼容解析。
 */
export async function uploadTicketImages(ticketId: string, files: File[]): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error('存储未连接');
  const paths: string[] = [];
  for (const f of files.slice(0, 5)) {
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `tickets/${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('ticket-attachments')
      .upload(path, f, { contentType: f.type || 'image/png' });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  return paths;
}
