import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: { jobId?: string; assigneeId?: string; status?: string; taskType?: string }) {
    return this.prisma.task.findMany({
      where: {
        ...(filters.jobId && { jobId: filters.jobId }),
        ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.taskType && { taskType: filters.taskType as any }),
      },
      include: { job: true, assignee: true, blockedByTask: true, renewalInstance: true },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { job: true, assignee: true, createdBy: true, blockedByTask: true, blockingTasks: true, renewalInstance: true },
    });
    if (!task) throw new NotFoundException();
    return task;
  }

  async create(data: any) {
    return this.prisma.task.create({ data, include: { assignee: true } });
  }

  async update(id: string, data: any) {
    const updated = await this.prisma.task.update({ where: { id }, data });
    if (data.status === 'DONE') {
      await this.prisma.task.update({ where: { id }, data: { completedAt: new Date() } });
      await this.unblockDependents(id);
    }
    return updated;
  }

  async transition(id: string, status: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { blockedByTask: true } });
    if (!task) throw new NotFoundException();
    if (status === 'IN_PROGRESS' && task.blockedByTask && task.blockedByTask.status !== 'DONE') {
      throw new Error(`Task blocked by: ${task.blockedByTask.title}`);
    }
    const data: any = { status: status as any };
    if (status === 'DONE') data.completedAt = new Date();
    if (status === 'IN_PROGRESS' && !task.startDate) data.startDate = new Date();
    const updated = await this.prisma.task.update({ where: { id }, data });
    if (status === 'DONE') await this.unblockDependents(id);
    return updated;
  }

  private async unblockDependents(taskId: string) {
    const blocked = await this.prisma.task.findMany({ where: { blockedByTaskId: taskId, status: 'BLOCKED' } });
    for (const t of blocked) {
      await this.prisma.task.update({ where: { id: t.id }, data: { status: 'TODO' } });
    }
  }

  async kanbanBoard(assigneeId?: string) {
    const where = assigneeId ? { assigneeId } : {};
    const tasks = await this.prisma.task.findMany({
      where, include: { job: true, assignee: true },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });
    return {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED'),
      DONE: tasks.filter(t => t.status === 'DONE'),
      counts: { total: tasks.length, todo: tasks.filter(t => t.status === 'TODO').length, inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length, blocked: tasks.filter(t => t.status === 'BLOCKED').length, done: tasks.filter(t => t.status === 'DONE').length },
    };
  }

  async overdue() {
    return this.prisma.task.findMany({
      where: { status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: new Date() } },
      include: { job: true, assignee: true },
      orderBy: { dueDate: 'asc' },
    });
  }
}
