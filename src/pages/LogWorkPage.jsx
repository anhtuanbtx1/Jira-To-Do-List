import React, { useState, useRef } from 'react';
import { loadJiraSettings } from '../utils/jiraApi';
import { logWorkToTempo } from '../utils/tempoApi';
import {
    Clock, Play, Square, CheckCircle, XCircle, Loader, Calendar,
    User, Hash, AlertTriangle, RotateCcw, Save, Trash2
} from 'lucide-react';

const LOG_WORK_CONFIG_KEY = 'jirapo_logwork_config';

function loadLogWorkConfig() {
    try {
        const saved = localStorage.getItem(LOG_WORK_CONFIG_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {
        worker: 'JIRAUSER10108',
        originTaskId: '42949',
        hours: '8',
        remainingEstimate: '0',
        skipWeekends: true,
    };
}

function saveLogWorkConfig(config) {
    localStorage.setItem(LOG_WORK_CONFIG_KEY, JSON.stringify(config));
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getDatesBetween(startStr, endStr, skipWeekends) {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
        if (!skipWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
            dates.push(formatDate(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function getDayName(dateStr) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[new Date(dateStr).getDay()];
}

export default function LogWorkPage() {
    const [config, setConfig] = useState(loadLogWorkConfig());
    const [startDate, setStartDate] = useState(formatDate(new Date()));
    const [endDate, setEndDate] = useState(formatDate(new Date()));
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [summary, setSummary] = useState(null);
    const abortRef = useRef(false);

    const dates = getDatesBetween(startDate, endDate, config.skipWeekends);
    const timeSpentSeconds = parseFloat(config.hours || 0) * 3600;

    const handleSaveConfig = () => {
        saveLogWorkConfig(config);
    };

    const handleReset = () => {
        setLogs([]);
        setSummary(null);
        abortRef.current = false;
    };

    const handleStop = () => {
        abortRef.current = true;
    };

    const handleRun = async () => {
        if (dates.length === 0) return;

        const jiraSettings = loadJiraSettings();
        if (!jiraSettings.baseUrl || !jiraSettings.bearerToken) {
            setSummary({ error: 'Chưa cấu hình Jira Settings (Base URL & Bearer Token). Vui lòng vào Settings để cấu hình.' });
            return;
        }

        // Save config before running
        saveLogWorkConfig(config);

        setIsRunning(true);
        setSummary(null);
        setLogs([]);
        abortRef.current = false;

        let successCount = 0;
        let failedCount = 0;
        const allLogs = [];

        for (let i = 0; i < dates.length; i++) {
            if (abortRef.current) {
                allLogs.push({ date: '---', status: 'stopped', message: '⛔ Đã dừng bởi người dùng' });
                setLogs([...allLogs]);
                break;
            }

            const date = dates[i];
            const logEntry = { date, status: 'running', message: 'Đang gửi...' };
            allLogs.push(logEntry);
            setLogs([...allLogs]);

            const body = {
                worker: config.worker,
                started: date,
                timeSpentSeconds: timeSpentSeconds,
                originTaskId: parseInt(config.originTaskId, 10),
                remainingEstimate: parseInt(config.remainingEstimate, 10) || 0,
            };

            const result = await logWorkToTempo(jiraSettings, body);

            if (result.success) {
                successCount++;
                allLogs[allLogs.length - 1] = { date, status: 'success', message: `✅ Logged ${config.hours}h` };
            } else {
                failedCount++;
                allLogs[allLogs.length - 1] = { date, status: 'error', message: `❌ ${result.error}` };
            }
            setLogs([...allLogs]);

            // Delay between requests
            if (i < dates.length - 1 && !abortRef.current) {
                await new Promise(r => setTimeout(r, 300));
            }
        }

        setIsRunning(false);
        setSummary({ success: successCount, failed: failedCount, total: dates.length });
    };

    return (
        <div style={{ width: '100%' }}>
            {/* Config Card */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">⚙️ Cấu hình Log Work</span>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            <User size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Worker (Jira User Key) *
                        </label>
                        <input
                            className="form-input"
                            value={config.worker}
                            onChange={e => setConfig({ ...config, worker: e.target.value })}
                            placeholder="JIRAUSER10108"
                            style={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Key user trong Jira (VD: JIRAUSER10108)
                        </span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <Hash size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Origin Task ID *
                        </label>
                        <input
                            className="form-input"
                            value={config.originTaskId}
                            onChange={e => setConfig({ ...config, originTaskId: e.target.value })}
                            placeholder="42949"
                            style={{ fontFamily: 'monospace', fontWeight: 600 }}
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            ID task trên Jira để log work vào
                        </span>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            <Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Số giờ làm việc / ngày *
                        </label>
                        <input
                            className="form-input"
                            type="number"
                            min="0.5"
                            max="24"
                            step="0.5"
                            value={config.hours}
                            onChange={e => setConfig({ ...config, hours: e.target.value })}
                            placeholder="8"
                            style={{ fontWeight: 700, fontSize: 16 }}
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            = <strong style={{ color: 'var(--accent-primary)' }}>{timeSpentSeconds.toLocaleString()}</strong> giây (x 3600)
                        </span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Remaining Estimate</label>
                        <input
                            className="form-input"
                            type="number"
                            min="0"
                            value={config.remainingEstimate}
                            onChange={e => setConfig({ ...config, remainingEstimate: e.target.value })}
                            placeholder="0"
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Thời gian ước tính còn lại (giây)
                        </span>
                    </div>
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginTop: 8,
                    padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={config.skipWeekends}
                            onChange={e => setConfig({ ...config, skipWeekends: e.target.checked })}
                            style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)' }}
                        />
                        <span className="text-sm" style={{ fontWeight: 500 }}>Bỏ qua Thứ 7 & Chủ Nhật</span>
                    </label>
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={handleSaveConfig} style={{ minWidth: 140 }}>
                        <Save size={14} /> Lưu cấu hình
                    </button>
                </div>
            </div>

            {/* Date Range & Run */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">📅 Chọn khoảng thời gian</span>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Từ ngày
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ fontWeight: 600 }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <Calendar size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Đến ngày
                        </label>
                        <input
                            className="form-input"
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ fontWeight: 600 }}
                        />
                    </div>
                </div>

                {/* Preview dates */}
                {dates.length > 0 && (
                    <div style={{
                        marginTop: 12, padding: '12px 14px',
                        background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                    }}>
                        <div className="text-xs text-muted" style={{ marginBottom: 8, fontWeight: 600 }}>
                            📋 Sẽ log <strong style={{ color: 'var(--accent-primary)' }}>{dates.length}</strong> ngày
                            &nbsp;×&nbsp;
                            <strong style={{ color: 'var(--accent-primary)' }}>{config.hours}h</strong>
                            &nbsp;=&nbsp;
                            <strong style={{ color: 'var(--accent-warning)' }}>{(dates.length * parseFloat(config.hours || 0)).toFixed(1)}h</strong> tổng
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {dates.map(d => (
                                <span key={d} style={{
                                    padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                                    background: 'var(--bg-secondary)', fontSize: 12, fontFamily: 'monospace',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                }}>
                                    {getDayName(d)} {d}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {dates.length === 0 && startDate && endDate && (
                    <div style={{
                        marginTop: 12, padding: '12px 14px', textAlign: 'center',
                        color: 'var(--accent-warning)', fontSize: 13,
                    }}>
                        <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Không có ngày nào trong khoảng đã chọn {config.skipWeekends ? '(đã bỏ T7/CN)' : ''}
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    {!isRunning ? (
                        <button
                            className="btn btn-primary"
                            onClick={handleRun}
                            disabled={dates.length === 0 || !config.worker || !config.originTaskId}
                            style={{ minWidth: 200 }}
                        >
                            <Play size={16} /> Bắt đầu Log Work ({dates.length} ngày)
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={handleStop} style={{ minWidth: 200 }}>
                            <Square size={16} /> Dừng lại
                        </button>
                    )}

                    {logs.length > 0 && !isRunning && (
                        <button className="btn btn-ghost" onClick={handleReset}>
                            <RotateCcw size={14} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            {summary && !summary.error && (
                <div style={{
                    padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 16,
                    background: summary.failed === 0 ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${summary.failed === 0 ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <CheckCircle size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>
                        Hoàn tất! ✅ {summary.success}/{summary.total} thành công
                        {summary.failed > 0 && <span style={{ color: 'var(--accent-danger)' }}> — {summary.failed} lỗi</span>}
                    </span>
                </div>
            )}

            {summary?.error && (
                <div style={{
                    padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 16,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <XCircle size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--accent-danger)', fontWeight: 600 }}>{summary.error}</span>
                </div>
            )}

            {/* Log Results Table */}
            {logs.length > 0 && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">📝 Kết quả Log Work</span>
                        {isRunning && (
                            <span className="text-xs" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                Đang chạy...
                            </span>
                        )}
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%', borderCollapse: 'collapse', fontSize: 13,
                        }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>Ngày</th>
                                    <th style={thStyle}>Thứ</th>
                                    <th style={thStyle}>Trạng thái</th>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, idx) => (
                                    <tr key={idx} style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        background: log.status === 'error' ? 'rgba(239,68,68,0.04)' : 'transparent',
                                    }}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>
                                            {log.date === '---' ? '—' : log.date}
                                        </td>
                                        <td style={tdStyle}>
                                            {log.date !== '---' ? getDayName(log.date) : '—'}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {log.status === 'running' && <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent-primary)' }} />}
                                            {log.status === 'success' && <CheckCircle size={14} style={{ color: 'var(--accent-success)' }} />}
                                            {log.status === 'error' && <XCircle size={14} style={{ color: 'var(--accent-danger)' }} />}
                                            {log.status === 'stopped' && <Square size={14} style={{ color: 'var(--accent-warning)' }} />}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>{log.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const thStyle = {
    padding: '10px 12px',
    textAlign: 'center',
    fontWeight: 600,
    color: 'var(--text-tertiary)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const tdStyle = {
    padding: '10px 12px',
    textAlign: 'center',
    color: 'var(--text-secondary)',
};
