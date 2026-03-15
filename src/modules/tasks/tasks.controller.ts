import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get() @ApiOperation({ summary: 'List tasks with filters' })
  findAll(@Query() q) { return this.svc.findAll(q); }

  @Get('kanban') @ApiOperation({ summary: 'Kanban board (grouped by status)' })
  kanban(@Query('assigneeId') assigneeId?: string) { return this.svc.kanbanBoard(assigneeId); }

  @Get('overdue') @ApiOperation({ summary: 'All overdue tasks' })
  overdue() { return this.svc.overdue(); }

  @Get(':id') @ApiOperation({ summary: 'Get task with dependencies' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @ApiOperation({ summary: 'Create task' })
  create(@Body() data) { return this.svc.create(data); }

  @Patch(':id') @ApiOperation({ summary: 'Update task' })
  update(@Param('id') id: string, @Body() data) { return this.svc.update(id, data); }

  @Post(':id/transition') @ApiOperation({ summary: 'Transition task status' })
  transition(@Param('id') id: string, @Body() body: { status: string }) { return this.svc.transition(id, body.status); }
}
