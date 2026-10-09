'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getTicket, postTicketMessage, closeTicket, reopenTicket,
  type TicketMessageRow, type TicketRow,
} from '../actions';
import { StatusBadge, KindBadge, AdminOnly } from '../ticket-ui';
import { uploadTicketImages } from '../ticket-upload';

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ m, lang }: { m: TicketMessageRow; lang: string }) {
  const isAgent = m.author_type === 'agent';
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${isAgent ? '' : 'flex flex-col items-end'}`}>
        <p className="mb-1 text-[11px] text-[#5b5f94]">
          {isAgent ? `🐾 ${m.author_name || 'Taffy'}` : m.author_name} · {fmtTime(m.created_at)}
        </p>
        <div
          className={`rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
            isAgent ? 'bg-white text-cocm-ink shadow-[0_1px_6px_rgba(45,47,146,0.08)]' : 'bg-cocm-ink text-white'
          }`}
        >
          {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
          {m.image_urls.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${m.body ? 'mt-2' : ''}`}>
              {m.image_urls.map((u, i) => (
                <img
                  key={i}
                  src={u}
                  alt=""
                  onClick={() => setLightbox(u)}
                  className="h-20 w-20 cursor-zoom-in rounded-[8px] object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-[12px]" />
        </div>
      )}
    </div>
  );
}

export function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const { lang } = useT();
  const isZh = lang === 'zh';
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<TicketMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async (scroll = false) => {
    const r = await getTicket(ticketId);
    if (r) {
      setTicket(r.ticket);
      setMessages(r.messages);
      if (scroll) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(true);
    // Realtime 订阅：新消息 / 状态变化时自动刷新，不轮询
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const ch = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
        () => load(false)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` },
        () => load(false)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [ticketId]);

  const send = async () => {
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    setErr('');
    try {
      const urls = files.length > 0 ? await uploadTicketImages(ticketId, files) : [];
      await postTicketMessage(ticketId, body, urls);
      setBody('');
      setFiles([]);
      await load(true);
    } catch (e: any) {
      setErr(e.message || (isZh ? '发送失败' : 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  const doClose = async () => {
    setActing(true);
    try { await closeTicket(ticketId); await load(false); }
    catch (e: any) { setErr(e.message); }
    finally { setActing(false); }
  };
  const doReopen = async () => {
    setActing(true);
    try { await reopenTicket(ticketId); await load(false); }
    catch (e: any) { setErr(e.message); }
    finally { setActing(false); }
  };

  return (
    <AdminOnly
      fallback={
        <Card className="p-8 text-center text-[13px] text-[#5b5f94]">
          {isZh ? '问题申报仅对管理员开放' : 'Tickets are visible to admins only'}
        </Card>
      }
    >
      <div className="mx-auto max-w-[760px]">
        <Link href="/tools/tickets" className="inline-flex items-center text-[13px] text-[#5b5f94] hover:text-cocm-ink">
          {isZh ? '← 返回工单列表' : '← Back to tickets'}
        </Link>

        {loading || !ticket ? (
          <Card className="mt-3 p-8 text-center text-[13px] text-[#5b5f94]">{isZh ? '加载中…' : 'Loading…'}</Card>
        ) : (
          <>
            <Card className="mt-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[14px] font-bold text-cocm-red">#{ticket.number}</span>
                <KindBadge kind={ticket.kind} lang={lang} />
                <StatusBadge status={ticket.status} lang={lang} />
                <span className="ml-auto text-[11px] text-[#5b5f94]">
                  {ticket.creator_name || ''} · {fmtTime(ticket.created_at)}
                </span>
              </div>
              <p className="mt-2 text-[16px] font-semibold text-cocm-ink">{ticket.title}</p>

              {ticket.preview_url && (
                <a
                  href={ticket.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-[10px] border border-cocm-ink/15 bg-[#f4f2fa] px-3.5 py-2.5 text-[13px] text-cocm-ink hover:border-cocm-ink/40"
                >
                  <span className="font-semibold">🔍 {isZh ? '预览链接（在这个版本上验收）' : 'Preview link'}</span>
                  <span className="mt-0.5 block break-all text-[12px] text-[#5b5f94] underline">{ticket.preview_url}</span>
                </a>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {ticket.status === 'review' && (
                  <>
                    <Button size="sm" className="rounded-[10px]" disabled={acting} onClick={doClose}>
                      {isZh ? '确认修复，关闭工单' : 'Confirm fix & close'}
                    </Button>
                    <span className="text-[11px] text-[#5b5f94]">
                      {isZh ? '请先在上面的预览链接里验收，没问题再关闭；关闭后改动会在几分钟后自动合并上线。' : 'Please verify on the preview link first; closing merges the change to production in a few minutes.'}
                    </span>
                  </>
                )}
                {ticket.status === 'closed' && (
                  <Button size="sm" variant="secondary" className="rounded-[10px]" disabled={acting} onClick={doReopen}>
                    {isZh ? '重新打开' : 'Reopen'}
                  </Button>
                )}
                {ticket.status === 'blocked' && (
                  <p className="text-[12px] leading-relaxed text-[#b3261e]">
                    {isZh ? '此工单等待 Luke 拍板，请在下方留言或直接找他。' : 'This ticket is waiting on Luke\'s decision.'}
                  </p>
                )}
              </div>
            </Card>

            <div className="mt-4 space-y-3">
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} lang={lang} />
              ))}
              <div ref={bottomRef} />
            </div>

            {ticket.status !== 'closed' ? (
              <Card className="mt-4 p-4">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder={isZh ? '补充说明…' : 'Add a note…'}
                  className="w-full rounded-[10px] border border-cocm-ink/10 bg-white px-3 py-2 text-[13px] text-cocm-ink outline-none focus:border-cocm-ink/40"
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="h-8 rounded-[10px] text-[12px]" onClick={() => fileRef.current?.click()}>
                    {isZh ? '＋ 截图' : '+ Screenshot'}
                  </Button>
                  {files.length > 0 && (
                    <span className="text-[12px] text-[#5b5f94]">{isZh ? `已选 ${files.length} 张` : `${files.length} selected`}</span>
                  )}
                  <Button size="sm" className="ml-auto h-8 rounded-[10px] text-[12px]" disabled={sending} onClick={send}>
                    {sending ? (isZh ? '发送中…' : 'Sending…') : (isZh ? '发送' : 'Send')}
                  </Button>
                </div>
                {err && <p className="mt-2 text-[12px] text-cocm-red">{err}</p>}
              </Card>
            ) : (
              <p className="mt-4 text-center text-[12px] text-[#5b5f94]">
                {isZh ? '工单已关闭，改动将在几分钟后自动合并上线。如有问题可重新打开。' : 'Ticket closed. Changes will go live in a few minutes. Reopen if needed.'}
              </p>
            )}
          </>
        )}
      </div>
    </AdminOnly>
  );
}
