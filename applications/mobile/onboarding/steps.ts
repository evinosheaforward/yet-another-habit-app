export type OnboardingStep = {
  id: string;
  section: string;
  sectionTitle: string;
  screen: string;
  targetKey: string;
  title: string;
  description: string;
  position: 'above' | 'below';
  interactive?: boolean;
  hookTrigger?: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Section: welcome
  {
    id: 'welcome-day-end',
    section: 'welcome',
    sectionTitle: 'Getting Started',
    screen: '/(tabs)',
    targetKey: 'day-end-card',
    title: 'Set Your Day End',
    description: 'Set when your day ends. This determines when daily/weekly/monthly habits reset.',
    position: 'below',
    interactive: true,
  },

  // Section: habits
  {
    id: 'habits-tab',
    section: 'habits',
    sectionTitle: 'Creating Habits',
    screen: '/(tabs)',
    targetKey: 'activities-tab',
    title: 'Activities Tab',
    description: 'This is where you manage your habits and tasks.',
    position: 'above',
  },
  {
    id: 'habits-create',
    section: 'habits',
    sectionTitle: 'Creating Habits',
    screen: '/(tabs)/activities',
    targetKey: 'create-activity-btn',
    title: 'Create a Habit',
    description: 'Create your first habit! Tap the + button to get started.',
    position: 'below',
    interactive: true,
  },
  {
    id: 'habits-stacking',
    section: 'habits',
    sectionTitle: 'Creating Habits',
    screen: '/(tabs)/activities',
    targetKey: 'stacking-info',
    title: 'Habit Stacking',
    description: 'You can stack habits \u2014 when you complete one, it reminds you to do the next.',
    position: 'below',
  },

  // Section: history
  {
    id: 'history-intro',
    section: 'history',
    sectionTitle: 'Tracking Progress',
    screen: '/(tabs)/activities',
    targetKey: 'history-btn',
    title: 'Activity History',
    description: 'Tap any activity to see your history as a calendar or chart.',
    position: 'below',
  },

  // Section: todo
  {
    id: 'todo-tab',
    section: 'todo',
    sectionTitle: 'Todo List',
    screen: '/(tabs)/activities',
    targetKey: 'todo-tab',
    title: 'Todo List',
    description:
      'Your todo list integrates habits and tasks. Complete items here to track progress.',
    position: 'above',
  },
  {
    id: 'todo-add',
    section: 'todo',
    sectionTitle: 'Todo List',
    screen: '/(tabs)/todo',
    targetKey: 'todo-add-btn',
    title: 'Add Items',
    description: 'Add habits or tasks to today\u2019s list.',
    position: 'below',
  },
  {
    id: 'todo-complete',
    section: 'todo',
    sectionTitle: 'Todo List',
    screen: '/(tabs)/todo',
    targetKey: 'todo-complete-info',
    title: 'Completing Items',
    description:
      'Completing a habit increments its count. Completing a task deletes or archives it.',
    position: 'below',
  },
  {
    id: 'todo-create-task',
    section: 'todo',
    sectionTitle: 'Todo List',
    screen: '/(tabs)/todo',
    targetKey: 'todo-add-btn',
    title: 'Quick Tasks',
    description: 'You can create one-off tasks right from the Add menu.',
    position: 'below',
  },

  // Section: schedule
  {
    id: 'schedule-btn',
    section: 'schedule',
    sectionTitle: 'Todo Schedule',
    screen: '/(tabs)/todo',
    targetKey: 'schedule-btn',
    title: 'Weekly Schedule',
    description: 'Set up a weekly schedule so habits auto-populate your todo list each day.',
    position: 'below',
    interactive: true,
  },
  {
    id: 'schedule-add',
    section: 'schedule',
    sectionTitle: 'Todo Schedule',
    screen: '/todo-settings',
    targetKey: 'schedule-add-btn',
    title: 'Add to Schedule',
    description: "Add habits to each day of the week. They'll repeat every week!",
    position: 'below',
  },
  {
    id: 'schedule-clear',
    section: 'schedule',
    sectionTitle: 'Todo Schedule',
    screen: '/todo-settings',
    targetKey: 'clear-toggle',
    title: 'Clear Settings',
    description:
      'Toggle this to control whether your todo list resets each day or keeps leftovers.',
    position: 'above',
  },

  // Section: achievements
  {
    id: 'achievements-tab',
    section: 'achievements',
    sectionTitle: 'Achievements',
    screen: '/(tabs)/todo',
    targetKey: 'achievements-tab',
    title: 'Achievements',
    description: 'Earn achievements by completing habits and todos. Check your progress here!',
    position: 'above',
  },

  // Contextual hook steps (not in linear flow)
  {
    id: 'archive-intro',
    section: 'archive',
    sectionTitle: 'Archive',
    screen: '/(tabs)/archive',
    targetKey: 'archive-tab',
    title: 'Archive',
    description:
      'Archived items live here. Their history is preserved until you permanently delete them.',
    position: 'above',
    hookTrigger: 'first-archive',
  },
];
