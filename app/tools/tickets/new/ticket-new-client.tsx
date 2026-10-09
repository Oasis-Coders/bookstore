'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/use-t';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTicket, attachImagesToMessage, type TicketKind } from '../actions';
import { AdminOnly, KIND_META } from '../ticket-ui';
import { uploadTicketImages } from '../ticket-upload';

const KINDS: TicketKind[] = ['bug', 'feature', 'other'];

export function TicketNewClient() {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const router = useRouter();
  const [kind, setKind] = useState<TicketKind>('bug');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!title.trim()) { setErr(isZh ? '请填写标题' : 'Title is required'); return; }
    setBusy(true);
    setErr('');
    try {
      const { ticketId, messageId } = await createTicket({ kind, title, description: desc });
      if (files.length > 0 && messageId) {
        try {
          const urls = await uploadTicketImages(ticketId, files);
          await attachImagesToMessage(messageId, urls);
        } catch (e: any) {
          setErr(isZh ? `工单已创建，但截图上传失败：${e.message}` : `Ticket created but image upload failed: ${e.message}`);
        }
      }
      router.push(`/tools/tickets/${ticketId}`);
    } catch (e: any) {
      setErr(e.message || (isZh ? '提交失败' : 'Submit failed'));
      setBusy(false);
    }
  };

  return (
    <AdminOnly
      fallback={
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">
          {isZh ? '问题申报仅对管理员开放' : 'Tickets are visible to admins only'}
        </Card>
      }
    >
      <div className="mx-auto max-w-[720px]">
        <Link href="/tools/tickets" className="inline-flex items-center text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          {isZh ? '← 返回工单列表' : '← Back to tickets'}
        </Link>
        <Card className="mt-3 p-5">
          <CardTitle>{isZh ? '新建工单' : 'New ticket'}</CardTitle>
          <p className="mt-1 text-[12px] leading-relaxed text-[#5b5f94]">
            {isZh
              ? '描述你想改的地方，可以附截图。提交后助手会自动开始处理，并在工单里更新进度。'
              : 'Describe what you want changed; screenshots welcome. The assistant will pick it up automatically and post progress here.'}
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-cocm-ink">{isZh ? '类型' : 'Type'}</p>
              <div className="flex gap-1.5">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      kind === k
                        ? 'bg-cocm-ink text-white'
                        : 'border border-cocm-ink/10 bg-white text-[#5b5f94] hover:border-cocm-ink/25'
                    }`}
                  >
                    {isZh ? KIND_META[k].zh : KIND_META[k].en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-cocm-ink">{isZh ? '标题' : 'Title'}</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isZh ? '一句话概括，比如：价格标签打印太慢' : 'One-line summary'} />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-cocm-ink">{isZh ? '详细描述' : 'Details'}</p>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={5}
                placeholder={isZh ? '哪里不对 / 想要什么效果，越具体越好…' : 'What is wrong / what you want…' }
                className="w-full rounded-[10px] border border-cocm-ink/10 bg-white px-3 py-2 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-cocm-ink">{isZh ? '截图（可选，最多 5 张）' : 'Screenshots (optional, up to 5)'}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" className="h-8 rounded-[10px] text-[12px]" onClick={() => fileRef.current?.click()}>
                  {isZh ? '选择图片' : 'Choose images'}
                </Button>
                {files.length > 0 && (
                  <span className="text-[12px] text-[#5b5f94]">{isZh ? `已选 ${files.length} 张` : `${files.length} selected`}</span>
                )}
              </div>
              {files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative">
                      <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-[8px] object-cover" />
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cocm-ink text-[11px] text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {err && <p className="mt-3 text-[12px] text-cocm-red">{err}</p>}
          <div className="mt-4 flex justify-end">
            <Button className="rounded-[10px]" disabled={busy} onClick={submit}>
              {busy ? (isZh ? '提交中…' : 'Submitting…') : (isZh ? '提交工单' : 'Submit ticket')}
            </Button>
          </div>
        </Card>
      </div>
    </AdminOnly>
  );
}
