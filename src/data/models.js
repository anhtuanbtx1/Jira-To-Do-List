import { v4 as uuidv4 } from 'uuid';

// ==================== ENUMS ====================
export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const STORY_STATUS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const SPRINT_STATUS = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

export const EPIC_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

// ==================== COLORS ====================
export const EPIC_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#0ea5e9',
];

// ==================== FACTORIES ====================
export function createProject(name, description = '') {
  return {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString(),
  };
}

export function createEpic(title, description = '', color = null) {
  return {
    id: uuidv4(),
    title,
    description,
    color: color || EPIC_COLORS[Math.floor(Math.random() * EPIC_COLORS.length)],
    status: EPIC_STATUS.OPEN,
    createdAt: new Date().toISOString(),
  };
}

export function createUserStory({
  title,
  description = '',
  asA = '',
  iWantTo = '',
  soThat = '',
  epicId = null,
  sprintId = null,
  status = STORY_STATUS.TODO,
  priority = PRIORITY.MEDIUM,
  points = 0,
  acceptanceCriteria = '',
  assignee = '',
} = {}) {
  return {
    id: uuidv4(),
    title,
    description,
    asA,
    iWantTo,
    soThat,
    epicId,
    sprintId,
    status,
    priority,
    points,
    acceptanceCriteria,
    assignee,
    createdAt: new Date().toISOString(),
  };
}

export function createSprint(name, goal = '', startDate = null, endDate = null) {
  const start = startDate || new Date().toISOString().split('T')[0];
  const end = endDate || (() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  })();
  return {
    id: uuidv4(),
    name,
    goal,
    startDate: start,
    endDate: end,
    status: SPRINT_STATUS.PLANNING,
    createdAt: new Date().toISOString(),
  };
}
