import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  RefreshCw, 
  Download, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Cpu, 
  UserCheck,
  Search
} from 'lucide-react';
import { getStructuredLogs, getBackendHealth, type StructuredLogEntry, type BackendHealth } from '../services/api';

interface LogsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsDrawer: React.FC<LogsDrawerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<StructuredLogEntry[]>([]);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogsAndHealth = async () => {
    setIsLoading(true);
    try {
      const [fetchedLogs, fetchedHealth] = await Promise.all([
        getStructuredLogs(200),
        getBackendHealth()
      ]);
      setLogs(fetchedLogs.reverse());
      setHealth(fetchedHealth);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogsAndHealth();
      const interval = setInterval(fetchLogsAndHealth, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch = 
      !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLevel && matchesSearch;
  });

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_analyzer_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/logs`, { method: 'DELETE' });
      localStorage.removeItem('aggroso_logs_v1');
      setLogs([]);
    } catch {
      setLogs([]);
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'AI_AGENT':
        return <span className="log-badge ai"><Cpu size={12} /> AI AGENT</span>;
      case 'AUDIT':
        return <span className="log-badge audit"><UserCheck size={12} /> AUDIT</span>;
      case 'ERROR':
        return <span className="log-badge error"><AlertCircle size={12} /> ERROR</span>;
      case 'WARN':
        return <span className="log-badge warn"><AlertTriangle size={12} /> WARN</span>;
      default:
        return <span className="log-badge info"><CheckCircle size={12} /> INFO</span>;
    }
  };

  return (
    <div className="logs-drawer-backdrop" onClick={onClose}>
      <div className="logs-drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="logs-drawer-header">
          <div className="logs-title-group">
            <div className="logs-icon-wrapper">
              <Terminal size={20} />
            </div>
            <div>
              <h3>Structured Application & AI Workflow Logs</h3>
              <p className="logs-subtitle">
                Real-time chronological events, agent thought streams, and human audit history
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close logs drawer">
            <X size={20} />
          </button>
        </div>

        {/* Backend & Model Status Bar */}
        <div className="logs-status-bar">
          <div className="status-pill">
            <span className={`status-dot ${health?.status === 'healthy' ? 'active' : 'warn'}`} />
            <span>Backend: {health?.status === 'healthy' ? 'Connected (Port 3001)' : 'Offline (Local Fallback)'}</span>
          </div>
          <div className="status-pill">
            <Cpu size={14} className="text-accent" />
            <span>Engine: <strong>{health?.aiEngine || 'Local Heuristics'}</strong></span>
          </div>
          <div className="status-pill">
            <span>Saved Contracts: <strong>{health?.contractsCount ?? 0}</strong></span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="logs-toolbar">
          <div className="logs-filters">
            {(['ALL', 'AI_AGENT', 'AUDIT', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                className={`filter-btn ${filterLevel === lvl ? 'active' : ''}`}
                onClick={() => setFilterLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="logs-actions">
            <div className="logs-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search log messages or modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="action-btn" onClick={fetchLogsAndHealth} title="Refresh Logs">
              <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            </button>
            <button className="action-btn" onClick={handleExportJson} title="Export JSON">
              <Download size={14} />
            </button>
            <button className="action-btn danger" onClick={handleClearLogs} title="Clear Logs">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Log Stream List */}
        <div className="logs-stream-body">
          {filteredLogs.length === 0 ? (
            <div className="logs-empty-state">
              <Terminal size={36} />
              <p>No log records matching your filter criteria.</p>
              <span>Perform an action or upload a contract to generate structured logs.</span>
            </div>
          ) : (
            <div className="logs-list">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div 
                    key={log.id} 
                    className={`log-row ${log.level.toLowerCase()}`}
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div className="log-row-main">
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {getLevelBadge(log.level)}
                      <span className="log-module">[{log.module}]</span>
                      <span className="log-message">{log.message}</span>
                      {log.metadata && (
                        <span className="log-meta-toggle">
                          {isExpanded ? 'Hide Details' : 'Details'}
                        </span>
                      )}
                    </div>
                    {isExpanded && log.metadata && (
                      <div className="log-row-details">
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
