import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExpenseDonutChart from '../../components/charts/ExpenseDonutChart';
import GanttTimelineChart from '../../components/charts/GanttTimelineChart';
import DailyExpenditureReport from '../../components/dashboard/DailyExpenditureReport';
import {
  Building2,
  IndianRupee,
  AlertCircle,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Wallet,
  ArrowRight,
  Filter,
  Search,
  FolderKanban,
  RotateCcw,
  MapPin,
  Calendar
} from 'lucide-react';

const scheduleBadgeVariant = (status) => ({
  completed: 'completed',
  in_progress: 'ongoing',
  ongoing: 'ongoing',
  active: 'ongoing',
  delayed: 'on_hold',
  on_hold: 'on_hold',
  not_started: 'upcoming',
  upcoming: 'upcoming'
}[status] || 'ongoing');

export default function Dashboard() {
  const { user, isSuperAdmin, isSiteSupervisor } = useAuthStore();
  const navigate = useNavigate();

  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [overview, setOverview] = useState(null);
  const [allProjectsList, setAllProjectsList] = useState([]);
  const [expensesData, setExpensesData] = useState({});
  const [ganttProjects, setGanttProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async (projId = selectedProjectId, isInitial = false) => {
    if (!isInitial) setIsRefreshing(true);
    try {
      const params = projId && projId !== 'all' ? { projectId: projId } : {};
      const [overviewRes, expensesRes, ganttRes] = await Promise.all([
        api.get('/analytics/overview', { params }),
        api.get('/analytics/expenses', { params }),
        api.get('/analytics/timeline', { params }),
      ]);

      const data = overviewRes.data.data;
      setOverview(data);

      // Keep master list of projects from breakdown when available
      if (data?.projectBreakdown?.length > 0 && allProjectsList.length === 0) {
        setAllProjectsList(data.projectBreakdown);
      } else if (allProjectsList.length === 0 && data?.projectBreakdown) {
        setAllProjectsList(data.projectBreakdown);
      }

      // Merge company purchases & petty cash category data for donut chart
      const merged = {};
      expensesRes.data.data.companyPurchases?.forEach(item => {
        merged[item._id] = (merged[item._id] || 0) + item.total;
      });
      expensesRes.data.data.pettyCash?.forEach(item => {
        merged[item._id] = (merged[item._id] || 0) + item.total;
      });
      setExpensesData(merged);

      setGanttProjects(ganttRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard analytics', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData('all', true);
  }, []);

  const handleProjectSelect = (projId) => {
    setSelectedProjectId(projId);
    loadDashboardData(projId);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard analytics & project metrics..." style={{ minHeight: '60vh' }} />;
  }

  const { projects, financials, pendingRefillRequestsCount, projectBreakdown = [] } = overview || {};

  // Find active project if single project is selected
  const activeSelectedProject = selectedProjectId !== 'all'
    ? (allProjectsList.find(p => p._id === selectedProjectId) || projectBreakdown.find(p => p._id === selectedProjectId))
    : null;

  // Filter projects for the project-wise cards grid
  const displayedProjects = (projectBreakdown.length > 0 ? projectBreakdown : allProjectsList).filter(p => {
    if (!projectSearch.trim()) return true;
    const query = projectSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.code && p.code.toLowerCase().includes(query)) ||
      (p.location && p.location.toLowerCase().includes(query)) ||
      (p.clientName && p.clientName.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: '#1E3A5F',
        color: '#FFFFFF',
        padding: '20px 24px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <h1 style={{ fontSize: 'clamp(16px, 4vw, 20px)', color: '#FFFFFF', margin: 0 }}>
            Welcome back, {user?.name}
          </h1>
          <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px', marginBottom: 0 }}>
            Hygge Architects Site & Project Operations Overview
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => navigate('/projects')}
            className="btn btn-primary"
            style={{ backgroundColor: '#2563EB', borderColor: '#2563EB', flexShrink: 0 }}
          >
            <span>View All Projects</span>
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>

      {/* Project Selector & Scope Control Bar */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1E3A5F',
            fontWeight: 600,
            fontSize: '13px'
          }}>
            <Filter size={16} color="#2563EB" />
            <span>Dashboard Scope:</span>
          </div>

          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectSelect(e.target.value)}
            className="form-control"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 500,
              minWidth: '220px',
              height: '36px',
              borderRadius: '6px',
              borderColor: '#CBD5E1',
              backgroundColor: '#F8FAFC'
            }}
          >
            <option value="all">
              All Projects (Overall Combined + Project-wise)
            </option>
            {(allProjectsList.length > 0 ? allProjectsList : projectBreakdown).map(p => (
              <option key={p._id} value={p._id}>
                {p.code ? `[${p.code}] ` : ''}{p.name}
              </option>
            ))}
          </select>

          {selectedProjectId !== 'all' && (
            <button
              onClick={() => handleProjectSelect('all')}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
              title="Reset to All Projects view"
            >
              <RotateCcw size={13} />
              <span>Show All Projects</span>
            </button>
          )}
        </div>

        {activeSelectedProject && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant={scheduleBadgeVariant(activeSelectedProject.status)}>
              {(activeSelectedProject.status || 'ongoing').replaceAll('_', ' ')}
            </Badge>
            <button
              onClick={() => navigate(`/projects/${activeSelectedProject._id}`)}
              className="btn btn-outline btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
            >
              <span>Go to Site Workspace</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Action Alerts / Pending Actions Banner */}
      {pendingRefillRequestsCount > 0 && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#92400E'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={20} color="#D97706" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {pendingRefillRequestsCount} Petty Cash Refill Request(s) Pending Approval
              </div>
              <div style={{ fontSize: '12px' }}>
                Site supervisors have requested fund refills due to low/exhausted cash balance.
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/projects')}
            className="btn btn-sm"
            style={{ backgroundColor: '#D97706', color: '#FFF' }}
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Stat Cards Grid (Shows Selected Project or Consolidated Total) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Project Scope / Total Projects */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-muted">
              {selectedProjectId === 'all' ? 'Total Projects' : 'Selected Project'}
            </span>
            <Building2 size={20} color="var(--color-brand)" />
          </div>
          <div style={{
            fontSize: selectedProjectId === 'all' ? '28px' : '18px',
            fontWeight: 700,
            marginTop: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {selectedProjectId === 'all' 
              ? (projects?.total || 0)
              : (activeSelectedProject?.name || '1 Project')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {selectedProjectId === 'all' ? (
              `${projects?.active || 0} Ongoing • ${projects?.completed || 0} Completed`
            ) : (
              `${activeSelectedProject?.code || 'PRJ'} • ${(activeSelectedProject?.status || 'ongoing').replaceAll('_', ' ')}`
            )}
          </div>
        </Card>

        {/* Card 2: Total Expenditure */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-muted">Total Expenditure</span>
            <IndianRupee size={20} color="var(--color-brand)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: 'var(--color-text-primary)' }}>
            ₹{(financials?.grandTotalExpense || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Direct Purchases + Petty Cash Expenses
          </div>
        </Card>

        {/* Card 3: Company Purchases */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-muted">Company Purchases</span>
            <Building2 size={20} color="var(--color-info)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px' }}>
            ₹{(financials?.companyPurchasesTotal || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Direct invoice purchases
          </div>
        </Card>

        {/* Card 4: Petty Cash Balance */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-muted">Petty Cash Balance</span>
            <CheckCircle2 size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '8px', color: 'var(--color-success)' }}>
            ₹{(financials?.totalPettyCashBalance || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Spent: ₹{(financials?.totalPettyCashExpenses || 0).toLocaleString('en-IN')}
          </div>
        </Card>
      </div>

      {/* PROJECT-WISE BREAKDOWN SECTION: Displayed when viewing All Projects */}
      {selectedProjectId === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={20} color="#1E3A5F" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Project-Wise Financial Breakdown
                </h2>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#E2E8F0',
                  color: '#334155',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {displayedProjects.length} {displayedProjects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '3px 0 0 0' }}>
                Individual expenditure, company purchases, and petty cash balances separated by site
              </p>
            </div>

            {/* Optional search filter if user has multiple projects */}
            {(projectBreakdown.length > 2 || allProjectsList.length > 2) && (
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter by project..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="form-control"
                  style={{
                    paddingLeft: '32px',
                    paddingRight: '10px',
                    fontSize: '12px',
                    height: '34px',
                    borderRadius: '6px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Project-Wise Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {displayedProjects.length === 0 ? (
              <Card style={{ padding: '30px', textAlign: 'center', gridColumn: '1 / -1', color: '#64748B' }}>
                No projects matched your criteria.
              </Card>
            ) : (
              displayedProjects.map(proj => (
                <div
                  key={proj._id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Header: Code, Name, Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #DBEAFE'
                        }}>
                          {proj.code || 'PROJECT'}
                        </span>
                        <Badge variant={scheduleBadgeVariant(proj.status)}>
                          {(proj.status || 'ongoing').replaceAll('_', ' ')}
                        </Badge>
                      </div>

                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#0F172A',
                        margin: '6px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={proj.name}>
                        {proj.name}
                      </h3>

                      {(proj.location || proj.clientName) && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#64748B',
                          marginTop: '3px'
                        }}>
                          <MapPin size={12} color="#94A3B8" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[proj.clientName, proj.location].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Metrics 3-Col Box Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    backgroundColor: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #F1F5F9'
                  }}>
                    {/* Total Expenditure */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                        Total Spent
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                        ₹{(proj.grandTotalExpense || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
                        Direct + Petty
                      </div>
                    </div>

                    {/* Company Purchases */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                        Purchases
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E3A5F', marginTop: '2px' }}>
                        ₹{(proj.companyPurchasesTotal || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '1px' }}>
                        Direct invoice
                      </div>
                    </div>

                    {/* Petty Cash Balance */}
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                        Petty Cash
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                        ₹{(proj.pettyCashBalance || 0).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>
                        Spent: ₹{(proj.pettyCashExpenses || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: '6px'
                  }}>
                    {proj.pendingRefills > 0 ? (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <ShieldAlert size={13} /> {proj.pendingRefills} Refill Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => handleProjectSelect(proj._id)}
                        className="btn btn-sm"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          padding: '0',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Isolate on Dashboard
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/projects/${proj._id}`)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        padding: '5px 10px'
                      }}
                    >
                      <span>Manage Site</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Admin Daily & Overall Expenditure Report Panel with Single Unified Filter */}
      {!isSiteSupervisor() && <DailyExpenditureReport />}

      {/* Middle Row: Donut Chart & Gantt Schedule Timeline */}
      {!isSiteSupervisor() && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: '20px'
        }}>
          {/* Category Expenses Donut */}
          <Card>
            <h3 style={{ marginBottom: '16px' }}>
              Expense Breakdown {selectedProjectId !== 'all' ? `(${activeSelectedProject?.name})` : 'by Category'}
            </h3>
            <ExpenseDonutChart dataMap={expensesData} />
          </Card>

          {/* Project Schedules Timeline */}
          <Card>
            <h3 style={{ marginBottom: '16px' }}>
              Project Schedule Timeline {selectedProjectId !== 'all' ? `(${activeSelectedProject?.name})` : ''}
            </h3>
            <GanttTimelineChart projects={ganttProjects} />
          </Card>
        </div>
      )}
    </div>
  );
}
