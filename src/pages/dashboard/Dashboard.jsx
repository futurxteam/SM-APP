import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ExpenseDonutChart from '../../components/charts/ExpenseDonutChart';
import GanttTimelineChart from '../../components/charts/GanttTimelineChart';
import DailyExpenditureReport from '../../components/dashboard/DailyExpenditureReport';
import { Building2, IndianRupee, AlertCircle, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Dashboard() {
  const { user, isSuperAdmin, isSiteSupervisor } = useAuthStore();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [expensesData, setExpensesData] = useState({});
  const [ganttProjects, setGanttProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [overviewRes, expensesRes, ganttRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/expenses'),
          api.get('/analytics/timeline'),
        ]);

        setOverview(overviewRes.data.data);

        // Merge company purchases & petty cash category data for donut chart
        const merged = {};
        expensesRes.data.data.companyPurchases?.forEach(item => {
          merged[item._id] = (merged[item._id] || 0) + item.total;
        });
        expensesRes.data.data.pettyCash?.forEach(item => {
          merged[item._id] = (merged[item._id] || 0) + item.total;
        });
        setExpensesData(merged);

        setGanttProjects(ganttRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard analytics', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading dashboard analytics & project metrics..." style={{ minHeight: '60vh' }} />;
  }

  const { projects, financials, pendingRefillRequestsCount } = overview || {};

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
          <h1 style={{ fontSize: 'clamp(16px, 4vw, 20px)', color: '#FFFFFF' }}>Welcome back, {user?.name}</h1>
          <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '4px' }}>
            Hygge Architects Site & Project Operations Overview
          </p>
        </div>
        <button 
          onClick={() => navigate('/projects')}
          className="btn btn-primary"
          style={{ backgroundColor: '#2563EB', borderColor: '#2563EB', flexShrink: 0 }}
        >
          <span>View All Projects</span>
          <ArrowUpRight size={16} />
        </button>
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
              <div style={{ fontSize: '12px' }}>Site supervisors have requested fund refills due to low/exhausted cash balance.</div>
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

      {/* Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-muted">Total Projects</span>
            <Building2 size={20} color="var(--color-brand)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>
            {projects?.total || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {projects?.active || 0} Ongoing • {projects?.completed || 0} Completed
          </div>
        </Card>

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

      {/* Admin Daily & Overall Expenditure Report Panel with Single Unified Filter */}
      {!isSiteSupervisor() && <DailyExpenditureReport />}

      {/* Middle Row: Donut Chart & Gantt Schedule Timeline */}
      {!isSiteSupervisor() && <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
        gap: '20px'
      }}>
        {/* Category Expenses Donut */}
        <Card>
          <h3 style={{ marginBottom: '16px' }}>Expense Breakdown by Category</h3>
          <ExpenseDonutChart dataMap={expensesData} />
        </Card>

        {/* Project Schedules Timeline */}
        <Card>
          <h3 style={{ marginBottom: '16px' }}>Project Schedule Timeline</h3>
          <GanttTimelineChart projects={ganttProjects} />
        </Card>
      </div>}
    </div>
  );
}
