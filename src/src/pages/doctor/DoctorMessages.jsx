// src/pages/doctor/DoctorMessages.jsx
//
// Real-time doctor ↔ parent messaging using direct_messages + conversations.
// Two-pane layout: inbox (left) + open conversation (right).
// Supabase Realtime updates messages and unread counts instantly.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Send, MessageSquare, ArrowLeft, CheckCheck, Check,
  RefreshCw, Inbox, AlertCircle, Trash2, Users,
} from 'lucide-react'

import { useAuth }  from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { directMessageService } from '../../services/directMessageService'

import EmptyState from '../../components/EmptyState'
import Avatar     from '../../components/ui/Avatar'
import Button     from '../../components/ui/Button'
import { Skeleton } from '../../components/ui/Skeleton'
import { cn } from '../../utils/cn'

export default function DoctorMessages() {
  const { user } = useAuth()
  const toast    = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── State ────────────────────────────────────────────────────────
  const [conversations,    setConversations]    = useState([])
  const [search,           setSearch]           = useState('')
  const [loadingConvs,     setLoadingConvs]     = useState(true)

  const activeConvId = searchParams.get('conv') || null
  const [activeConv,       setActiveConv]       = useState(null)
  const [messages,         setMessages]         = useState([])
  const [loadingMsgs,      setLoadingMsgs]      = useState(false)
  const [draft,            setDraft]            = useState('')
  const [sending,          setSending]          = useState(false)

  const messagesEndRef = useRef(null)
  const realtimeRef    = useRef(null)    // current message subscription
  const convsRealtimeRef = useRef(null)  // conversation subscription

  // ── Load conversation list ───────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user?.id) return
    setLoadingConvs(true)
    try {
      const data = await directMessageService.listConversations({
        doctorId: user.id,
        search,
      })
      setConversations(data)
    } catch (err) {
      toast.error(err.message ?? 'Could not load conversations')
    } finally {
      setLoadingConvs(false)
    }
  }, [user, search, toast])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Subscribe to new messages for inbox refresh ──────────────────
  useEffect(() => {
    if (!user?.id) return
    const ch = directMessageService.subscribeToConversations({
      doctorId: user.id,
      onChange: loadConversations,
    })
    convsRealtimeRef.current = ch
    return () => { ch.unsubscribe() }
  }, [user, loadConversations])

  // ── Open conversation ────────────────────────────────────────────
  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      setActiveConv(null)
      return
    }
    // Find conv from list (or refetch if needed)
    const conv = conversations.find(c => c.id === activeConvId)
    if (conv) setActiveConv(conv)

    // Cleanup previous realtime sub
    if (realtimeRef.current) realtimeRef.current.unsubscribe()

    let cancelled = false
    setLoadingMsgs(true)
    ;(async () => {
      try {
        const msgs = await directMessageService.listMessages(activeConvId)
        if (cancelled) return
        setMessages(msgs)

        // Mark as read
        await directMessageService.markRead({ conversationId: activeConvId, myId: user.id })
        loadConversations() // refresh unread counts
      } catch (err) {
        if (!cancelled) toast.error(err.message ?? 'Could not load messages')
      } finally {
        if (!cancelled) setLoadingMsgs(false)
      }

      // Subscribe to realtime updates for this conversation
      if (cancelled) return
      const ch = directMessageService.subscribeToMessages({
        conversationId: activeConvId,
        onInsert: (msg) => {
          setMessages(prev => {
            // Avoid duplicates (optimistic insert + realtime)
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Mark as read if it's from the other party
          if (msg.sender_id !== user.id) {
            directMessageService.markRead({ conversationId: activeConvId, myId: user.id })
              .then(loadConversations)
          }
        },
        onUpdate: (updated) => {
          setMessages(prev => prev.map(m =>
            m.id === updated.id ? { ...m, read_at: updated.read_at } : m
          ))
        },
      })
      realtimeRef.current = ch
    })()

    return () => {
      cancelled = true
      if (realtimeRef.current) realtimeRef.current.unsubscribe()
    }
  }, [activeConvId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // ── Send ─────────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || !activeConvId || sending) return
    setSending(true)

    // Optimistic insert
    const optimistic = {
      id:              `opt_${Date.now()}`,
      conversation_id: activeConvId,
      sender_id:       user.id,
      content:         text,
      read_at:         null,
      created_at:      new Date().toISOString(),
      sender:          { id: user.id, full_name: user.email },
    }
    setMessages(prev => [...prev, optimistic])
    setDraft('')

    try {
      const saved = await directMessageService.send({
        conversationId: activeConvId,
        senderId:       user.id,
        content:        text,
      })
      // Replace optimistic with real
      setMessages(prev => prev.map(m =>
        m.id === optimistic.id ? saved : m
      ))
      loadConversations()
    } catch (err) {
      // Rollback
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setDraft(text)
      toast.error(err.message ?? 'Could not send message')
    } finally {
      setSending(false)
    }
  }

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message?')) return
    try {
      await directMessageService.remove(id)
      setMessages(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      toast.error(err.message ?? 'Could not delete')
    }
  }

  const openConv    = (id) => setSearchParams({ conv: id })
  const closeConv   = () => {
    const sp = new URLSearchParams(searchParams)
    sp.delete('conv')
    setSearchParams(sp)
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Messages
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">
            Real-time conversations with parents — powered by Supabase Realtime.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadConversations} disabled={loadingConvs}>
          <RefreshCw size={13} className={loadingConvs ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-13rem)] min-h-[500px]">

        {/* ── Inbox ── */}
        <aside className={cn(
          'rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col',
          activeConvId && 'hidden lg:flex',
        )}>
          <div className="p-3 border-b border-slate-200 dark:border-zinc-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="block w-full h-10 pl-9 pr-3 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <div className="p-3 space-y-2">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No conversations yet"
                description="Parents will appear here once they message you from the mobile app."
              />
            ) : (
              <ul>
                {conversations.map(conv => {
                  const isActive  = activeConvId === conv.id
                  const parent    = conv.user
                  const lastMsg   = conv.lastMessage
                  const isMyMsg   = lastMsg?.sender_id === user?.id
                  return (
                    <li key={conv.id}>
                      <button
                        onClick={() => openConv(conv.id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-start gap-3 border-l-2 transition',
                          isActive
                            ? 'bg-brand-50 dark:bg-zinc-800 border-brand-700 dark:border-white'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-zinc-950',
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar name={parent?.full_name || parent?.email} size="md" />
                          {conv.unread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold bg-brand-700 text-white dark:bg-white dark:text-black grid place-items-center">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-semibold text-sm truncate flex-1',
                              conv.unread > 0
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-600 dark:text-zinc-400',
                            )}>
                              {parent?.full_name || parent?.email || 'Parent'}
                            </span>
                            {lastMsg && (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                                {timeAgo(lastMsg.created_at)}
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {isMyMsg && (
                                lastMsg.read_at
                                  ? <CheckCheck size={11} className="text-brand-500 shrink-0" />
                                  : <Check size={11} className="text-slate-400 shrink-0" />
                              )}
                              <p className={cn(
                                'text-xs truncate',
                                conv.unread > 0
                                  ? 'text-slate-700 dark:text-zinc-300 font-semibold'
                                  : 'text-slate-400 dark:text-zinc-500',
                              )}>
                                {isMyMsg ? 'You: ' : ''}{lastMsg.content}
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Conversation ── */}
        <section className={cn(
          'rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col',
          !activeConvId && 'hidden lg:flex',
        )}>
          {!activeConvId ? (
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Pick a parent from the list to chat in real time."
            />
          ) : (
            <>
              {/* Header */}
              <header className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-3">
                <button
                  onClick={closeConv}
                  className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft size={16} />
                </button>
                {activeConv && (
                  <>
                    <Avatar name={activeConv.user?.full_name || activeConv.user?.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {activeConv.user?.full_name || activeConv.user?.email || 'Parent'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Real-time
                      </div>
                    </div>
                  </>
                )}
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-5 bg-slate-50/50 dark:bg-zinc-950/50">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="h-10 w-1/2 ml-auto" />
                    <Skeleton className="h-14 w-2/3" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="grid place-items-center h-full text-center">
                    <div>
                      <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-zinc-700 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-zinc-500">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {messages.map((m, i) => {
                      const isMe  = m.sender_id === user?.id
                      const prev  = messages[i - 1]
                      const showDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
                      const isOptimistic = m.id?.startsWith('opt_')
                      return (
                        <li key={m.id}>
                          {showDay && (
                            <div className="text-center my-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 px-2.5 py-1 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                                {dayLabel(m.created_at)}
                              </span>
                            </div>
                          )}
                          <div className={cn('flex gap-2 group', isMe && 'flex-row-reverse')}>
                            <div className={cn(
                              'max-w-[75%] sm:max-w-md rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                              isMe
                                ? 'bg-brand-700 text-white rounded-br-sm dark:bg-white dark:text-black'
                                : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-bl-sm',
                              isOptimistic && 'opacity-70',
                            )}>
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                              <div className={cn(
                                'text-[10px] mt-1 flex items-center gap-1',
                                isMe
                                  ? 'text-brand-100 dark:text-zinc-600 justify-end'
                                  : 'text-slate-400 dark:text-zinc-500',
                              )}>
                                {timeOnly(m.created_at)}
                                {isMe && (
                                  m.read_at
                                    ? <CheckCheck size={11} className="text-brand-200 dark:text-zinc-500" />
                                    : isOptimistic
                                      ? <span className="inline-block w-2.5 h-2.5 rounded-full border-[1.5px] border-brand-200 border-t-transparent animate-spin" />
                                      : <Check size={11} />
                                )}
                              </div>
                            </div>
                            {!isOptimistic && (
                              <button
                                onClick={() => deleteMessage(m.id)}
                                className="opacity-0 group-hover:opacity-100 self-center p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                aria-label="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={sendMessage}
                className="p-3 border-t border-slate-200 dark:border-zinc-800 flex items-end gap-2"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  disabled={sending}
                  className="flex-1 resize-none px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 outline-none max-h-32"
                />
                <Button type="submit" loading={sending} disabled={!draft.trim() || sending}>
                  {!sending && <><Send size={14} /> Send</>}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  )
}

/* ─── helpers ─── */
function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date(); const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Today'
  if (dayKey(iso) === dayKey(yest.toISOString()))  return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
function timeOnly(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)        return 'now'
  if (s < 3600)      return `${Math.floor(s / 60)}m`
  if (s < 86400)     return `${Math.floor(s / 3600)}h`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
