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
    interactive: true,
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
    interactive: true,
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

  {
    id: 'todo-schedule-tasks',
    section: 'todo',
    sectionTitle: 'Todo List',
    screen: '/(tabs)/todo',
    targetKey: 'schedule-btn',
    title: 'Scheduled Tasks',
    description:
      "You can also add tasks to your weekly schedule. They'll only show up the next time that day of the week comes around.",
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
    id: 'schedule-day-info',
    section: 'schedule',
    sectionTitle: 'Todo Schedule',
    screen: '/todo-settings',
    targetKey: 'day-selector',
    title: 'Day-Specific Schedule',
    description:
      'Each day has its own list. Habits and tasks you add here only appear on your todo for that specific day of the week.',
    position: 'below',
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
    interactive: true,
  },

  {
    id: 'achievements-intro',
    section: 'achievements',
    sectionTitle: 'Achievements',
    screen: '/(tabs)/achievements',
    targetKey: 'achievements-header',
    title: 'Your Rewards',
    description:
      'Create achievements to set goals and rewards for yourself. Track progress on individual habits, time periods, or todo completions.',
    position: 'below',
  },
  {
    id: 'achievements-create',
    section: 'achievements',
    sectionTitle: 'Achievements',
    screen: '/(tabs)/achievements',
    targetKey: 'create-achievement-btn',
    title: 'Create an Achievement',
    description:
      'Tap here to create your first achievement. Pick a type (Habit, Period, or Todo), set a goal count, and optionally add a reward for yourself!',
    position: 'below',
    interactive: true,
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
  {
    id: 'history-detail',
    section: 'history',
    sectionTitle: 'Tracking Progress',
    screen: '/activity/[id]',
    targetKey: 'detailed-history-btn',
    title: 'Detailed History',
    description:
      "View a full calendar or chart of your progress. Tap here to explore your activity's history!",
    position: 'below',
    hookTrigger: 'first-habit-created',
  },
];
