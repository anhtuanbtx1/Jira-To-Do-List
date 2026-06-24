import React, { useState } from 'react';
import { loadJiraSettings, saveJiraSettings, testJiraConnection } from '../utils/jiraApi';
import { Wifi, WifiOff, Loader, Eye, EyeOff, Save, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
    const [form, setForm] = useState(loadJiraSettings());
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showToken, setShowToken] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        saveJiraSettings(form);
        if (import.meta.env.DEV) {
            try {
                await fetch('/api/save-env', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(form),
                });
            } catch (err) {
                console.error('Failed to save configuration to environment variables', err);
            }
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        const result = await testJiraConnection(form);
        setTestResult(result);
        setTesting(false);
    };

    return (
        <div style={{ maxWidth: 700 }}>
            {/* Connection Status */}
            {testResult && (
                <div style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 20,
                    background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}>
                    {testResult.success ? <Wifi size={18} style={{ color: 'var(--accent-success)' }} /> : <WifiOff size={18} style={{ color: 'var(--accent-danger)' }} />}
                    <span style={{ color: testResult.success ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
                        {testResult.success ? `✅ Kết nối thành công! User: ${testResult.user}` : `❌ Lỗi kết nối: ${testResult.error}`}
                    </span>
                </div>
            )}

            {saved && (
                <div style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 20,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                }}>
                    <CheckCircle size={18} style={{ color: 'var(--accent-success)' }} />
                    <span style={{ color: 'var(--accent-success)', fontWeight: 600 }}>Cấu hình đã được lưu!</span>
                </div>
            )}

            {/* Jira API Settings */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">🔗 Jira Server</span>
                </div>

                <div className="form-group">
                    <label className="form-label">Jira Base URL *</label>
                    <input
                        className="form-input"
                        value={form.baseUrl}
                        onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                        placeholder="https://jira-local.ots.vn"
                    />
                    <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                        URL gốc của Jira Server (không cần /rest/api/...)
                    </span>
                </div>

                <div className="form-group">
                    <label className="form-label">Bearer Token *</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            type={showToken ? 'text' : 'password'}
                            value={form.bearerToken}
                            onChange={e => setForm({ ...form, bearerToken: e.target.value })}
                            placeholder="NDUyMjU4NDI0MzI1Oh1KSgVgUzGNcBJE..."
                            style={{ paddingRight: 44 }}
                        />
                        <button
                            className="btn btn-ghost btn-icon"
                            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                            onClick={() => setShowToken(!showToken)}
                            type="button"
                        >
                            {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                    <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                        Personal Access Token từ Jira Profile Settings
                    </span>
                </div>

                <div className="form-group">
                    <label className="form-label">Cookie (tùy chọn)</label>
                    <textarea
                        className="form-textarea"
                        value={form.cookie}
                        onChange={e => setForm({ ...form, cookie: e.target.value })}
                        placeholder="JSESSIONID=E9203DB...; atlassian.xsrf.token=BKAA-RP4H..."
                        rows={2}
                    />
                    <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                        Thêm cookie nếu Bearer Token không đủ quyền (copy từ browser DevTools)
                    </span>
                </div>

                <button
                    className="btn btn-secondary"
                    onClick={handleTest}
                    disabled={testing || !form.baseUrl || !form.bearerToken}
                    style={{ marginTop: 4 }}
                >
                    {testing
                        ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang kiểm tra...</>
                        : <><Wifi size={14} /> Test kết nối</>
                    }
                </button>
            </div>

            {/* Default Values */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">📋 Cấu hình mặc định</span>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Default Project Key</label>
                        <input
                            className="form-input"
                            value={form.defaultProjectKey}
                            onChange={e => setForm({ ...form, defaultProjectKey: e.target.value.toUpperCase() })}
                            placeholder="C4TD"
                            style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}
                        />
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Dùng khi Excel không có cột Project Key
                        </span>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Issue Type mặc định</label>
                        <select
                            className="form-select"
                            value={form.issueTypeName}
                            onChange={e => setForm({ ...form, issueTypeName: e.target.value })}
                        >
                            <option value="Story">Story</option>
                            <option value="Task">Task</option>
                            <option value="Bug">Bug</option>
                            <option value="Epic">Epic</option>
                            <option value="Sub-task">Sub-task</option>
                        </select>
                        <span className="text-xs text-muted" style={{ marginTop: 4, display: 'block' }}>
                            Loại issue sẽ tạo trên Jira
                        </span>
                    </div>
                </div>
            </div>

            {/* Guide */}
            <div className="card mb-16">
                <div className="card-header">
                    <span className="card-title">💡 Hướng dẫn sử dụng</span>
                </div>
                <div className="text-sm" style={{ lineHeight: 1.8 }}>
                    <ol style={{ paddingLeft: 20, listStyleType: 'decimal' }}>
                        <li><strong>Tạo Personal Access Token:</strong> Jira → Profile → Personal Access Tokens → Create</li>
                        <li><strong>Nhập Base URL:</strong> Địa chỉ Jira Server (VD: https://jira-local.ots.vn)</li>
                        <li><strong>Test kết nối:</strong> Click "Test kết nối" để xác nhận</li>
                        <li><strong>Default Project Key:</strong> Mã project Jira (VD: C4TD) — dùng khi Excel không có cột này</li>
                        <li><strong>Import Excel:</strong> Cột "Project Key" trong Excel sẽ override Default Project Key</li>
                    </ol>

                    <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <strong style={{ color: 'var(--accent-primary-hover)' }}>📡 API Endpoint:</strong>
                        <code className="text-xs" style={{ display: 'block', marginTop: 6, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)' }}>
                            POST {form.baseUrl || 'https://jira-local.ots.vn'}/rest/api/2/issue
                        </code>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex" style={{ justifyContent: 'flex-end', gap: 12 }}>
                <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: 180 }}>
                    <Save size={16} /> {saved ? '✅ Đã lưu!' : 'Lưu cấu hình'}
                </button>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
