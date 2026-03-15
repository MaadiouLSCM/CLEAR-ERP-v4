import React, { useState, useEffect, useRef } from 'react';
import { T, FONTS, getStatusColor } from '../../utils/theme';
import { KPICard, StatusBadge, SectionTitle, EmptyState } from '../Layout/PageShell';
import { getKanban, getOverdueTasks, transitionTask } from '../../utils/api';

const COLUMNS = [
  { key: 'TODO', label: 'To Do', color: T.textDim, icon: '○' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: T.blue, icon: '◐' },
  { key: 'BLOCKED', label: 'Blocked', color: T.red, icon: '⊘' },
  { key: 'DONE', label: 'Done', color: T.green, icon: '●' },
];

const PRIORITY_COLORS = { HIGH: T.red, MEDIUM: T.orange, LOW: T.textDim, URGENT: T.red };
const PRIORITY_LABELS = { HIGH: '↑ High', MEDIUM: '— Med', LOW: '↓ Low', URGENT: '⚡ Urgent' };

// ── Task Card ──
const TaskCard = ({ task, onDragStart, onClick }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div draggable onDragStart={e => { e.dataTransfer.setData('taskId', task.id); e.dataTransfer.setData('fromCol', task.status); onDragStart?.(task); }}
      onClick={() => onClick?.(task)}
      style={{
        background: T.surface, border: `1px solid ${isOverdue ? T.red + '44' : T.border}`,
        borderRadius: 10, padding: 12, cursor: 'grab', transition: 'transform 0.1s, box-shadow 0.1s',
        borderLeft: `3px solid ${PRIORITY_COLORS[task.priority] || T.textDim}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ fontFamily: FONTS.body, fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>{task.title}</div>
      {task.description && <div style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim, marginBottom: 8, lineHeight: 1.4 }}>{task.description.substring(0, 80)}{task.description.length > 80 ? '...' : ''}</div>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {task.job?.ref && (
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.gold, background: T.goldDim, padding: '1px 6px', borderRadius: 4 }}>{task.job.ref}</span>
        )}
        <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: PRIORITY_COLORS[task.priority], background: (PRIORITY_COLORS[task.priority] || T.textDim) + '1F', padding: '1px 6px', borderRadius: 4 }}>
          {PRIORITY_LABELS[task.priority] || task.priority}
        </span>
        {task.taskType && (
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: T.teal, background: T.tealDim, padding: '1px 6px', borderRadius: 4 }}>{task.taskType.replace(/_/g, ' ')}</span>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: T.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONTS.display, fontSize: 8, fontWeight: 700, color: T.gold }}>
            {task.assignee?.name?.[0] || '?'}
          </div>
          <span style={{ fontFamily: FONTS.body, fontSize: 10, color: T.textDim }}>{task.assignee?.name || 'Unassigned'}</span>
        </div>
        {task.dueDate && (
          <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: isOverdue ? T.red : T.textDim }}>
            {isOverdue ? '⚠ ' : ''}{new Date(task.dueDate).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
      {task.blockedByTask && task.status === 'BLOCKED' && (
        <div style={{ marginTop: 6, fontFamily: FONTS.mono, fontSize: 9, color: T.red, background: T.redDim, padding: '3px 6px', borderRadius: 4 }}>
          Blocked by: {task.blockedByTask.title?.substring(0, 30)}
        </div>
      )}
    </div>
  );
};

// ── Kanban Column ──
const KanbanColumn = ({ col, tasks, onDrop, onTaskClick }) => {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div style={{ flex: 1, minWidth: 260 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const taskId = e.dataTransfer.getData('taskId'); const fromCol = e.dataTransfer.getData('fromCol'); if (fromCol !== col.key) onDrop(taskId, col.key); }}
    >
      {/* Column Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: col.color + '12' }}>
        <span style={{ fontSize: 14 }}>{col.icon}</span>
        <span style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: col.color, marginLeft: 'auto', fontWeight: 700 }}>{tasks.length}</span>
      </div>

      {/* Tasks */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        minHeight: 100, padding: 4, borderRadius: 8,
        border: dragOver ? `2px dashed ${col.color}` : '2px dashed transparent',
        background: dragOver ? col.color + '08' : 'transparent',
        transition: 'all 0.15s',
      }}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
        {tasks.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontFamily: FONTS.body, fontSize: 11, color: T.textMuted }}>
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
};

// ── Task Detail Panel ──
const TaskDetailPanel = ({ task, onClose }) => {
  if (!task) return null;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: T.surface, borderLeft: `1px solid ${T.border}`, padding: 24, overflowY: 'auto', zIndex: 100, boxShadow: '-4px 0 20px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 16, fontWeight: 700, color: T.text }}>Task Detail</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ fontFamily: FONTS.body, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>{task.title}</div>
      {task.description && <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim, marginBottom: 16, lineHeight: 1.5 }}>{task.description}</div>}
      {[
        ['Status', <StatusBadge status={task.status} color={COLUMNS.find(c => c.key === task.status)?.color || T.textDim} />],
        ['Priority', <span style={{ color: PRIORITY_COLORS[task.priority] }}>{PRIORITY_LABELS[task.priority]}</span>],
        ['Job', task.job?.ref || '—'],
        ['Assignee', task.assignee?.name || '—'],
        ['Type', task.taskType?.replace(/_/g, ' ') || '—'],
        ['Due Date', task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '—'],
        ['Started', task.startDate ? new Date(task.startDate).toLocaleDateString('fr-FR') : '—'],
        ['Completed', task.completedAt ? new Date(task.completedAt).toLocaleDateString('fr-FR') : '—'],
      ].map(([label, value], i) => (
        <div key={i} style={{ display: 'flex', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim, width: 90, textTransform: 'uppercase' }}>{label}</span>
          <span style={{ fontFamily: FONTS.body, fontSize: 12, color: T.text }}>{value}</span>
        </div>
      ))}
      {isOverdue && (
        <div style={{ marginTop: 16, background: T.redDim, color: T.red, padding: '8px 12px', borderRadius: 8, fontFamily: FONTS.mono, fontSize: 11 }}>
          ⚠ This task is overdue
        </div>
      )}
    </div>
  );
};

// ── MAIN ──
export default function Tasks() {
  const [board, setBoard] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('');

  const load = () => {
    Promise.all([
      getKanban(filterAssignee || undefined).catch(() => null),
      getOverdueTasks().catch(() => []),
    ]).then(([b, o]) => {
      setBoard(b);
      setOverdue(o);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [filterAssignee]);

  const handleDrop = async (taskId, newStatus) => {
    try {
      await transitionTask(taskId, newStatus);
      load();
    } catch (e) {
      alert(`Cannot move task: ${e.message}`);
    }
  };

  if (loading) return <EmptyState icon="☷" title="Loading tasks..." />;
  if (!board) return <EmptyState icon="☷" title="No task data" sub="The task API may not be responding" />;

  const assignees = [...new Set([
    ...(board.TODO || []).map(t => t.assignee?.name),
    ...(board.IN_PROGRESS || []).map(t => t.assignee?.name),
    ...(board.BLOCKED || []).map(t => t.assignee?.name),
    ...(board.DONE || []).map(t => t.assignee?.name),
  ].filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, fontWeight: 700, color: T.text }}>Task Manager</div>
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: T.textDim }}>Kanban board — drag tasks between columns to update status</div>
        </div>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          style={{ padding: '6px 10px', background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontFamily: FONTS.mono, fontSize: 11, outline: 'none' }}>
          <option value="">All Assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard label="Total" value={board.counts?.total || 0} color={T.gold} />
        <KPICard label="To Do" value={board.counts?.todo || 0} color={T.textDim} />
        <KPICard label="In Progress" value={board.counts?.inProgress || 0} color={T.blue} />
        <KPICard label="Blocked" value={board.counts?.blocked || 0} color={T.red} />
        <KPICard label="Done" value={board.counts?.done || 0} color={T.green} />
        <KPICard label="Overdue" value={overdue.length} color={overdue.length > 0 ? T.orange : T.green} />
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div style={{ background: T.redDim, border: `1px solid ${T.red}33`, borderRadius: 12, padding: 12, marginBottom: 20 }}>
          <div style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, color: T.red, marginBottom: 4 }}>
            ⚠ {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: T.textDim }}>
            {overdue.slice(0, 3).map(t => t.title).join(' • ')}{overdue.length > 3 ? ` • +${overdue.length - 3} more` : ''}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.key}
            col={col}
            tasks={board[col.key] || []}
            onDrop={handleDrop}
            onTaskClick={setSelectedTask}
          />
        ))}
      </div>

      {/* Task Detail Slide-over */}
      {selectedTask && <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} />}
      {selectedTask && <div onClick={() => setSelectedTask(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }} />}
    </div>
  );
}
