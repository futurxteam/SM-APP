import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  Calendar,
  IndianRupee,
  Building2,
  Download,
  RefreshCw,
  FileText,
  Filter,
  Users,
  Eye,
  ExternalLink,
  Wallet,
  ShoppingBag,
  HardHat,
  Search,
  ArrowRight
} from 'lucide-react';

export default function DailyExpenditureReport() {
  const navigate = useNavigate();

  // Unified Filter State
  const [filterMode, setFilterMode] = useState('today'); // 'today' | 'yesterday' | 'month' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedProject, setSelectedProject] = useState('all');

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'transactions'
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptModalUrl, setReceiptModalUrl] = useState(null);

  // Fetch projects list once for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjectsList(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch projects list for filter', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch Report Data based on current filter
  const fetchReport = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params = {};
      if (selectedProject && selectedProject !== 'all') {
        params.projectId = selectedProject;
      }

      if (filterMode === 'all') {
        params.range = 'all';
      } else if (filterMode === 'month') {
        params.startDate = dayjs().startOf('month').format('YYYY-MM-DD');
        params.endDate = dayjs().format('YYYY-MM-DD');
      } else if (filterMode === 'yesterday') {
        params.date = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
      } else if (filterMode === 'custom') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        // default today or custom single date
        params.date = selectedDate || dayjs().format('YYYY-MM-DD');
      }

      const res = await api.get('/analytics/daily-expenditure', { params });
      setReportData(res.data.data);
    } catch (err) {
      console.error('Failed to load daily expenditure report', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterMode, selectedDate, startDate, endDate, selectedProject]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilterPreset = (mode) => {
    setFilterMode(mode);
    if (mode === 'today') {
      setSelectedDate(dayjs().format('YYYY-MM-DD'));
    } else if (mode === 'yesterday') {
      setSelectedDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'));
    } else if (mode === 'month') {
      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setEndDate(dayjs().format('YYYY-MM-DD'));
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.itemizedTransactions) return;

    const headers = ['Source', 'Date', 'Project Code', 'Project Name', 'Category', 'Description', 'Amount (INR)', 'Recorded By'];
    const rows = reportData.itemizedTransactions.map(t => [
      `"${t.sourceLabel || t.source}"`,
      `"${dayjs(t.date).format('YYYY-MM-DD HH:mm')}"`,
      `"${t.projectCode || ''}"`,
      `"${(t.projectName || '').replace(/"/g, '""')}"`,
      `"${t.category || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount || 0,
      `"${(t.addedBy || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenditure_Report_${dayjs().format('YYYY-MM-DD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportData?.summary || {};
  const projectBreakdown = reportData?.projectBreakdown || [];
  const itemizedTransactions = reportData?.itemizedTransactions || [];

  // Filter itemized transactions by search term
  const filteredTransactions = itemizedTransactions.filter(t => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      (t.description && t.description.toLowerCase().includes(s)) ||
      (t.projectName && t.projectName.toLowerCase().includes(s)) ||
      (t.projectCode && t.projectCode.toLowerCase().includes(s)) ||
      (t.category && t.category.toLowerCase().includes(s)) ||
      (t.addedBy && t.addedBy.toLowerCase().includes(s))
    );
  });

  const getSourceBadgeStyle = (source) => {
    if (source === 'company_purchase') {
      return { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' };
    }
    if (source === 'labour_wage') {
      return { backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' };
    }
    return { backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header & Unified Single Filter Bar */}
      <Card style={{ padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                <IndianRupee size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Daily & Overall Expenditure Report
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
                  Unified expenditure ledger across all sites: Company Direct Purchases + Petty Cash + Labour Wages
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fetchReport(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={isRefreshing}
              title="Refresh Data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              disabled={itemizedTransactions.length === 0}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Unified Filter Strip */}
        <div style={{
          backgroundColor: '#F8FAFC',
          padding: '16px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px'
        }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <Filter size={14} /> Filter:
            </span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Date' }
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleFilterPreset(preset.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterMode === preset.id ? '1px solid #2563EB' : '1px solid #CBD5E1',
                  backgroundColor: filterMode === preset.id ? '#2563EB' : '#FFFFFF',
                  color: filterMode === preset.id ? '#FFFFFF' : '#334155',
                  transition: 'all 0.15s ease'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date Picker Input */}
          {(filterMode === 'today' || filterMode === 'yesterday' || filterMode === 'custom') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={14} color="#64748B" />
              {filterMode === 'custom' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="form-control"
                    style={{ padding: '5px 10px', fontSize: '12px', height: '32px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-control"
                    style={{ padding: '5px 10px', fontSize: '12px', height: '32px' }}
                  />
                </div>
              ) : (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setFilterMode('custom-single');
                  }}
                  className="form-control"
                  style={{ padding: '5px 10px', fontSize: '12px', height: '32px' }}
                />
              )}
            </div>
          )}

          {/* Project Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <Building2 size={14} color="#64748B" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="form-control"
              style={{ padding: '5px 12px', fontSize: '12px', height: '32px', minWidth: '180px' }}
            >
              <option value="all">All Projects ({projectsList.length})</option>
              {projectsList.map(p => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading indicator */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Aggregating daily expenditures and reconciliations..." style={{ minHeight: '260px' }} />
      ) : (
        <>
          {/* Key KPI Metric Cards for Filtered Period */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px'
          }}>
            {/* Grand Total Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #0F233E 100%)',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(15, 35, 62, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#93C5FD', fontWeight: 600 }}>Total Period Expenditure</span>
                <IndianRupee size={20} color="#60A5FA" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '12px', letterSpacing: '-0.5px' }}>
                ₹{(summary.totalExpenditure || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#BFDBFE', marginTop: '6px' }}>
                {summary.transactionsCount || 0} total transactions across sites
              </div>
            </div>

            {/* Direct Company Purchases */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Company Direct Purchases</span>
                <ShoppingBag size={20} color="#2563EB" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '12px', color: '#1E293B' }}>
                ₹{(summary.totalCompanyPurchases || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Materials & assets paid directly by company
              </div>
            </div>

            {/* Site Petty Cash Expenses */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Site Petty Cash Expenses</span>
                <Wallet size={20} color="#7C3AED" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '12px', color: '#1E293B' }}>
                ₹{(summary.totalPettyCashExpenses || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Includes site petty cash purchases & wages
              </div>
            </div>

            {/* Labour Charges */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#065F46', fontWeight: 600 }}>Labour Wages (Attendance)</span>
                <HardHat size={20} color="#059669" />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '12px', color: '#047857' }}>
                ₹{(summary.totalLabourCharges || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                Synced directly with supervisor attendance
              </div>
            </div>
          </div>

          {/* Tab Navigation: Project Breakdown vs Itemized Transactions */}
          <div style={{ display: 'flex', borderBottom: '1px solid #CBD5E1', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('projects')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'projects' ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === 'projects' ? '#2563EB' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building2 size={16} />
              <span>Project-wise Breakdown ({projectBreakdown.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'transactions' ? '3px solid #2563EB' : '3px solid transparent',
                color: activeTab === 'transactions' ? '#2563EB' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FileText size={16} />
              <span>Itemized Daily Transactions ({itemizedTransactions.length})</span>
            </button>
          </div>

          {/* TAB 1: Project-by-Project Breakdown Table */}
          {activeTab === 'projects' && (
            <Card style={{ padding: '0', overflow: 'hidden' }}>
              <div className="table-container">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Project</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Supervisor / Manager</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Direct Purchases</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Petty Cash</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Labour Wages</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Total Spent</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Petty Cash Balance</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No project expenditure records found for this filter period.
                        </td>
                      </tr>
                    ) : (
                      projectBreakdown.map(p => (
                        <tr key={p.projectId} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '14px' }}>{p.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>{p.code}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <Badge variant={p.status === 'active' ? 'active' : p.status === 'completed' ? 'completed' : 'upcoming'}>
                              {p.status}
                            </Badge>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>
                            <div><strong>Sup:</strong> {p.supervisorName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Mgr: {p.managerName}</div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>
                            ₹{p.companyPurchases.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500 }}>
                            ₹{p.pettyCashExpenses.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                            ₹{p.labourCharges.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                            ₹{p.totalSpent.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: p.currentBalance < 5000 ? '#DC2626' : '#2563EB' }}>
                            ₹{p.currentBalance.toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => navigate(`/projects/${p.projectId}`)}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>View</span>
                              <ArrowRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {projectBreakdown.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: '#F1F5F9', fontWeight: 700, borderTop: '2px solid #CBD5E1' }}>
                        <td colSpan={3} style={{ padding: '14px 16px', fontSize: '13px', textTransform: 'uppercase', color: '#0F172A' }}>
                          TOTAL OF ALL PROJECTS ({projectBreakdown.length})
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#1E293B' }}>
                          ₹{(summary.totalCompanyPurchases || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#1E293B' }}>
                          ₹{(summary.totalPettyCashExpenses || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#047857' }}>
                          ₹{(summary.totalLabourCharges || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#0F172A', fontSize: '15px' }}>
                          ₹{(summary.totalExpenditure || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#2563EB' }}>
                          ₹{(projectBreakdown.reduce((s, p) => s + p.currentBalance, 0)).toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          )}

          {/* TAB 2: Itemized Daily Transactions Feed */}
          {activeTab === 'transactions' && (
            <Card style={{ padding: '0', overflow: 'hidden' }}>
              {/* Search Bar for transactions */}
              <div style={{ padding: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={16} color="#64748B" />
                <input
                  type="text"
                  placeholder="Filter transactions by project, description, category or recorder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', maxWidth: '420px', fontSize: '13px' }}
                />
                <span style={{ fontSize: '12px', color: '#64748B', marginLeft: 'auto' }}>
                  Showing {filteredTransactions.length} of {itemizedTransactions.length} records
                </span>
              </div>

              <div className="table-container">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Date & Time</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Project</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Source</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Amount</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Recorded By</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#475569' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                          No itemized transaction records match this query.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map(tx => (
                        <tr key={tx._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569', whiteSpace: 'nowrap' }}>
                            {dayjs(tx.date).format('YYYY-MM-DD')}
                            <div style={{ fontSize: '10px', color: '#94A3B8' }}>{dayjs(tx.date).format('hh:mm A')}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>{tx.projectName}</div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{tx.projectCode}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              ...getSourceBadgeStyle(tx.source)
                            }}>
                              {tx.sourceLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: '#F1F5F9',
                              color: '#334155',
                              textTransform: 'capitalize'
                            }}>
                              {tx.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#334155', maxWidth: '280px' }}>
                            {tx.description}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                            ₹{(tx.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                            {tx.addedBy}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {tx.receiptImage ? (
                              <button
                                type="button"
                                onClick={() => setReceiptModalUrl(tx.receiptImage)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} />
                                <span>Receipt</span>
                              </button>
                            ) : (
                              <span style={{ color: '#CBD5E1', fontSize: '12px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modal for Receipt Image Preview */}
      {receiptModalUrl && (
        <div
          onClick={() => setReceiptModalUrl(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Receipt / Invoice Document</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={receiptModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ExternalLink size={12} /> Open Full
                </a>
                <button
                  onClick={() => setReceiptModalUrl(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 10px' }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '12px' }}>
              <img
                src={receiptModalUrl}
                alt="Receipt Document"
                style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
