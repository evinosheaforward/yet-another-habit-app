import type { TodoItem, CompletedAchievement } from '@yet-another-habit-app/shared-types';
import { getAuthedContext, apiFetch } from '@/api/client';

export async function getTodoItems(): Promise<TodoItem[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ todoItems: TodoItem[] }>('GET', '/todo-items', { token });
  return json.todoItems;
}

export async function addTodoItem(activityId: string): Promise<TodoItem> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ todoItem: TodoItem }>('POST', '/todo-items', {
    token,
    body: { activityId },
  });
  return json.todoItem;
}

export async function removeTodoItem(todoItemId: string): Promise<CompletedAchievement[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ success: boolean; completedAchievements?: CompletedAchievement[] }>(
    'DELETE',
    `/todo-items/${todoItemId}`,
    { token },
  );
  return json.completedAchievements ?? [];
}

export async function reorderTodoItems(orderedIds: string[]): Promise<void> {
  const { token } = await getAuthedContext();
  await apiFetch<{ success: boolean }>('PUT', '/todo-items/reorder', {
    token,
    body: { orderedIds },
  });
}

export async function populateTodoItems(): Promise<TodoItem[]> {
  const { token } = await getAuthedContext();
  const json = await apiFetch<{ todoItems: TodoItem[] }>('POST', '/todo-items/populate', {
    token,
  });
  return json.todoItems;
}
