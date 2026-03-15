import React from 'react';
import { T, FONTS } from '../../utils/theme';
import { SectionTitle, EmptyState } from '../Layout/PageShell';
import { api } from '../../utils/api';

const K = { bg: T.surface, bd: `1px solid ${T.border}`, br: 12, p: 20 };
const card = { background: K.bg, border: K.bd, borderRadius: K.br, padding: K.p };

const VIEWS = ['Dashboard', 'Emails', 'Templates', 'Notifications'];
const CH_COLORS = { EMAIL: T.blue, WHATSAPP: T.green, SYSTEM: T.gold };
const ST_COLORS = { SENT: T.green, SAVED: T.blue, FAILED: T.red, QUEUED: T.orange };
const PRI_COLORS = { URGENT: T.red, HIGH: T.orange, NORMAL: T.blue, LOW: T.textDim };

export default function Communications() {
  const [view, setView] = React.useState('Dashboard');
  const [dash, setDash] = React.useState(null);
  const [emails, setEmails] = React.useState(null);
  const [templates, setTemplates] = React.useState(null);
  const [notifs, setNotifs] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [emailPage, setEmailPage] = React.useState(1);
  const [channelFilter, setChannelFilter] = React.useState('');
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [compose, setCompose] = React.useState({ toAddress: '', subject: '', body: '' });

  React.useEffect(() => { loadData(); }, [view, emailPage, channelFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'Dashboard') setDash(await api.get('/communications/dashboard'));
      if (view === 'Emails') setEmails(await api.get(`/emails?page=${emailPage}&limit=20${channelFilter ? '&channel=' + channelFilter : ''}`));
      if (view === 'Templates') setTemplates(await api.get('/communications/templates'));
      if (view === 'Notifications') setNotifs(await api.get('/notifications'));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const sendManual = async () => {
    if (!compose.toAddress || !compose.subject) return;
    try { await api.post('/emails', compose); setComposeOpen(false); setCompose({ toAddress: '', subject: '', body: '' }); loadData(); } catch (e) { alert(e.message); }
  };

  const retryFailed = async () => {
    try { const r = await api.post('/emails/retry-failed', {}); alert(`Retried ${r.retried} of ${r.total} failed emails`); loadData(); } catch (e) { alert(e.message); }
  };

  const markAllRead = async () => {
    try { await api.post('/notifications/read-all', {}); loadData(); } catch (e) { console.error(e); }
  };

  const Badge = ({ color, children }) => (
    <span style={{ background: color + '20', color, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: FONTS.mono }}>{children}</span>
  );

  // ── Dashboard View ──
  const DashView = () => {
    if (!dash) return <EmptyState icon="◱" title="Loading..." sub="" />;
    const kpis = [
      { label: 'Emails Sent', value: dash.totalEmails, icon: '✉', color: T.blue },
      { label: 'WhatsApp', value: dash.totalWhatsApp, icon: '💬', color: T.green },
      { label: 'Notifications', value: dash.totalNotifications, icon: '🔔', color: T.gold },
      { label: 'Sent Today', value: dash.sentToday, icon: '📤', color: T.teal },
      { label: 'Failed', value: dash.failedCount, icon: '⚠', color: T.red },
    ];
    return (<>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{k.icon}</div>
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={card}>
          <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Recent Communications</div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {(dash.recent || []).map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < dash.recent.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <Badge color={CH_COLORS[e.channel] || T.textDim}>{e.channel}</Badge>
                <Badge color={ST_COLORS[e.status] || T.textDim}>{e.status}</Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>→ {e.toAddress} {e.job ? `| ${e.job.ref}` : ''}</div>
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textMuted }}>{new Date(e.sentAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 10 }}>By Status</div>
            {(dash.byStatus || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Badge color={ST_COLORS[s.status] || T.textDim}>{s.status}</Badge>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.text }}>{s._count.id}</span>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 10 }}>Top Templates</div>
            {(dash.byTemplate || []).slice(0, 8).map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>{t.templateRef}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: T.gold }}>{t._count.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>);
  };

  // ── Emails View ──
  const EmailsView = () => {
    if (!emails) return <EmptyState icon="✉" title="Loading..." sub="" />;
    return (<>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        {['', 'EMAIL', 'WHATSAPP'].map(ch => (
          <button key={ch} onClick={() => { setChannelFilter(ch); setEmailPage(1); }}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${channelFilter === ch ? T.gold : T.border}`, background: channelFilter === ch ? T.goldDim : 'transparent', color: channelFilter === ch ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 12, cursor: 'pointer' }}>
            {ch || 'All'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setComposeOpen(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Compose</button>
        <button onClick={retryFailed} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.red}`, background: T.redDim, color: T.red, fontFamily: FONTS.body, fontSize: 12, cursor: 'pointer' }}>↻ Retry Failed</button>
      </div>
      <div style={card}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, marginBottom: 8 }}>Page {emails.page} of {emails.pages} — {emails.total} total</div>
        {(emails.items || []).map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <Badge color={CH_COLORS[e.channel] || T.textDim}>{e.channel}</Badge>
            <Badge color={ST_COLORS[e.status] || T.textDim}>{e.status}</Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>To: {e.toAddress} | Template: {e.templateRef} {e.job ? `| Job: ${e.job.ref}` : ''}</div>
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textMuted, whiteSpace: 'nowrap' }}>{new Date(e.sentAt).toLocaleString('en-GB')}</div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
          <button disabled={emailPage <= 1} onClick={() => setEmailPage(emailPage - 1)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', fontFamily: FONTS.body, fontSize: 12 }}>← Prev</button>
          <button disabled={emailPage >= emails.pages} onClick={() => setEmailPage(emailPage + 1)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, cursor: 'pointer', fontFamily: FONTS.body, fontSize: 12 }}>Next →</button>
        </div>
      </div>
    </>);
  };

  // ── Templates View ──
  const TemplatesView = () => {
    if (!templates) return <EmptyState icon="📋" title="Loading..." sub="" />;
    return (<>
      <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: T.textDim, marginBottom: 12 }}>{templates.total} templates configured</div>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Status Templates ({templates.statusTemplates.length})</div>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {templates.statusTemplates.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
              <Badge color={T.gold}>{t.trigger}</Badge>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.teal }}>{t.code}</span>
              <div style={{ flex: 1, fontFamily: FONTS.body, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
              {t.channels.map(ch => <Badge key={ch} color={CH_COLORS[ch] || T.textDim}>{ch}</Badge>)}
              <Badge color={PRI_COLORS[t.priority] || T.textDim}>{t.priority}</Badge>
            </div>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>Operational Templates ({templates.operationalTemplates.length})</div>
        {templates.operationalTemplates.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
            <Badge color={T.purple}>{t.trigger}</Badge>
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.teal }}>{t.code}</span>
            <div style={{ flex: 1, fontFamily: FONTS.body, fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
            {t.channels.map(ch => <Badge key={ch} color={CH_COLORS[ch] || T.textDim}>{ch}</Badge>)}
          </div>
        ))}
      </div>
    </>);
  };

  // ── Notifications View ──
  const NotifsView = () => {
    if (!notifs) return <EmptyState icon="🔔" title="Loading..." sub="" />;
    return (<>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={markAllRead} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${T.gold}`, background: T.goldDim, color: T.gold, fontFamily: FONTS.body, fontSize: 12, cursor: 'pointer' }}>✓ Mark All Read</button>
      </div>
      <div style={card}>
        {notifs.length === 0 ? <EmptyState icon="✓" title="All caught up" sub="No unread notifications" /> :
          notifs.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}`, opacity: n.isRead ? 0.5 : 1 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.isRead ? 'transparent' : T.gold, marginTop: 6, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: T.text, fontWeight: n.isRead ? 400 : 600 }}>{n.title}</div>
                {n.body && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: T.textDim, marginTop: 4 }}>{n.body.substring(0, 150)}</div>}
                <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textMuted, marginTop: 4 }}>
                  {n.type} {n.jobRef ? `| ${n.jobRef}` : ''} | {new Date(n.createdAt).toLocaleString('en-GB')}
                </div>
              </div>
            </div>
          ))}
      </div>
    </>);
  };

  // ── Compose Modal ──
  const ComposeModal = () => composeOpen ? (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={() => setComposeOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, padding: 24, width: 500, border: `1px solid ${T.border}` }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Compose Email</div>
        {['toAddress', 'subject'].map(f => (
          <input key={f} placeholder={f === 'toAddress' ? 'To (email)' : 'Subject'}
            value={compose[f]} onChange={e => setCompose({ ...compose, [f]: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', marginBottom: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, boxSizing: 'border-box' }} />
        ))}
        <textarea placeholder="Body (HTML supported)" value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })}
          rows={6} style={{ width: '100%', padding: '10px 12px', marginBottom: 16, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontFamily: FONTS.body, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setComposeOpen(false)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, fontFamily: FONTS.body, cursor: 'pointer' }}>Cancel</button>
          <button onClick={sendManual} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: T.gold, color: '#000', fontFamily: FONTS.body, fontWeight: 600, cursor: 'pointer' }}>Send</button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>◱</span>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Communications Hub</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>55+ templates • Email / WhatsApp / System • Auto-trigger on status transitions</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {VIEWS.map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${view === v ? T.gold : T.border}`, background: view === v ? T.goldDim : 'transparent', color: view === v ? T.gold : T.textDim, fontFamily: FONTS.body, fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
            {v}
          </button>
        ))}
      </div>
      {loading && !dash && !emails && !templates && !notifs ? <EmptyState icon="◱" title="Loading..." sub="" /> : null}
      {view === 'Dashboard' && <DashView />}
      {view === 'Emails' && <EmailsView />}
      {view === 'Templates' && <TemplatesView />}
      {view === 'Notifications' && <NotifsView />}
      <ComposeModal />
    </div>
  );
}
