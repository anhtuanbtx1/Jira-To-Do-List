import React, { useState, useRef } from 'react';
import { useStore } from '../data/store';
import { parseExcelFile, generateSampleExcel } from '../utils/excelParser';
import { loadJiraSettings, importStoriesToJira } from '../utils/jiraApi';
import { Upload, FileSpreadsheet, Download, Check, AlertCircle, Loader, Send, Settings, CheckCircle, XCircle } from 'lucide-react';

export default function ImportPage() {
    const { dispatch, notify, projectEpics } = useStore();
    const fileInputRef = useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Jira import state
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(null);
    const [importResult, setImportResult] = useState(null);

    // Read fresh from localStorage each time this component mounts
    const jiraSettings = loadJiraSettings();
    const isJiraConfigured = !!(jiraSettings.baseUrl && jiraSettings.bearerToken);

    const handleFile = async (file) => {
        if (!file) return;
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.xlsx?$/i)) {
            setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        setImportResult(null);
        const startTime = performance.now();
        try {
            const parseResult = await parseExcelFile(file);
            const duration = Math.round(performance.now() - startTime);
            setResult({ ...parseResult, fileName: file.name, duration });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragActive(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    // Import locally (save to app store)
    const handleImportLocal = () => {
        if (!result || result.stories.length === 0) return;
        const epicNames = [...new Set(result.stories.filter(s => s.epicName).map(s => s.epicName))];
        epicNames.forEach(name => {
            const existing = projectEpics.find(e => e.title.toLowerCase() === name.toLowerCase());
            if (!existing) {
                dispatch({ type: 'ADD_EPIC', payload: { title: name, description: '' } });
            }
        });
        setTimeout(() => {
            const stories = result.stories.map(s => {
                const { epicName, sprintName, projectKey, ...storyData } = s;
                return storyData;
            });
            dispatch({ type: 'ADD_STORIES_BULK', payload: stories });
            notify(`✅ Đã import ${stories.length} User Stories vào local!`);
            setResult(null);
        }, 50);
    };

    // Import to Jira API
    const handleImportToJira = async () => {
        if (!result || result.stories.length === 0) return;
        if (!isJiraConfigured) {
            setError('Chưa cấu hình Jira API. Vui lòng vào Jira Settings để nhập Base URL và Bearer Token.');
            return;
        }

        // Check project key
        const hasProjectKey = result.stories.some(s => s.projectKey) || jiraSettings.defaultProjectKey;
        if (!hasProjectKey) {
            setError('Thiếu Project Key! Thêm cột "Project Key" trong Excel hoặc thiết lập Default Project Key trong Jira Settings.');
            return;
        }

        console.log('[JiraPO] Starting import to Jira', { baseUrl: jiraSettings.baseUrl, stories: result.stories.length });

        setImporting(true);
        setImportProgress({ current: 0, total: result.stories.length, results: [] });

        const onProgress = (index, total, res) => {
            setImportProgress(prev => ({
                current: index + 1,
                total,
                results: [...(prev?.results || []), res],
            }));
        };

        try {
            const importRes = await importStoriesToJira(jiraSettings, result.stories, onProgress);
            console.log('[JiraPO] Import complete', importRes);
            setImportResult(importRes);
            if (importRes.success > 0) {
                notify(`✅ Đã tạo ${importRes.success}/${importRes.total} issues trên Jira!`);
            }
            if (importRes.failed > 0) {
                notify(`⚠️ ${importRes.failed} issues bị lỗi!`, 'error');
            }
        } catch (err) {
            setError('Lỗi import: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const resetAll = () => {
        setResult(null);
        setError(null);
        setImportProgress(null);
        setImportResult(null);
    };

    return (
        <div>
            <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <p className="text-sm text-muted">Upload file Excel để tự động tạo User Stories → Jira hoặc lưu local.</p>
                </div>
                <div className="flex gap-8">
                    <button className="btn btn-secondary" onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}>
                        <Settings size={14} />
                        {isJiraConfigured ? '✅ Jira đã cấu hình' : '⚠️ Cấu hình Jira'}
                    </button>
                    <button className="btn btn-secondary" onClick={generateSampleExcel}>
                        <Download size={16} /> Tải Template
                    </button>
                </div>
            </div>

            {/* Jira Status Bar */}
            {isJiraConfigured && (
                <div style={{
                    padding: '10px 16px',
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.15)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                }}>
                    <span style={{ color: 'var(--accent-success)' }}>●</span>
                    <span className="text-muted">
                        Jira: <strong style={{ color: 'var(--text-primary)' }}>{jiraSettings.baseUrl}</strong>
                        {jiraSettings.defaultProjectKey && <> · Default Key: <strong style={{ color: 'var(--accent-primary-hover)' }}>{jiraSettings.defaultProjectKey}</strong></>}
                    </span>
                </div>
            )}

            {/* Dropzone */}
            {!result && !importResult && (
                <div
                    className={`import-dropzone ${isDragActive ? 'drag-active' : ''}`}
                    onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                    {loading ? (
                        <div>
                            <Loader size={48} className="import-dropzone-icon" style={{ animation: 'spin 1s linear infinite' }} />
                            <h3>Đang xử lý...</h3>
                        </div>
                    ) : (
                        <>
                            <Upload size={48} className="import-dropzone-icon" />
                            <h3>Kéo thả file Excel vào đây</h3>
                            <p>hoặc click để chọn file (.xlsx, .xls)</p>
                            <p className="text-xs text-muted mt-8">File cần có cột <strong>Project Key</strong> (ví dụ: C4TD)</p>
                        </>
                    )}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="notification-toast error" style={{ position: 'relative', marginTop: 16 }}>
                    <AlertCircle size={18} /> {error}
                    <button className="btn btn-ghost btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setError(null)}>
                        <XCircle size={14} />
                    </button>
                </div>
            )}

            {/* Import Progress */}
            {importing && importProgress && (
                <div className="card mt-16">
                    <div className="card-header">
                        <span className="card-title">🚀 Đang tạo issues trên Jira...</span>
                        <span className="text-sm text-muted">{importProgress.current}/{importProgress.total}</span>
                    </div>
                    <div className="sprint-progress">
                        <div className="sprint-progress-bar" style={{ height: 8 }}>
                            <div className="sprint-progress-fill" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }} />
                        </div>
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 12 }}>
                        {importProgress.results.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                                {r.success ? <CheckCircle size={14} style={{ color: 'var(--accent-success)', flexShrink: 0 }} /> : <XCircle size={14} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />}
                                <span className="truncate" style={{ flex: 1 }}>{r.title}</span>
                                {r.success && <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>{r.key}</span>}
                                {!r.success && <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>{r.error}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Import Complete */}
            {importResult && !importing && (
                <div className="card mt-16">
                    <div className="card-header">
                        <span className="card-title">📊 Kết quả Import Jira</span>
                    </div>
                    <div className="import-stats">
                        <div className="import-stat">
                            <span className="import-stat-value" style={{ color: 'var(--accent-success)' }}>{importResult.success}</span>
                            <span className="import-stat-label">Thành công</span>
                        </div>
                        <div className="import-stat">
                            <span className="import-stat-value" style={{ color: importResult.failed > 0 ? 'var(--accent-danger)' : 'var(--text-tertiary)' }}>{importResult.failed}</span>
                            <span className="import-stat-label">Thất bại</span>
                        </div>
                        <div className="import-stat">
                            <span className="import-stat-value">{importResult.total}</span>
                            <span className="import-stat-label">Tổng cộng</span>
                        </div>
                    </div>
                    {/* Result details */}
                    <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
                        <table className="import-preview-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 30 }}></th>
                                    <th>Title</th>
                                    <th>Project Key</th>
                                    <th>Jira Key</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {importResult.results.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.success ? <CheckCircle size={14} style={{ color: 'var(--accent-success)' }} /> : <XCircle size={14} style={{ color: 'var(--accent-danger)' }} />}</td>
                                        <td style={{ fontWeight: 500 }}>{r.title}</td>
                                        <td><span className="badge-points">{r.projectKey}</span></td>
                                        <td>
                                            {r.success ? (
                                                <a href={`${jiraSettings.baseUrl}/browse/${r.key}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-success)', fontWeight: 600 }}>
                                                    {r.key}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {r.success ? (
                                                <span className="badge badge-status-done">Thành công</span>
                                            ) : (
                                                <span className="text-xs" style={{ color: 'var(--accent-danger)' }}>{r.error}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex-between mt-16">
                        <button className="btn btn-secondary" onClick={resetAll}>Import file khác</button>
                    </div>
                </div>
            )}

            {/* Preview (after parsing, before import) */}
            {result && !importing && !importResult && (
                <div>
                    <div className="import-stats">
                        <div className="import-stat">
                            <span className="import-stat-value">{result.stories.length}</span>
                            <span className="import-stat-label">User Stories</span>
                        </div>
                        <div className="import-stat">
                            <span className="import-stat-value">{result.totalRows}</span>
                            <span className="import-stat-label">Dòng trong file</span>
                        </div>
                        <div className="import-stat">
                            <span className="import-stat-value">{result.duration}ms</span>
                            <span className="import-stat-label">Thời gian parse</span>
                        </div>
                        <div className="import-stat">
                            <span className="import-stat-value">
                                {[...new Set(result.stories.map(s => s.projectKey).filter(Boolean))].join(', ') || jiraSettings.defaultProjectKey || '—'}
                            </span>
                            <span className="import-stat-label">Project Keys</span>
                        </div>
                    </div>

                    {/* Warning nếu thiếu project key */}
                    {result.stories.some(s => !s.projectKey) && !jiraSettings.defaultProjectKey && (
                        <div style={{
                            padding: '10px 16px',
                            background: 'rgba(249,115,22,0.08)',
                            border: '1px solid rgba(249,115,22,0.2)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 16,
                            fontSize: 12,
                        }}>
                            ⚠️ <strong>{result.stories.filter(s => !s.projectKey).length} stories</strong> không có Project Key.
                            Thiết lập Default Project Key trong <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => dispatch({ type: 'SET_PAGE', payload: 'settings' })}>Settings</button> hoặc thêm cột "Project Key" trong Excel.
                        </div>
                    )}

                    {result.unmappedHeaders.length > 0 && (
                        <div className="text-xs text-muted mb-16" style={{ padding: '8px 12px', background: 'rgba(249,115,22,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249,115,22,0.2)' }}>
                            ⚠️ Cột chưa được map: {result.unmappedHeaders.join(', ')}
                        </div>
                    )}

                    {/* Preview Table */}
                    <div style={{ maxHeight: 400, overflowY: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <table className="import-preview-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Project Key</th>
                                    <th>Title</th>
                                    <th>As a</th>
                                    <th>I want to</th>
                                    <th>Priority</th>
                                    <th>Points</th>
                                    <th>Epic</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.stories.map((story, idx) => (
                                    <tr key={idx}>
                                        <td className="text-muted">{idx + 1}</td>
                                        <td>
                                            <span className="badge-points" style={{
                                                background: story.projectKey ? 'rgba(99,102,241,0.12)' : 'rgba(249,115,22,0.12)',
                                                color: story.projectKey ? 'var(--accent-primary-hover)' : '#f97316',
                                            }}>
                                                {story.projectKey || jiraSettings.defaultProjectKey || '??'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 500 }}>{story.title}</td>
                                        <td>{story.asA || '-'}</td>
                                        <td>{story.iWantTo || '-'}</td>
                                        <td>
                                            <span className={`badge badge-priority-${story.priority || 'Medium'}`}>
                                                {story.priority || 'Medium'}
                                            </span>
                                        </td>
                                        <td><span className="badge-points">{story.points || 0}</span></td>
                                        <td className="text-muted">{story.epicName || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Import Actions */}
                    <div className="flex-between mt-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                        <button className="btn btn-secondary" onClick={resetAll}>Hủy</button>
                        <div className="flex gap-8">
                            <button className="btn btn-secondary" onClick={handleImportLocal}>
                                <Check size={16} /> Lưu Local ({result.stories.length})
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleImportToJira}
                            >
                                <Send size={16} /> Import → Jira ({result.stories.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Guide */}
            {!result && !importResult && (
                <div className="card mt-24">
                    <div className="card-header">
                        <span className="card-title"><FileSpreadsheet size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Hướng dẫn Format Excel</span>
                    </div>
                    <div className="text-sm">
                        <p className="mb-8">File Excel cần có các cột sau (tên cột hỗ trợ tiếng Việt và tiếng Anh):</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                ['Project Key ⭐', 'Mã dự án Jira (VD: C4TD, ECOM) — BẮT BUỘC cho Jira import'],
                                ['Title / Tên', 'Tiêu đề User Story (bắt buộc)'],
                                ['As a / Vai trò', 'Vai trò người dùng'],
                                ['I want to / Hành động', 'Hành động mong muốn'],
                                ['So that / Lợi ích', 'Lợi ích đạt được'],
                                ['Priority / Ưu tiên', 'Low, Medium, High, Critical'],
                                ['Story Points / Điểm', 'Số nguyên (1, 2, 3, 5, 8...)'],
                                ['Epic / Module', 'Tên Epic/Feature'],
                                ['Acceptance Criteria', 'Tiêu chí chấp nhận'],
                            ].map(([col, desc]) => (
                                <div key={col} style={{ padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                                    <strong style={{ color: col.includes('⭐') ? 'var(--accent-warning)' : 'var(--accent-primary-hover)' }}>{col}</strong>
                                    <div className="text-xs text-muted">{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
