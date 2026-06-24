/**
 * Release Note API - Giao tiếp với FastAPI backend
 */

const BACKEND_BASE = '/release-api';

async function apiCall(endpoint, method = 'POST', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(`${BACKEND_BASE}${endpoint}`, opts);
    if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try {
            const err = await resp.json();
            detail = err.detail || detail;
        } catch { /* ignore */ }
        throw new Error(detail);
    }
    return resp.json();
}

export async function testBackendHealth() {
    return apiCall('/health', 'GET');
}

export async function fetchTickets(jiraConfig, ticketKeys, jql) {
    return apiCall('/api/fetch-tickets', 'POST', {
        jira: jiraConfig,
        ticket_keys: ticketKeys,
        jql: jql || null,
    });
}

export async function fetchConfluencePages(confluenceConfig, urls) {
    return apiCall('/api/fetch-confluence', 'POST', {
        confluence: confluenceConfig,
        urls,
    });
}

export async function generateReleaseNote({
    jiraConfig, confluenceConfig,
    version, releaseDate, projectName,
    ticketKeys, jql,
    confluenceUrls, extraNotes,
}) {
    return apiCall('/api/generate-release-note', 'POST', {
        jira: jiraConfig,
        confluence: confluenceConfig || null,
        version,
        release_date: releaseDate,
        project_name: projectName,
        ticket_keys: ticketKeys || [],
        jql: jql || null,
        confluence_urls: confluenceUrls || [],
        extra_notes: extraNotes || null,
    });
}
