import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../data/store';
import { PRIORITY, STORY_STATUS } from '../data/models';
import { Plus, Trash2, Cloud, Loader, ArrowLeft, Zap } from 'lucide-react';
import { loadJiraSettings, createJiraIssue, createJiraSubtask } from '../utils/jiraApi';

export default function CreateStoryPage() {
    const { state, dispatch, notify, currentProject } = useStore();
    const editing = state.editingStory;

    // Check if Jira is configured
    const jiraSettings = loadJiraSettings();
    const isJiraConfigured = !!(jiraSettings.baseUrl && jiraSettings.bearerToken);

    const [isPushing, setIsPushing] = useState(false);
    const [syncToJira, setSyncToJira] = useState(true); // Đổi mặc định thành true để tự động chọn Sync lên Jira
    const [logs, setLogs] = useState([]);
    const [parentKey, setParentKey] = useState(''); // Mới: State cho Parent Key khi tạo Sub-task standalone

    const logsEndRef = useRef(null);
    const formRef = useRef(null); // Mới: Dùng để gọi validation HTML5 programmatically

    const [form, setForm] = useState({
        assignee: '',
        monthYear: '',
        description: '',
        status: STORY_STATUS.TODO,
    });

    const [subtasks, setSubtasks] = useState([]);

    useEffect(() => {
        if (editing) {
            // Cố gắng parse title để lấy assignee và monthYear: "Nguyễn Văn A [09/2025]"
            let parsedAssignee = editing.assignee || '';
            let parsedMonthYear = '';

            const titleMatch = editing.title?.match(/^(.*?)\s*\[(.*?)\]$/);
            if (titleMatch) {
                if (!parsedAssignee) parsedAssignee = titleMatch[1].trim();
                parsedMonthYear = titleMatch[2].trim();
            }

            setForm({
                assignee: parsedAssignee,
                monthYear: parsedMonthYear,
                description: editing.description || '',
                status: editing.status || STORY_STATUS.TODO,
            });
            setSubtasks(editing.subtasks || []);
        } else {
            // Khởi tạo mặc định tháng/năm hiện tại và assignee mặc định là tuan.cna
            const now = new Date();
            const currentMonthYear = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

            setForm({
                assignee: 'tuan.cna',
                monthYear: currentMonthYear,
                description: '',
                status: STORY_STATUS.TODO,
            });
            setSubtasks([]);
        }
        setLogs([]);
    }, [editing]);

    // Auto-scroll log console
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    const addSubtask = () => {
        setSubtasks([...subtasks, { title: '', assignee: form.assignee }]);
    };

    const updateSubtask = (index, field, value) => {
        const newSubtasks = [...subtasks];
        newSubtasks[index][field] = value;
        setSubtasks(newSubtasks);
    };

    const removeSubtask = (index) => {
        const newSubtasks = [...subtasks];
        newSubtasks.splice(index, 1);
        setSubtasks(newSubtasks);
    };

    const handleAutoGenerateSubtasks = () => {
        if (!form.assignee || !form.monthYear) {
            notify('Vui lòng nhập Họ Tên và Tháng/Năm trước khi tạo tự động', 'error');
            return;
        }

        // Tính toán các tuần của tháng/năm
        const [monthStr, yearStr] = form.monthYear.split('/');
        if (!monthStr || !yearStr) {
            notify('Tháng/Năm không hợp lệ. Vui lòng nhập định dạng MM/YYYY', 'error');
            return;
        }

        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        // Tạo ra các subtask theo 4 tuần (giả lập hoặc tính chuẩn ngày)
        // Dưới đây là logic tính chuẩn tuần:
        // Lấy ngày đầu tháng và ngày cuối tháng
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0); // Ngày cuối cùng của tháng

        const formatShortDate = (date) => {
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        };

        const getISOWeekNumber = (date) => {
            const target = new Date(date.valueOf());
            const dayNr = (date.getDay() + 6) % 7;
            target.setDate(target.getDate() - dayNr + 3);
            const firstThursday = target.valueOf();
            target.setMonth(0, 1);
            if (target.getDay() !== 4) {
                target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - target) / 604800000);
        };

        const weeks = [];
        let currentStartDate = new Date(firstDay);

        while (currentStartDate <= lastDay) {
            // Bước tới thứ 2 (hoặc ngày tiếp theo nếu đầu tháng không phải thứ 2)
            // Nếu là T7(6) hoặc CN(0), tiến lên thứ 2 tuần tiếp theo
            if (currentStartDate.getDay() === 0) {
                currentStartDate.setDate(currentStartDate.getDate() + 1);
                if (currentStartDate > lastDay) break;
            } else if (currentStartDate.getDay() === 6) {
                currentStartDate.setDate(currentStartDate.getDate() + 2);
                if (currentStartDate > lastDay) break;
            }

            // Tính ngày thứ 6 của tuần hiện tại
            // T2(1) -> cộng thêm 4 ngày
            // Nếu bắt đầu giữa tuần (T3, T4...) thì chỉ cộng phần còn lại đến T6(5)
            let dayOfWeek = currentStartDate.getDay();
            let daysToFriday = 5 - dayOfWeek;

            // Nếu ngày bắt đầu lớn hơn T6 (ví dụ bị kẹp trong điều kiện gì đó), thì ép về T6
            if (daysToFriday < 0) daysToFriday = 0;

            let currentEndDate = new Date(currentStartDate);
            currentEndDate.setDate(currentStartDate.getDate() + daysToFriday);

            // Không vượt quá ngày cuối tháng
            if (currentEndDate > lastDay) {
                // Nếu ngày cuối cùng của tháng là T7, CN thì phải lùi lại T6
                let tempEndDay = new Date(lastDay);
                if (tempEndDay.getDay() === 0) tempEndDay.setDate(tempEndDay.getDate() - 2); // CN lùi về T6
                else if (tempEndDay.getDay() === 6) tempEndDay.setDate(tempEndDay.getDate() - 1); // T7 lùi về T6

                // Đảm bảo không lùi quá start date
                if (tempEndDay < currentStartDate) tempEndDay = new Date(currentStartDate);
                currentEndDate = tempEndDay;
            }

            // Chỉ thêm vào list nếu start <= end
            if (currentStartDate <= currentEndDate) {
                const currentWeekISO = getISOWeekNumber(currentStartDate);
                weeks.push({
                    week: currentWeekISO,
                    start: formatShortDate(currentStartDate),
                    end: formatShortDate(currentEndDate)
                });
            }

            // Nhảy tới ngày hôm sau của đợt kết thúc (thường là T7)
            currentStartDate = new Date(currentEndDate);
            currentStartDate.setDate(currentStartDate.getDate() + 1);
        }

        const autoSubtasks = weeks.slice(0, 4).map(w => ({
            title: `Cao Nguyễn Anh Tuấn [${form.monthYear}, ${w.week}, ${w.start} - ${w.end}]`,
            assignee: form.assignee
        }));
        setSubtasks(autoSubtasks);
    };

    // Luồng 1: Chỉ tạo riêng User Story
    const handleCreateStoryOnly = async () => {
        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        const generatedTitle = `Cao Nguyễn Anh Tuấn [${form.monthYear.trim()}]`;

        if (syncToJira && isJiraConfigured && !editing) {
            setIsPushing(true);
            setLogs([]); // Reset logs
            const projectKey = 'PRHT';

            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: generatedTitle,
                    description: form.description || generatedTitle,
                    issuetype: { name: jiraSettings.issueTypeName || 'Story' },
                }
            };

            if (form.assignee) {
                payload.fields.assignee = { name: form.assignee };
            }

            try {
                addLog(`Story Request:\nPOST /rest/api/2/issue\n${JSON.stringify(payload, null, 2)}`);
                const storyResult = await createJiraIssue(jiraSettings, payload);

                if (storyResult.success) {
                    const storyResponseLog = {
                        id: storyResult.id,
                        key: storyResult.key,
                        self: storyResult.self
                    };
                    addLog(`Story Response - 201 Created / 200 OK:\n${JSON.stringify(storyResponseLog, null, 2)}`);
                    notify(`Đã push Story lên Jira thành công! Key: ${storyResult.key}`);
                } else {
                    addLog(`Story Response Error:\n${storyResult.error}`);
                    notify(`Lỗi tạo Story trên Jira: ${storyResult.error}`, 'error');
                }
            } catch (error) {
                addLog(`System Error:\n${error.message}`);
                notify(`Lỗi kết nối Jira: ${error.message}`, 'error');
            }
            setIsPushing(false);
        } else {
            // Local Only log
            const projectKey = 'PRHT';
            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: generatedTitle,
                    description: form.description || generatedTitle,
                    issuetype: { name: 'Story' },
                }
            };
            if (form.assignee) {
                payload.fields.assignee = { name: form.assignee };
            }
            setLogs([]);
            const mockStoryKey = `${projectKey}-${Math.floor(1000 + Math.random() * 9000)}`;
            addLog(`Story Request (Local Only - No Sync):\nPOST /rest/api/2/issue\n${JSON.stringify(payload, null, 2)}`);
            addLog(`Story Response - 201 Created (Local Mock):\n{\n  "id": "local-${Date.now()}",\n  "key": "${mockStoryKey}",\n  "self": "http://local-database/issue"\n}`);
        }

        // Save locally (giữ các trường agile mặc định để không làm lỗi app, lưu Story không kèm subtasks)
        const storyData = {
            title: generatedTitle,
            description: form.description,
            assignee: form.assignee,
            status: form.status,
            asA: '', iWantTo: '', soThat: '', epicId: null, sprintId: null,
            priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '',
            subtasks: [] // Chỉ tạo Story nên subtasks để rỗng
        };

        if (editing) {
            dispatch({ type: 'UPDATE_STORY', payload: { ...storyData, id: editing.id } });
            notify('User Story đã được cập nhật!');
            close();
        } else {
            dispatch({ type: 'ADD_STORY', payload: storyData });
            if (!syncToJira) notify('User Story mới đã được tạo!');
        }
    };

    // Luồng 2: Chỉ tạo riêng Subtasks (Cho phép nhập Parent Key, hoặc lấy từ state)
    const handleCreateSubtasksOnly = async () => {
        const validSubtasks = subtasks.filter(st => st.title.trim());
        if (validSubtasks.length === 0) {
            notify('Vui lòng thêm ít nhất một Subtask có nội dung', 'error');
            return;
        }

        const projectKey = 'PRHT';

        if (syncToJira && isJiraConfigured) {
            if (!parentKey.trim()) {
                notify('Vui lòng nhập Jira Parent Key để tạo Sub-task!', 'error');
                return;
            }

            setIsPushing(true);
            setLogs([]); // Reset logs
            addLog(`Bắt đầu tạo ${validSubtasks.length} Subtasks cho Parent Key: ${parentKey.trim()}...`);

            let subtasksSuccess = 0;

            for (const subtask of validSubtasks) {
                const subtaskPayload = {
                    fields: {
                        project: { key: projectKey },
                        parent: { key: parentKey.trim() },
                        summary: subtask.title,
                        issuetype: { name: 'Sub-task' },
                    }
                };
                if (subtask.assignee) {
                    subtaskPayload.fields.assignee = { name: subtask.assignee };
                }

                try {
                    addLog(`Subtask Request:\nPOST /rest/api/2/issue\n${JSON.stringify(subtaskPayload, null, 2)}`);
                    const subtaskResult = await createJiraSubtask(
                        jiraSettings,
                        parentKey.trim(),
                        subtask,
                        projectKey
                    );

                    if (subtaskResult.success) {
                        const subtaskResponseLog = {
                            id: subtaskResult.id,
                            key: subtaskResult.key,
                            self: subtaskResult.self
                        };
                        addLog(`Subtask Response - 201 Created / 200 OK:\n${JSON.stringify(subtaskResponseLog, null, 2)}`);
                        subtasksSuccess++;
                    } else {
                        addLog(`Subtask Response Error:\n${subtaskResult.error}`);
                    }
                } catch (error) {
                    addLog(`System Error:\n${error.message}`);
                }
            }

            notify(`Đã push Subtasks lên Jira! (${subtasksSuccess}/${validSubtasks.length} Subtasks thành công)`);
            setIsPushing(false);
        } else {
            // Local Only mock
            setLogs([]);
            const resolvedParentKey = parentKey.trim() || 'MOCK-PARENT';
            addLog(`Bắt đầu tạo Subtasks giả lập cho Parent Key: ${resolvedParentKey}...`);

            for (const subtask of validSubtasks) {
                const subtaskPayload = {
                    fields: {
                        project: { key: projectKey },
                        parent: { key: resolvedParentKey },
                        summary: subtask.title,
                        issuetype: { name: 'Sub-task' },
                    }
                };
                if (subtask.assignee) {
                    subtaskPayload.fields.assignee = { name: subtask.assignee };
                }
                addLog(`Subtask Request (Local Only - No Sync):\nPOST /rest/api/2/issue\n${JSON.stringify(subtaskPayload, null, 2)}`);
                addLog(`Subtask Response - 201 Created (Local Mock):\n{\n  "id": "local-${Date.now()}",\n  "key": "${projectKey}-${Math.floor(1000 + Math.random() * 9000)}",\n  "self": "http://local-database/sub-issue"\n}`);
            }
            notify(`Đã tạo giả lập ${validSubtasks.length} Subtasks thành công!`);
        }
    };

    // Luồng 3: Tự động hóa tạo cả Story & Subtasks (Luồng gốc handleSubmit)
    const handleCreateStoryAndSubtasks = async () => {
        if (formRef.current && !formRef.current.reportValidity()) {
            return;
        }

        const generatedTitle = `Cao Nguyễn Anh Tuấn [${form.monthYear.trim()}]`;
        const validSubtasks = subtasks.filter(st => st.title.trim());

        if (syncToJira && isJiraConfigured && !editing) {
            setIsPushing(true);
            setLogs([]); // Reset logs
            const projectKey = 'PRHT'; // Theo Jira_API_Design.md, hardcode mặc định PRHT thay vì lấy từ currentProject

            // Create Story Payload
            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: generatedTitle,
                    description: form.description || generatedTitle,
                    issuetype: { name: jiraSettings.issueTypeName || 'Story' },
                }
            };

            if (form.assignee) {
                payload.fields.assignee = { name: form.assignee };
            }

            try {
                // Log Story Request
                addLog(`Story Request:\nPOST /rest/api/2/issue\n${JSON.stringify(payload, null, 2)}`);

                // 1. Create Story on Jira
                const storyResult = await createJiraIssue(jiraSettings, payload);

                if (storyResult.success) {
                    const storyResponseLog = {
                        id: storyResult.id,
                        key: storyResult.key,
                        self: storyResult.self
                    };
                    // Log Story Response (Success)
                    addLog(`Story Response - 201 Created / 200 OK:\n${JSON.stringify(storyResponseLog, null, 2)}`);

                    let subtasksSuccess = 0;

                    if (validSubtasks.length > 0) {
                        addLog(`Bắt đầu tạo ${validSubtasks.length} Subtasks...`);
                    } else {
                        addLog(`Không có Subtask nào để tạo.`);
                    }

                    // 2. Create Subtasks if any
                    for (const subtask of validSubtasks) {
                        const subtaskPayload = {
                            fields: {
                                project: { key: projectKey },
                                parent: { key: storyResult.key },
                                summary: subtask.title,
                                issuetype: { name: 'Sub-task' },
                            }
                        };
                        if (subtask.assignee) {
                            subtaskPayload.fields.assignee = { name: subtask.assignee };
                        }

                        // Log Subtask Request
                        addLog(`Subtask Request:\nPOST /rest/api/2/issue\n${JSON.stringify(subtaskPayload, null, 2)}`);

                        const subtaskResult = await createJiraSubtask(
                            jiraSettings,
                            storyResult.key,
                            subtask,
                            projectKey
                        );

                        if (subtaskResult.success) {
                            const subtaskResponseLog = {
                                id: subtaskResult.id,
                                key: subtaskResult.key,
                                self: subtaskResult.self
                            };
                            // Log Subtask Response (Success)
                            addLog(`Subtask Response - 201 Created / 200 OK:\n${JSON.stringify(subtaskResponseLog, null, 2)}`);
                            subtasksSuccess++;
                        } else {
                            // Log Subtask Response (Error)
                            addLog(`Subtask Response Error:\n${subtaskResult.error}`);
                        }
                    }

                    notify(`Đã push lên Jira thành công! Story: ${storyResult.key} (${subtasksSuccess}/${validSubtasks.length} Subtasks)`);
                } else {
                    // Log Story Response (Error)
                    addLog(`Story Response Error:\n${storyResult.error}`);
                    notify(`Lỗi tạo Story trên Jira: ${storyResult.error}`, 'error');
                    setIsPushing(false);
                    return; // Stop here if Story creation failed
                }
            } catch (error) {
                addLog(`System Error:\n${error.message}`);
                notify(`Lỗi kết nối Jira: ${error.message}`, 'error');
                setIsPushing(false);
                return;
            }
            setIsPushing(false);
        } else {
            // Trường hợp KHÔNG tick "Tạo và Đồng bộ trực tiếp lên Jira Project"
            // Vẫn log thông tin Request giả lập để hiển thị ở ô log bên phải cho người dùng theo dõi
            const projectKey = 'PRHT'; // Hardcode mặc định PRHT theo Jira_API_Design.md
            const payload = {
                fields: {
                    project: { key: projectKey },
                    summary: generatedTitle,
                    description: form.description || generatedTitle,
                    issuetype: { name: 'Story' },
                }
            };
            if (form.assignee) {
                payload.fields.assignee = { name: form.assignee };
            }

            setLogs([]); // Reset logs
            const mockStoryKey = `${projectKey}-${Math.floor(1000 + Math.random() * 9000)}`;
            addLog(`Story Request (Local Only - No Sync):\nPOST /rest/api/2/issue\n${JSON.stringify(payload, null, 2)}`);
            addLog(`Story Response - 201 Created (Local Mock):\n{\n  "id": "local-${Date.now()}",\n  "key": "${mockStoryKey}",\n  "self": "http://local-database/issue"\n}`);

            for (const subtask of validSubtasks) {
                const subtaskPayload = {
                    fields: {
                        project: { key: projectKey },
                        parent: { key: mockStoryKey },
                        summary: subtask.title,
                        issuetype: { name: 'Sub-task' },
                    }
                };
                if (subtask.assignee) {
                    subtaskPayload.fields.assignee = { name: subtask.assignee };
                }
                addLog(`Subtask Request (Local Only - No Sync):\nPOST /rest/api/2/issue\n${JSON.stringify(subtaskPayload, null, 2)}`);
                addLog(`Subtask Response - 201 Created (Local Mock):\n{\n  "id": "local-${Date.now()}",\n  "key": "${projectKey}-${Math.floor(1000 + Math.random() * 9000)}",\n  "self": "http://local-database/sub-issue"\n}`);
            }
        }

        // Save locally (giữ các trường agile mặc định để không làm lỗi app)
        const storyData = {
            title: generatedTitle,
            description: form.description,
            assignee: form.assignee,
            status: form.status,
            asA: '', iWantTo: '', soThat: '', epicId: null, sprintId: null,
            priority: PRIORITY.MEDIUM, points: 0, acceptanceCriteria: '',
            subtasks: validSubtasks
        };

        if (editing) {
            dispatch({ type: 'UPDATE_STORY', payload: { ...storyData, id: editing.id } });
            notify('User Story đã được cập nhật!');
            close();
        } else {
            dispatch({ type: 'ADD_STORY', payload: storyData });
            if (!syncToJira) notify('User Story mới đã được tạo!');
            // Khi tạo mới sẽ không gọi hàm close() để ở lại trang
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Giữ lại handleSubmit để tránh lỗi nếu form kích hoạt onSubmit mặc định
        await handleCreateStoryAndSubtasks();
    };

    const close = () => {
        if (!isPushing) {
            dispatch({ type: 'SET_PAGE', payload: 'backlog' });
        }
    };

    const previewTitle = form.assignee || form.monthYear ? `Cao Nguyễn Anh Tuấn [${form.monthYear}]` : 'Nhập thông tin để xem tiêu đề...';

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40, display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
                <div className="flex-between mb-16">
                    <button type="button" className="btn btn-ghost" onClick={close} disabled={isPushing} style={{ paddingLeft: 0 }}>
                        <ArrowLeft size={16} style={{ marginRight: 6 }} /> Quay lại Backlog
                    </button>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ fontSize: 18 }}>{editing ? 'Chỉnh sửa User Story' : 'Tạo User Story & Subtasks'}</h3>
                    </div>
                    <form ref={formRef} onSubmit={(e) => e.preventDefault()} style={{ padding: 24 }}>
                        {/* Sync to Jira Option */}
                        {!editing && isJiraConfigured && (
                            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--bg-glass)', border: '1px solid var(--accent-primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input
                                    type="checkbox"
                                    id="syncToJira"
                                    checked={syncToJira}
                                    onChange={(e) => setSyncToJira(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                                />
                                <label htmlFor="syncToJira" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>
                                    <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
                                    Tạo và Đồng bộ trực tiếp lên Jira Project
                                </label>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Họ Tên (Assignee) *</label>
                                <input className="form-input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="VD: Nguyễn Văn A" required />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Tháng/Năm *</label>
                                <input className="form-input" value={form.monthYear} onChange={e => setForm({ ...form, monthYear: e.target.value })} placeholder="VD: 09/2025" required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tiêu đề Story (Tự động)</label>
                            <div style={{ padding: '8px 12px', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                                {previewTitle}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mô tả chung (Tùy chọn)</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả cho Story..." rows={2} />
                        </div>

                        {/* Subtasks Section */}
                        <div style={{ marginTop: 32, borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
                            <div className="flex-between mb-16" style={{ alignItems: 'flex-end' }}>
                                <div>
                                    <label className="form-label" style={{ margin: 0, fontSize: 14 }}>Subtasks ({subtasks.length})</label>
                                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>Tự động chia công việc theo tuần</div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAutoGenerateSubtasks} style={{ padding: '6px 12px', fontSize: 13, background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-primary)' }}>
                                        <Zap size={14} style={{ marginRight: 6 }} /> Tạo 4 tuần
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={addSubtask} style={{ padding: '6px 12px', fontSize: 13 }}>
                                        <Plus size={14} style={{ marginRight: 6 }} /> Thêm Subtask
                                    </button>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ fontSize: 13 }}>Jira Parent Key (Tùy chọn - Dùng khi tạo Sub-task đơn lẻ)</label>
                                <input
                                    className="form-input"
                                    value={parentKey}
                                    onChange={e => setParentKey(e.target.value)}
                                    placeholder="VD: PRHT-123 (Chỉ bắt buộc nếu click 'Tạo Sub-Task')"
                                />
                            </div>

                            {subtasks.length === 0 && (
                                <div className="text-muted text-sm text-center" style={{ padding: '24px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                    Bấm "Tạo 4 tuần" để sinh tự động các subtask theo tháng.
                                </div>
                            )}

                            {subtasks.map((subtask, index) => (
                                <div key={index} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                                    <input
                                        className="form-input"
                                        style={{ flex: 3 }}
                                        placeholder={`Tên Subtask...`}
                                        value={subtask.title}
                                        onChange={(e) => updateSubtask(index, 'title', e.target.value)}
                                        required
                                    />
                                    <input
                                        className="form-input"
                                        style={{ flex: 1 }}
                                        placeholder="Assignee"
                                        value={subtask.assignee}
                                        onChange={(e) => updateSubtask(index, 'assignee', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-icon"
                                        style={{ color: 'var(--accent-danger)' }}
                                        onClick={() => removeSubtask(index)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 20, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-secondary" onClick={close} disabled={isPushing}>Hủy</button>
                            {editing && (
                                <button type="button" className="btn btn-danger" disabled={isPushing} onClick={() => {
                                    dispatch({ type: 'DELETE_STORY', payload: editing.id });
                                    notify('User Story đã bị xóa!', 'error');
                                    close();
                                }}>Xóa</button>
                            )}

                            {!editing && (
                                <>
                                    {/* Nút 1: Chỉ tạo riêng User Story */}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={isPushing}
                                        onClick={handleCreateStoryOnly}
                                        style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', background: 'transparent' }}
                                    >
                                        Tạo User Story
                                    </button>

                                    {/* Nút 2: Chỉ tạo riêng Subtasks */}
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={isPushing}
                                        onClick={handleCreateSubtasksOnly}
                                        style={{ borderColor: 'var(--accent-success)', color: 'var(--accent-success)', background: 'transparent' }}
                                    >
                                        Tạo Sub-Task
                                    </button>
                                </>
                            )}

                            {/* Nút 3: Tự động hóa tạo cả Story & Subtasks */}
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isPushing}
                                onClick={handleCreateStoryAndSubtasks}
                                style={{ minWidth: 160 }}
                            >
                                {isPushing ? (
                                    <><Loader size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8, verticalAlign: 'middle' }} /> Đang Push...</>
                                ) : (
                                    editing ? 'Cập nhật' : 'Tạo Story & Sub-Task'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Logs Console Terminal UI (Right Grid) */}
            <div style={{ flex: 1 }}>
                <div style={{ position: 'sticky', top: 20 }}>
                    <div className="card" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>📡</span> Jira REST API Logs
                            </h3>
                            {isPushing && <span style={{ color: 'var(--accent-primary)', fontSize: 12, fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>PROCESSING...</span>}
                        </div>
                        <div style={{
                            flex: 1,
                            padding: 16,
                            background: '#0d1117',
                            color: '#4af626',
                            fontFamily: 'Consolas, Monaco, monospace',
                            fontSize: 12.5,
                            overflowY: 'auto',
                            borderBottomLeftRadius: 'var(--radius-md)',
                            borderBottomRightRadius: 'var(--radius-md)',
                        }}>
                            {logs.length === 0 && !isPushing ? (
                                <div style={{ color: '#6e7681', textAlign: 'center', marginTop: 40, fontStyle: 'italic' }}>
                                    Chưa có log nào. Khi ấn "Tạo & Push Jira", log quá trình đẩy dữ liệu sẽ hiển thị tại đây.
                                </div>
                            ) : (
                                <>
                                    {logs.map((log, i) => (
                                        <pre key={i} style={{
                                            margin: '0 0 12px 0',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: '1.5',
                                            borderLeft: log.includes('Response Error') || log.includes('System Error') ? '2px solid var(--accent-danger)' : log.includes('Response - 201') ? '2px solid var(--accent-success)' : '2px solid var(--accent-primary)',
                                            paddingLeft: 8
                                        }}>
                                            {log}
                                        </pre>
                                    ))}
                                    <div ref={logsEndRef} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}