import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { createProject, createEpic, createUserStory, createSprint } from './models';

const StoreContext = createContext(null);

const STORAGE_KEY = 'jirapo_data';

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch (e) { console.error('Failed to load data', e); }
    return null;
}

function saveToStorage(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            projects: state.projects,
            currentProjectId: state.currentProjectId,
            epics: state.epics,
            stories: state.stories,
            sprints: state.sprints,
        }));
    } catch (e) { console.error('Failed to save data', e); }
}

const initialState = {
    projects: [],
    currentProjectId: null,
    epics: [],
    stories: [],
    sprints: [],
    currentPage: 'dashboard',
    editingStory: null,
    editingEpic: null,
    editingSprint: null,
    showStoryModal: false,
    showEpicModal: false,
    showSprintModal: false,
    showProjectModal: false,
    notification: null,
};

function reducer(state, action) {
    switch (action.type) {
        // ===== NAVIGATION =====
        case 'SET_PAGE':
            return { ...state, currentPage: action.payload };

        // ===== NOTIFICATIONS =====
        case 'SET_NOTIFICATION':
            return { ...state, notification: action.payload };
        case 'CLEAR_NOTIFICATION':
            return { ...state, notification: null };

        // ===== PROJECTS =====
        case 'ADD_PROJECT': {
            const project = createProject(action.payload.name, action.payload.description);
            return { ...state, projects: [...state.projects, project], currentProjectId: project.id, showProjectModal: false };
        }
        case 'SET_CURRENT_PROJECT':
            return { ...state, currentProjectId: action.payload };
        case 'DELETE_PROJECT': {
            const id = action.payload;
            return {
                ...state,
                projects: state.projects.filter(p => p.id !== id),
                currentProjectId: state.currentProjectId === id ? (state.projects.find(p => p.id !== id)?.id || null) : state.currentProjectId,
                epics: state.epics.filter(e => e.projectId !== id),
                stories: state.stories.filter(s => s.projectId !== id),
                sprints: state.sprints.filter(sp => sp.projectId !== id),
            };
        }
        case 'TOGGLE_PROJECT_MODAL':
            return { ...state, showProjectModal: !state.showProjectModal };

        // ===== EPICS =====
        case 'ADD_EPIC': {
            const epic = { ...createEpic(action.payload.title, action.payload.description, action.payload.color), projectId: state.currentProjectId };
            return { ...state, epics: [...state.epics, epic], showEpicModal: false, editingEpic: null };
        }
        case 'UPDATE_EPIC':
            return { ...state, epics: state.epics.map(e => e.id === action.payload.id ? { ...e, ...action.payload } : e), showEpicModal: false, editingEpic: null };
        case 'DELETE_EPIC': {
            const epicId = action.payload;
            return {
                ...state,
                epics: state.epics.filter(e => e.id !== epicId),
                stories: state.stories.map(s => s.epicId === epicId ? { ...s, epicId: null } : s),
            };
        }
        case 'EDIT_EPIC':
            return { ...state, editingEpic: action.payload, showEpicModal: true };
        case 'TOGGLE_EPIC_MODAL':
            return { ...state, showEpicModal: !state.showEpicModal, editingEpic: state.showEpicModal ? null : state.editingEpic };

        // ===== STORIES =====
        case 'ADD_STORY': {
            const story = { ...createUserStory(action.payload), projectId: state.currentProjectId };
            return { ...state, stories: [...state.stories, story], showStoryModal: false, editingStory: null };
        }
        case 'ADD_STORIES_BULK': {
            const newStories = action.payload.map(s => ({ ...createUserStory(s), projectId: state.currentProjectId }));
            return { ...state, stories: [...state.stories, ...newStories] };
        }
        case 'UPDATE_STORY':
            return { ...state, stories: state.stories.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s), showStoryModal: false, editingStory: null };
        case 'DELETE_STORY':
            return { ...state, stories: state.stories.filter(s => s.id !== action.payload) };
        case 'MOVE_STORY_STATUS':
            return { ...state, stories: state.stories.map(s => s.id === action.payload.id ? { ...s, status: action.payload.status } : s) };
        case 'ASSIGN_STORY_TO_SPRINT':
            return { ...state, stories: state.stories.map(s => s.id === action.payload.storyId ? { ...s, sprintId: action.payload.sprintId } : s) };
        case 'UNASSIGN_STORY_FROM_SPRINT':
            return { ...state, stories: state.stories.map(s => s.id === action.payload ? { ...s, sprintId: null } : s) };
        case 'EDIT_STORY':
            return { ...state, editingStory: action.payload, showStoryModal: true };
        case 'TOGGLE_STORY_MODAL':
            return { ...state, showStoryModal: !state.showStoryModal, editingStory: state.showStoryModal ? null : state.editingStory };

        // ===== SPRINTS =====
        case 'ADD_SPRINT': {
            const sprint = { ...createSprint(action.payload.name, action.payload.goal, action.payload.startDate, action.payload.endDate), projectId: state.currentProjectId };
            return { ...state, sprints: [...state.sprints, sprint], showSprintModal: false, editingSprint: null };
        }
        case 'UPDATE_SPRINT':
            return { ...state, sprints: state.sprints.map(sp => sp.id === action.payload.id ? { ...sp, ...action.payload } : sp), showSprintModal: false, editingSprint: null };
        case 'DELETE_SPRINT': {
            const sprintId = action.payload;
            return {
                ...state,
                sprints: state.sprints.filter(sp => sp.id !== sprintId),
                stories: state.stories.map(s => s.sprintId === sprintId ? { ...s, sprintId: null } : s),
            };
        }
        case 'START_SPRINT':
            return { ...state, sprints: state.sprints.map(sp => sp.id === action.payload ? { ...sp, status: 'Active' } : sp) };
        case 'COMPLETE_SPRINT':
            return { ...state, sprints: state.sprints.map(sp => sp.id === action.payload ? { ...sp, status: 'Completed' } : sp) };
        case 'EDIT_SPRINT':
            return { ...state, editingSprint: action.payload, showSprintModal: true };
        case 'TOGGLE_SPRINT_MODAL':
            return { ...state, showSprintModal: !state.showSprintModal, editingSprint: state.showSprintModal ? null : state.editingSprint };

        // ===== HYDRATE =====
        case 'HYDRATE':
            return { ...state, ...action.payload };

        default:
            return state;
    }
}

