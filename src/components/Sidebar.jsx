import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { loadJiraSettings, saveJiraSettings, fetchJiraProjects } from '../utils/jiraApi';
import {
    LayoutDashboard, List, Columns3, Layers, CalendarDays,
    Upload, ChevronDown, FolderKanban, Settings, Loader, Cloud, Clock, BarChart3,
} from 'lucide-react';

export default function Sidebar() {
    const { state, dispatch, projectStories, projectSprints, projectEpics } = useStore();
    const [showDropdown, setShowDropdown] = useState(false);
    const [jiraProjects, setJiraProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [projectsLoaded, setProjectsLoaded] = useState(false);

    const jiraSettings = loadJiraSettings();
    const isJiraConfigured = !!(jiraSettings.baseUrl && jiraSettings.bearerToken);
    const selectedProjectKey = jiraSettings.defaultProjectKey;

    // Find project name for display
    const selectedProject = jiraProjects.find(p => p.key === selectedProjectKey);

    // Load Jira projects on mount if configured
    useEffect(() => {
        if (isJiraConfigured) {
            loadProjects();
        }
    }, []);

    const loadProjects = async () => {
        setLoadingProjects(true);
        const result = await fetchJiraProjects(jiraSettings);
        if (result.success) {
            setJiraProjects(result.projects);
            setProjectsLoaded(true);
        }
        setLoadingProjects(false);
    };

    const handleSelectProject = (project) => {
        // Save selected project key as default for the whole system
        const updatedSettings = { ...jiraSettings, defaultProjectKey: project.key };
        saveJiraSettings(updatedSettings);
        setShowDropdown(false);
        // Force re-render by dispatching a notification
        dispatch({ type: 'SET_NOTIFICATION', payload: { message: `✅ Đã chọn dự án: ${project.name} (${project.key})`, type: 'success' } });
        setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 2500);
    };

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'backlog', icon: List, label: 'Backlog' },
        { id: 'board', icon: Columns3, label: 'Board' },
        { id: 'sprints', icon: CalendarDays, label: 'Sprints' },
        { id: 'epics', icon: Layers, label: 'Epics' },
        { id: 'import', icon: Upload, label: 'Import Excel' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">JP</div>
                    <div>
                        <h1>JiraPO</h1>
                        <span>Project Management</span>
                    </div>
                </div>
            </div>

            {/* Project Selector — from Jira API */}
            <div className="project-selector relative">
                <button
                    className="project-selector-btn"
                    onClick={() => {
                        if (!projectsLoaded && isJiraConfigured && !loadingProjects) {
                            loadProjects();
                        }
                        setShowDropdown(!showDropdown);
                    }}
                >
                    <span className="truncate" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isJiraConfigured && <Cloud size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                        {selectedProject
                            ? `${selectedProject.name} (${selectedProject.key})`
                            : selectedProjectKey
                                ? selectedProjectKey
                                : 'Chọn dự án...'
                        }
                    </span>
                    <ChevronDown size={14} />
                </button>

                {showDropdown && (
                    <div className="project-dropdown">
                        {/* Loading */}
                        {loadingProjects && (
                            <div style={{ padding: '16px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                <span className="text-xs text-muted">Đang tải projects...</span>
                            </div>
                        )}

                        {/* Not configured */}
                        {!isJiraConfigured && (
                            <div
                                className="project-dropdown-item"
                                style={{ color: 'var(--text-tertiary)', fontSize: 12 }}
                                onClick={() => {
                                    dispatch({ type: 'SET_PAGE', payload: 'settings' });
                                    setShowDropdown(false);
                                }}
                            >
                                ⚙️ Cấu hình Jira để chọn dự án
                            </div>
                        )}

                        {/* Project list */}
                        {!loadingProjects && jiraProjects.length > 0 && (
                            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                {jiraProjects.map(p => (
                                    <div
                                        key={p.id}
                                        className={`project-dropdown-item ${p.key === selectedProjectKey ? 'active' : ''}`}
                                        onClick={() => handleSelectProject(p)}
                                    >
                                        <span className="truncate">{p.name}</span>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: p.key === selectedProjectKey ? 'var(--accent-primary-hover)' : 'var(--text-tertiary)',
                                            flexShrink: 0,
                                        }}>
                                            {p.key}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty */}
                        {!loadingProjects && projectsLoaded && jiraProjects.length === 0 && (
                            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-tertiary)' }}>
                                Không tìm thấy project nào.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">Menu</div>
                {navItems.map(item => (
                    <div
                        key={item.id}
                        className={`nav-item ${state.currentPage === item.id ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_PAGE', payload: item.id })}
                    >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                    </div>
                ))}
                <div className="nav-section-label">Cấu hình</div>
                <div
                    className={`nav-item ${state.currentPage === 'settings' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}
                >
                    <Settings size={18} />
                    <span>Jira Settings</span>
                </div>
                <div
                    className={`nav-item ${state.currentPage === 'logwork' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'logwork' })}
                >
                    <Clock size={18} />
                    <span>Log Work</span>
                </div>
                <div
                    className={`nav-item ${state.currentPage === 'logworkstats' ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SET_PAGE', payload: 'logworkstats' })}
                >
                    <BarChart3 size={18} />
                    <span>Thống kê Log</span>
                </div>
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div className="text-xs text-muted" style={{ textAlign: 'center' }}>
                    <FolderKanban size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    JiraPO Tool v1.0
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </aside>
    );
}
