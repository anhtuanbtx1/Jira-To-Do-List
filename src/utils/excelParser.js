import * as XLSX from 'xlsx';

// Column mapping: Excel header → UserStory field
const COLUMN_MAP = {
    // Title
    'title': 'title', 'tên': 'title', 'tên tính năng': 'title', 'feature': 'title',
    'user story': 'title', 'story': 'title', 'name': 'title', 'user story title': 'title',
    // Description
    'description': 'description', 'mô tả': 'description', 'desc': 'description', 'chi tiết': 'description',
    // As a
    'as a': 'asA', 'vai trò': 'asA', 'role': 'asA', 'as a (role)': 'asA',
    // I want to
    'i want to': 'iWantTo', 'i want': 'iWantTo', 'hành động': 'iWantTo', 'muốn': 'iWantTo', 'want': 'iWantTo',
    // So that
    'so that': 'soThat', 'lợi ích': 'soThat', 'mục đích': 'soThat', 'benefit': 'soThat',
    // Epic
    'epic': 'epicName', 'feature/epic': 'epicName', 'nhóm': 'epicName', 'module': 'epicName',
    // Priority
    'priority': 'priority', 'độ ưu tiên': 'priority', 'ưu tiên': 'priority',
    // Points
    'story points': 'points', 'points': 'points', 'điểm': 'points', 'sp': 'points', 'estimate': 'points',
    // Acceptance Criteria
    'acceptance criteria': 'acceptanceCriteria', 'ac': 'acceptanceCriteria',
    'tiêu chí chấp nhận': 'acceptanceCriteria', 'tiêu chí': 'acceptanceCriteria', 'criteria': 'acceptanceCriteria',
    // Sprint
    'sprint': 'sprintName',
    // Assignee
    'assignee': 'assignee', 'người thực hiện': 'assignee', 'assigned to': 'assignee',
    // Project Key (Jira)
    'project key': 'projectKey', 'project': 'projectKey', 'key': 'projectKey',
    'mã dự án': 'projectKey', 'dự án': 'projectKey', 'project code': 'projectKey',
};

const PRIORITY_MAP = {
    'low': 'Low', 'thấp': 'Low', 'l': 'Low', '1': 'Low',
    'medium': 'Medium', 'trung bình': 'Medium', 'm': 'Medium', '2': 'Medium', 'normal': 'Medium',
    'high': 'High', 'cao': 'High', 'h': 'High', '3': 'High',
    'critical': 'Critical', 'rất cao': 'Critical', 'c': 'Critical', '4': 'Critical', 'urgent': 'Critical',
};

function normalizeHeader(header) {
    return String(header).toLowerCase().trim();
}

function mapPriority(value) {
    if (!value) return 'Medium';
    const normalized = String(value).toLowerCase().trim();
    return PRIORITY_MAP[normalized] || 'Medium';
}

function mapPoints(value) {
    if (!value) return 0;
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
}

export function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (jsonData.length === 0) {
                    reject(new Error('File Excel trống hoặc không có dữ liệu'));
                    return;
                }

                // Auto-detect column mapping
                const rawHeaders = Object.keys(jsonData[0]);
                const columnMapping = {};
                const unmappedHeaders = [];

                rawHeaders.forEach(header => {
                    const normalized = normalizeHeader(header);
                    if (COLUMN_MAP[normalized]) {
                        columnMapping[header] = COLUMN_MAP[normalized];
                    } else {
                        // Try partial match
                        const partialMatch = Object.keys(COLUMN_MAP).find(key =>
                            normalized.includes(key) || key.includes(normalized)
                        );
                        if (partialMatch) {
                            columnMapping[header] = COLUMN_MAP[partialMatch];
                        } else {
                            unmappedHeaders.push(header);
                        }
                    }
                });

                // Parse rows to stories
                const stories = jsonData.map(row => {
                    const story = {};
                    Object.entries(columnMapping).forEach(([excelCol, storyField]) => {
                        let value = row[excelCol];
                        if (storyField === 'priority') value = mapPriority(value);
                        else if (storyField === 'points') value = mapPoints(value);
                        else value = String(value || '').trim();
                        story[storyField] = value;
                    });
                    // Ensure title exists
                    if (!story.title) {
                        story.title = story.description || story.iWantTo || 'Untitled Story';
                    }
                    return story;
                }).filter(s => s.title && s.title !== 'Untitled Story');

                resolve({
                    stories,
                    rawHeaders,
                    columnMapping,
                    unmappedHeaders,
                    totalRows: jsonData.length,
                    sheetName,
                });
            } catch (err) {
                reject(new Error('Không thể đọc file Excel: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsArrayBuffer(file);
    });
}

export function generateSampleExcel() {
    const sampleData = [
        { 'Project Key': 'C4TD', 'Feature/Epic': 'Quản lý người dùng', 'User Story Title': 'Đăng ký tài khoản', 'As a': 'Người dùng mới', 'I want to': 'Đăng ký tài khoản bằng email', 'So that': 'Có thể truy cập hệ thống', 'Priority': 'High', 'Story Points': 5, 'Acceptance Criteria': '- Validate email format\n- Mật khẩu tối thiểu 8 ký tự\n- Gửi email xác nhận' },
        { 'Project Key': 'C4TD', 'Feature/Epic': 'Quản lý người dùng', 'User Story Title': 'Đăng nhập', 'As a': 'Người dùng đã đăng ký', 'I want to': 'Đăng nhập bằng email/mật khẩu', 'So that': 'Truy cập tài khoản cá nhân', 'Priority': 'High', 'Story Points': 3, 'Acceptance Criteria': '- Remember me option\n- Hiển thị lỗi rõ ràng\n- Lock sau 5 lần sai' },
        { 'Project Key': 'C4TD', 'Feature/Epic': 'Quản lý người dùng', 'User Story Title': 'Quên mật khẩu', 'As a': 'Người dùng', 'I want to': 'Reset mật khẩu qua email', 'So that': 'Khôi phục quyền truy cập', 'Priority': 'Medium', 'Story Points': 3, 'Acceptance Criteria': '- Link reset hết hạn sau 24h\n- Yêu cầu mật khẩu mới khác cũ' },
        { 'Project Key': 'C4TD', 'Feature/Epic': 'Dashboard', 'User Story Title': 'Xem tổng quan', 'As a': 'Admin', 'I want to': 'Xem dashboard tổng quan', 'So that': 'Nắm được tình hình hệ thống', 'Priority': 'Medium', 'Story Points': 8, 'Acceptance Criteria': '- Hiển thị số liệu real-time\n- Biểu đồ trực quan' },
        { 'Project Key': 'C4TD', 'Feature/Epic': 'Dashboard', 'User Story Title': 'Xuất báo cáo', 'As a': 'Admin', 'I want to': 'Xuất báo cáo PDF/Excel', 'So that': 'Chia sẻ cho stakeholders', 'Priority': 'Low', 'Story Points': 5, 'Acceptance Criteria': '- Hỗ trợ PDF và Excel\n- Tùy chỉnh thời gian' },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'User Stories');

    // Set column widths
    ws['!cols'] = [
        { wch: 14 }, { wch: 22 }, { wch: 25 }, { wch: 20 }, { wch: 30 },
        { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 40 },
    ];

    XLSX.writeFile(wb, 'JiraPO_Template.xlsx');
}