export function StoreProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        const saved = loadFromStorage();
        if (saved) {
            dispatch({ type: 'HYDRATE', payload: saved });
        }
    }, []);

    useEffect(() => {
        if (state.projects.length > 0 || state.stories.length > 0) {
            saveToStorage(state);
        }
    }, [state.projects, state.currentProjectId, state.epics, state.stories, state.sprints]);

    const notify = useCallback((message, type = 'success') => {
        dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });
        setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 3000);
    }, []);

    // ===== SELECTORS =====
    const currentProject = state.projects.find(p => p.id === state.currentProjectId) || null;
    const projectEpics = state.epics.filter(e => e.projectId === state.currentProjectId);
    const projectStories = state.stories.filter(s => s.projectId === state.currentProjectId);
    const projectSprints = state.sprints.filter(sp => sp.projectId === state.currentProjectId);
    const backlogStories = projectStories.filter(s => !s.sprintId);
    const activeSprint = projectSprints.find(sp => sp.status === 'Active') || null;

    const getEpicById = useCallback((id) => state.epics.find(e => e.id === id), [state.epics]);
    const getSprintById = useCallback((id) => state.sprints.find(sp => sp.id === id), [state.sprints]);
    const getStoriesByEpic = useCallback((epicId) => projectStories.filter(s => s.epicId === epicId), [projectStories]);
    const getStoriesBySprint = useCallback((sprintId) => projectStories.filter(s => s.sprintId === sprintId), [projectStories]);

    const value = {
        state, dispatch, notify,
        currentProject, projectEpics, projectStories, projectSprints,
        backlogStories, activeSprint,
        getEpicById, getSprintById, getStoriesByEpic, getStoriesBySprint,
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}
