'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/** 上传工单截图到 ticket-attachments，返回公开 URL（每条消息最多 5 张） */
export async function uploadTicketImages(ticketId: string, files: File[]): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error('存储未连接');
  const urls: string[] = [];
  for (const f of files.slice(0, 5)) {
    const ext = (f.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `tickets/${ticketId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('ticket-attachments')
      .upload(path, f, { contentType: f.type || 'image/png' });
    if (error) throw new Error(error.message);
    urls.push(supabase.storage.from('ticket-attachments').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
