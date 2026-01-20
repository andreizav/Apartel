import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, StaffTask } from '../../services/data.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full flex flex-col p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold font-display text-white">Tasks & Operations</h1>
          <p class="text-slate-400 text-sm">Manage staff assignments and unit status</p>
        </div>
        <button class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-brand-900/50 flex items-center gap-2">
            <span class="material-symbols-rounded">add_task</span> Create Task
        </button>
      </div>

      <!-- Kanban Columns -->
      <div class="flex-1 overflow-x-auto">
         <div class="flex gap-6 h-full min-w-[1000px]">
            <!-- To Do -->
            <div class="flex-1 bg-dark-800 rounded-xl p-4 flex flex-col border border-dark-700">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-200">To Do</h3>
                    <span class="bg-dark-700 text-slate-400 px-2 py-0.5 rounded text-xs font-bold">{{ todoTasks().length }}</span>
                </div>
                <div class="space-y-3 overflow-y-auto flex-1 pr-2">
                    @for (task of todoTasks(); track task.id) {
                        <div class="bg-dark-900 p-4 rounded-lg border border-dark-700 hover:border-brand-500/50 transition-colors shadow-sm cursor-pointer group">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" 
                                    [class.bg-purple-500-10]="task.type === 'cleaning'"
                                    [class.text-purple-400]="task.type === 'cleaning'"
                                    [class.bg-amber-500-10]="task.type === 'maintenance'"
                                    [class.text-amber-400]="task.type === 'maintenance'">
                                    {{ task.type }}
                                </span>
                                @if (task.priority === 'high') {
                                    <span class="material-symbols-rounded text-red-500 text-sm">priority_high</span>
                                }
                            </div>
                            <h4 class="font-bold text-white mb-1">{{ task.title }}</h4>
                            <p class="text-sm text-slate-400 mb-3">{{ task.unitName }}</p>
                            <div class="flex items-center justify-between pt-3 border-t border-dark-800">
                                <div class="flex items-center gap-2">
                                    <div class="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                        {{ task.assignee.charAt(0) }}
                                    </div>
                                    <span class="text-xs text-slate-300">{{ task.assignee }}</span>
                                </div>
                                <span class="material-symbols-rounded text-slate-600 group-hover:text-brand-500">drag_indicator</span>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- In Progress -->
            <div class="flex-1 bg-dark-800 rounded-xl p-4 flex flex-col border border-dark-700">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-200">In Progress</h3>
                    <span class="bg-brand-900/50 text-brand-400 px-2 py-0.5 rounded text-xs font-bold">{{ progressTasks().length }}</span>
                </div>
                <div class="space-y-3 overflow-y-auto flex-1 pr-2">
                    @for (task of progressTasks(); track task.id) {
                         <div class="bg-dark-900 p-4 rounded-lg border border-l-4 border-l-brand-500 border-y-dark-700 border-r-dark-700 shadow-md">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                                    {{ task.type }}
                                </span>
                            </div>
                            <h4 class="font-bold text-white mb-1">{{ task.title }}</h4>
                            <p class="text-sm text-slate-400 mb-3">{{ task.unitName }}</p>
                            <div class="w-full bg-dark-700 h-1.5 rounded-full mb-3 overflow-hidden">
                                <div class="bg-brand-500 h-full rounded-full" style="width: 60%"></div>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-slate-400">
                                     {{ task.assignee.charAt(0) }}
                                </div>
                                <span class="text-xs text-slate-300">{{ task.assignee }} is working...</span>
                            </div>
                        </div>
                    }
                </div>
            </div>

            <!-- Done -->
            <div class="flex-1 bg-dark-800 rounded-xl p-4 flex flex-col border border-dark-700 opacity-80 hover:opacity-100 transition-opacity">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-200">Done (Review)</h3>
                    <span class="bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold">{{ doneTasks().length }}</span>
                </div>
                <div class="space-y-3 overflow-y-auto flex-1 pr-2">
                    @for (task of doneTasks(); track task.id) {
                        <div class="bg-dark-900 p-4 rounded-lg border border-dark-700">
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded text-slate-500 line-through">
                                    {{ task.type }}
                                </span>
                                <span class="material-symbols-rounded text-emerald-500">check_circle</span>
                            </div>
                            <h4 class="font-bold text-slate-400 line-through mb-1">{{ task.title }}</h4>
                            <p class="text-sm text-slate-600 mb-2">{{ task.unitName }}</p>
                            <div class="flex justify-end">
                                <button class="text-xs font-bold text-brand-500 hover:text-brand-400">Approve Payout</button>
                            </div>
                        </div>
                    }
                </div>
            </div>
         </div>
      </div>
    </div>
  `
})
export class TasksComponent {
  dataService = inject(DataService);
  tasks = this.dataService.tasks;

  todoTasks = computed(() => this.tasks().filter(t => t.status === 'todo'));
  progressTasks = computed(() => this.tasks().filter(t => t.status === 'progress'));
  doneTasks = computed(() => this.tasks().filter(t => t.status === 'done'));
}