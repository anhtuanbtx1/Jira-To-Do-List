import React, { useState, useEffect } from 'react';
import { useStore } from '../data/store';
import { loadJiraSettings, saveJiraSettings, fetchJiraProjects } from '../utils/jiraApi';
import { Cloud, ChevronDown, Loader } from 'lucide-react';

export default function JiraProjectSelector() {
    const { dispatch } = useStore();
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
    }, [isJiraConfigured]);

    const loadProjects = async () => {
        setLoadingProjects(true);
        const result = await fetchJiraProjects(jiraSettings);
        if (result.success) {
            setJiraProjects(result.projects);
            setProjectsLoaded(true);
        }
        setLoadingProjects(false);
    };

    const handleSelectProject = async (project) => {
        // Save selected project key as default for the whole system
        const updatedSettings = { ...jiraSettings, defaultProjectKey: project.key };
        saveJiraSettings(updatedSettings);

        // Also save to environment variables if in development
        if (import.meta.env.DEV) {
            try {
                await fetch('/api/save-env', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedSettings),
                });
            } catch (err) {
                console.error('Failed to save configuration to environment variables', err);
            }
        }

        setShowDropdown(false);
        // Force re-render by dispatching a notification
        dispatch({ type: 'SET_NOTIFICATION', payload: { message: `✅ Đã chọn dự án Jira: ${project.name} (${project.key})`, type: 'success' } });
        setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), 2500);
    };

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = () => setShowDropdown(false);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="project-selector relative" onClick={e => e.stopPropagation()}>
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
                <ChevronDown size={14} style={{ flexShrink: 0 }} />
            </button>

            {showDropdown && (
                <div className="project-dropdown" style={{ left: 'auto', right: 0, minWidth: 280 }}>
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
                                    title={`${p.name} (${p.key})`}
                                >
                                    <span className="truncate" style={{ marginRight: 12 }}>{p.name}</span>
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
    );
}
