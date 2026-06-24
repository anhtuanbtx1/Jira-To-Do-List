import React from 'react';
import { StoreProvider, useStore } from './data/store';
import Sidebar from './components/Sidebar';
import JiraProjectSelector from './components/JiraProjectSelector';
import StoryModal from './components/StoryModal';
import EpicModal from './components/EpicModal';
import SprintModal from './components/SprintModal';
import ProjectModal from './components/ProjectModal';
import Dashboard from './pages/Dashboard';
import BacklogPage from './pages/BacklogPage';
import BoardPage from './pages/BoardPage';
import EpicsPage from './pages/EpicsPage';
import SprintPage from './pages/SprintPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import LogWorkPage from './pages/LogWorkPage';
import LogWorkStatsPage from './pages/LogWorkStatsPage';
import ReleaseNotePage from './pages/ReleaseNotePage';
import { LayoutDashboard, List, Columns3, Layers, CalendarDays, Upload, Settings, Clock, BarChart3, FileText } from 'lucide-react';

const PAGE_CONFIG = {
  dashboard: { title: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
  backlog: { title: 'Backlog', icon: List, component: BacklogPage },
  board: { title: 'Board', icon: Columns3, component: BoardPage },
  epics: { title: 'Epics', icon: Layers, component: EpicsPage },
  sprints: { title: 'Sprints', icon: CalendarDays, component: SprintPage },
  releasenote: { title: 'AI Release Note', icon: FileText, component: ReleaseNotePage },
  import: { title: 'Import Excel', icon: Upload, component: ImportPage },
  settings: { title: 'Cấu hình Jira', icon: Settings, component: SettingsPage },
  logwork: { title: 'Log Work (Tempo)', icon: Clock, component: LogWorkPage },
  logworkstats: { title: 'Thống kê Log Work', icon: BarChart3, component: LogWorkStatsPage },
};

function AppContent() {
  const { state, currentProject } = useStore();
  const page = PAGE_CONFIG[state.currentPage] || PAGE_CONFIG.dashboard;
  const PageComponent = page.component;
  const PageIcon = page.icon;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="main-header">
          <div className="flex gap-12" style={{ alignItems: 'center' }}>
            <PageIcon size={22} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h2>{page.title}</h2>
              {currentProject && (
                <span className="text-xs text-muted">{currentProject.name}</span>
              )}
            </div>
          </div>
          <div className="main-header-actions">
            <JiraProjectSelector />
          </div>
        </header>
        <div className="page-content">
          <PageComponent />
        </div>
      </main>

      {/* Modals */}
      {state.showStoryModal && <StoryModal />}
      {state.showEpicModal && <EpicModal />}
      {state.showSprintModal && <SprintModal />}
      {state.showProjectModal && <ProjectModal />}

      {/* Notification */}
      {state.notification && (
        <div className={`notification-toast ${state.notification.type}`}>
          {state.notification.message}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}

export default App;
