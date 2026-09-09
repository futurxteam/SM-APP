import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  Building2, Calendar, IndianRupee, Users, ShoppingBag, 
  Wallet, Layers, CheckSquare, Flag, ArrowLeft, Download, 
  Plus, AlertCircle, CheckCircle, Clock, Upload, Trash2, Edit3, MapPin,
  Search, Check, Filter, X
} from 'lucide-react';
import dayjs from 'dayjs';
import LocationTrackingTab from '../../components/location/LocationTrackingTab';

export default function ProjectDetail() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isSiteSupervisor, isAccounts } = useAuthStore();

  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Module States
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));

  // Ensure supervisor never accesses location tab
  useEffect(() => {
    if (isSiteSupervisor() && activeTab === 'location') {
      setActiveTab('overview');
    }
  }, [activeTab, isSiteSupervisor]);
  const [attendanceData, setAttendanceData] = useState({ entries: [] });
  const [labourSummary, setLabourSummary] = useState([]);
  const [labourSummaryTotals, setLabourSummaryTotals] = useState(null);
  const [attendanceSubTab, setAttendanceSubTab] = useState('daily');
  const [paymentSummaryDate, setPaymentSummaryDate] = useState(dayjs().format('YYYY-MM-DD'));
  
  const [workersList, setWorkersList] = useState([]);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [globalWorkerResults, setGlobalWorkerResults] = useState([]);
  const [isSearchingWorker, setIsSearchingWorker] = useState(false);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({ name: '', phone: '', skill: 'General', dailyRate: 800, workerType: 'daily_wage' });

  const [purchases, setPurchases] = useState([]);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ category: 'Cement', description: '', amount: '' });
  const [purchaseFile, setPurchaseFile] = useState(null);

  const [pettyCash, setPettyCash] = useState(null);
  const [refillRequests, setRefillRequests] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'fuel', customCategoryName: '', description: '', amount: '' });
  const [expenseFile, setExpenseFile] = useState(null);

  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillForm, setRefillForm] = useState({ requestedAmount: '', reason: '' });
  const [openingBalanceForm, setOpeningBalanceForm] = useState('');
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  const [materials, setMaterials] = useState({ items: [], grandTotal: 0 });
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({ itemName: '', unit: 'bags', quantity: '', totalValue: '', remarks: '' });

  const [execution, setExecution] = useState(null);
  const [toolNameInput, setToolNameInput] = useState('');
  const [toolQtyInput, setToolQtyInput] = useState(1);

  const [closure, setClosure] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const [projRes, sumRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/summary`),
      ]);
      setProject(projRes.data.data);
      setSummary(sumRes.data.data);
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load modules on tab switch
  useEffect(() => {
    if (activeTab === 'attendance') {
      loadAttendance();
    }
    if (activeTab === 'purchases') loadPurchases();
    if (activeTab === 'pettycash') loadPettyCash();
    if (activeTab === 'materials') loadMaterials();
    if (activeTab === 'execution') loadExecution();
    if (activeTab === 'closure') loadClosure();
  }, [activeTab, attendanceDate]);

  // Load labour summary when subtab or filter date changes
  useEffect(() => {
    if (activeTab === 'attendance' && attendanceSubTab === 'labour') {
      loadLabourSummary();
    }
  }, [attendanceSubTab, paymentSummaryDate]);

  // Live master worker search with debounce
  useEffect(() => {
    if (!workerSearchQuery || !workerSearchQuery.trim()) {
      setGlobalWorkerResults([]);
      setIsSearchingWorker(false);
      return;
    }
    setIsSearchingWorker(true);
    const delayTimer = setTimeout(async () => {
      try {
        const res = await api.get(`/workers?search=${encodeURIComponent(workerSearchQuery.trim())}`);
        setGlobalWorkerResults(res.data.data || []);
      } catch (err) {
        console.error('Worker search failed', err);
      } finally {
        setIsSearchingWorker(false);
      }
    }, 250);

    return () => clearTimeout(delayTimer);
  }, [workerSearchQuery]);

  // --- ATTENDANCE ---
  const loadLabourSummary = async () => {
    try {
      const dateParam = paymentSummaryDate === 'all' ? 'all' : paymentSummaryDate;
      const labRes = await api.get(`/projects/${projectId}/attendance/labour-summary?date=${dateParam}`);
      setLabourSummary(labRes.data.data || []);
      setLabourSummaryTotals(labRes.data.totals || null);
    } catch (err) {
      console.error('Failed to load labour summary', err);
    }
  };

  const loadAttendance = async () => {
    setIsAttendanceLoading(true);
    try {
      const targetDate = attendanceDate;
      const dateParam = paymentSummaryDate === 'all' ? 'all' : paymentSummaryDate;
      
      const [attRes, workRes, labRes] = await Promise.all([
        api.get(`/projects/${projectId}/attendance?date=${targetDate}`),
        api.get(`/workers?projectId=${projectId}`),
        api.get(`/projects/${projectId}/attendance/labour-summary?date=${dateParam}`),
      ]);
      setAttendanceData(attRes.data.data || { entries: [] });
      setWorkersList(workRes.data.data || []);
      setLabourSummary(labRes.data.data || []);
      setLabourSummaryTotals(labRes.data.totals || null);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const handleAddWorkerToToday = (workerToAdd) => {
    const worker = workerToAdd;
    if (!worker) return;

    const workerId = worker._id;
    if (attendanceData.entries.some(e => (e.worker?._id || e.worker) === workerId)) {
      alert(`Worker "${worker.name}" is already added to today's attendance roster!`);
      return;
    }

    setAttendanceData(prev => ({
      ...prev,
      entries: [
        ...prev.entries,
        { 
          worker, 
          timeIn: '09:00', 
          timeOut: '18:00', 
          dutyType: 'full_day', 
          dutyHours: 8, 
          remarks: '',
          isPaid: false,
          amountPaid: 0
        }
      ]
    }));

    // Ensure worker is in workersList
    if (!workersList.some(w => w._id === workerId)) {
      setWorkersList(prev => [...prev, worker]);
    }
    setWorkerSearchQuery('');
  };

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const targetDate = attendanceDate;

      const formattedEntries = attendanceData.entries.map(e => ({
        worker: e.worker?._id || e.worker,
        timeIn: e.timeIn || '09:00',
        timeOut: e.timeOut || '18:00',
        dutyType: e.dutyType || 'full_day',
        dutyHours: e.dutyHours ? Number(e.dutyHours) : 8,
        remarks: e.remarks || '',
        isPaid: Boolean(e.amountPaid && Number(e.amountPaid) > 0),
        amountPaid: e.amountPaid ? Number(e.amountPaid) : 0,
      }));

      await api.post(`/projects/${projectId}/attendance`, {
        date: targetDate,
        entries: formattedEntries
      });
      alert('Attendance saved successfully!');
      loadAttendance();
      if (attendanceSubTab === 'labour') {
        loadLabourSummary();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleCreateWorker = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await api.post('/workers', { ...newWorkerForm, projectId });
      const worker = res.data.data;
      
      setIsWorkerModalOpen(false);
      setNewWorkerForm({ name: '', phone: '', skill: 'General', dailyRate: 800, workerType: 'daily_wage' });
      setWorkerSearchQuery('');

      // Auto add newly created or linked worker directly to today's attendance table without wiping existing list!
      setAttendanceData(prev => {
        const existingEntries = prev?.entries || [];
        if (existingEntries.some(ent => (ent.worker?._id || ent.worker) === worker._id)) {
          return prev;
        }
        return {
          ...prev,
          entries: [
            ...existingEntries,
            {
              worker,
              timeIn: '09:00',
              timeOut: '18:00',
              dutyType: 'full_day',
              dutyHours: 8,
              remarks: '',
              isPaid: false,
              amountPaid: 0
            }
          ]
        };
      });

      // Add to workers list in state so autocomplete keeps it
      setWorkersList(prev => prev.some(w => w._id === worker._id) ? prev : [...prev, worker]);

      alert(res.data.message || `Worker "${worker.name}" created and added to today's attendance list!`);
      // NOTE: Do not call loadAttendance() here as it would reload from DB and overwrite unsaved in-memory attendance!
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create worker');
    }
  };

  // --- PURCHASES ---
  const loadPurchases = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/purchases`);
      setPurchases(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseFile) {
      alert('Invoice image/document is required!');
      return;
    }
    const formData = new FormData();
    formData.append('category', purchaseForm.category);
    formData.append('description', purchaseForm.description);
    formData.append('amount', purchaseForm.amount);
    formData.append('invoiceImage', purchaseFile);

    try {
      await api.post(`/projects/${projectId}/purchases`, formData);
      setIsPurchaseModalOpen(false);
      setPurchaseForm({ category: 'Cement', description: '', amount: '' });
      setPurchaseFile(null);
      loadPurchases();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add purchase');
    }
  };

  // --- PETTY CASH ---
  const loadPettyCash = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/pettycash`);
      setPettyCash(res.data.data.pettyCash);
      setRefillRequests(res.data.data.refillRequests);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetOpeningBalance = async () => {
    try {
      await api.post(`/projects/${projectId}/pettycash/opening`, { amount: openingBalanceForm });
      setIsOpeningModalOpen(false);
      setOpeningBalanceForm('');
      loadPettyCash();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set opening balance');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseFile) {
      alert('Receipt image is mandatory for petty cash expenses!');
      return;
    }
    const formData = new FormData();
    formData.append('category', expenseForm.category);
    formData.append('customCategoryName', expenseForm.customCategoryName);
    formData.append('description', expenseForm.description);
    formData.append('amount', expenseForm.amount);
    formData.append('receiptImage', expenseFile);

    try {
      await api.post(`/projects/${projectId}/pettycash/expenses`, formData);
      setIsExpenseModalOpen(false);
      setExpenseForm({ category: 'fuel', customCategoryName: '', description: '', amount: '' });
      setExpenseFile(null);
      loadPettyCash();
    } catch (err) {
      if (err.response?.status === 402) {
        setIsExpenseModalOpen(false);
        setIsRefillModalOpen(true);
        setRefillForm({ requestedAmount: expenseForm.amount, reason: `Insufficient funds for ${expenseForm.category} expense` });
      } else {
        alert(err.response?.data?.message || 'Failed to add expense');
      }
    }
  };

  const handleRequestRefill = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/pettycash/refill-request`, refillForm);
      setIsRefillModalOpen(false);
      setRefillForm({ requestedAmount: '', reason: '' });
      loadPettyCash();
      alert('Cash refill request submitted to Admin/Accounts!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to request refill');
    }
  };

  const handleApproveRefill = async (requestId) => {
    try {
      await api.put(`/pettycash/refill-request/${requestId}/approve`, {});
      loadPettyCash();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve refill');
    }
  };

  // --- MATERIALS ---
  const loadMaterials = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/materials`);
      setMaterials(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/materials/items`, materialForm);
      setIsMaterialModalOpen(false);
      setMaterialForm({ itemName: '', unit: 'bags', quantity: '', totalValue: '', remarks: '' });
      loadMaterials();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add material');
    }
  };

  // --- EXECUTION ---
  const loadExecution = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/execution`);
      setExecution(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateExecution = async (field, value) => {
    try {
      const updated = { ...execution, [field]: value };
      const res = await api.put(`/projects/${projectId}/execution`, updated);
      setExecution(res.data.data);
    } catch (err) {
      alert('Failed to update execution item');
    }
  };

  const handleAddTool = async () => {
    if (!toolNameInput) return;
    const updatedTools = [...(execution?.tools || []), { toolName: toolNameInput, quantity: Number(toolQtyInput) }];
    try {
      const res = await api.put(`/projects/${projectId}/execution`, { tools: updatedTools });
      setExecution(res.data.data);
      setToolNameInput('');
      setToolQtyInput(1);
    } catch (err) {
      alert('Failed to add tool');
    }
  };

  // --- CLOSURE ---
  const loadClosure = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/closure`);
      setClosure(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateClosureText = async (field, val) => {
    try {
      const res = await api.put(`/projects/${projectId}/closure`, { [field]: val });
      setClosure(res.data.data);
    } catch (err) {
      alert('Failed to update closure requirement');
    }
  };

  const dailyAttendanceSummary = useMemo(() => {
    let totalWages = 0;
    let totalPaid = 0;
    const entries = attendanceData.entries || [];

    entries.forEach(entry => {
      const rate = Number(entry.worker?.dailyRate || 0);
      let multiplier = 1;
      if (entry.dutyType === 'half_day') multiplier = 0.5;
      else if (entry.dutyType === 'overtime') multiplier = 1.5;
      else if (entry.dutyType === 'custom_hours') multiplier = (Number(entry.dutyHours) || 8) / 8;

      totalWages += rate * multiplier;
      totalPaid += Number(entry.amountPaid || 0);
    });

    const diff = totalPaid - totalWages; // positive = extra amount paid over wages
    const extra = diff > 0 ? diff : 0;
    const balanceDue = diff < 0 ? Math.abs(diff) : 0;

    return {
      presentCount: entries.length,
      totalWages: Math.round(totalWages),
      totalPaid: Math.round(totalPaid),
      extra: Math.round(extra),
      balanceDue: Math.round(balanceDue),
      diff: Math.round(diff)
    };
  }, [attendanceData]);

  if (isLoading || !project) {
    return <LoadingSpinner size="lg" text="Loading project details & workspace..." style={{ minHeight: '60vh' }} />;
  }

  const { financials } = summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back Button & Project Banner Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={() => navigate('/projects')} className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge variant={project.status}>{project.status.replace('_', ' ')}</Badge>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-brand)' }}>{project.code}</span>
        </div>
      </div>

      <Card style={{ backgroundColor: '#FFFFFF', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(19px, 3.5vw, 24px)', fontWeight: 700, margin: 0 }}>{project.name}</h1>
            <p className="text-muted" style={{ marginTop: '4px', fontSize: '13px' }}>
              Client: {project.clientName || 'N/A'} • Location: {project.location || 'N/A'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href={`/api/exports/project/${projectId}/pdf`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
              <Download size={14} />
              <span>Export PDF Summary</span>
            </a>
          </div>
        </div>
      </Card>

      {/* 9 Module Navigation Tabs */}
      <div className="tabs-header-wrapper">
        <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          {!isSiteSupervisor() && (
            <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> Location & Tracking
              </span>
            </button>
          )}
          <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>Attendance</button>
          <button className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>Direct Purchases</button>
          <button className={`tab-btn ${activeTab === 'pettycash' ? 'active' : ''}`} onClick={() => setActiveTab('pettycash')}>Petty Cash</button>
          <button className={`tab-btn ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>Materials List</button>
          <button className={`tab-btn ${activeTab === 'execution' ? 'active' : ''}`} onClick={() => setActiveTab('execution')}>Site Execution</button>
          <button className={`tab-btn ${activeTab === 'closure' ? 'active' : ''}`} onClick={() => setActiveTab('closure')}>Site Closure</button>
          <button className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Schedule</button>
        </div>
        <div className="tabs-scroll-indicator">
          <span>👈 Scroll tabs 👉</span>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="kpi-grid-4">
            <Card className="kpi-compact-card">
              <div className="text-muted">Total Direct Purchases</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>₹{(financials?.companyPurchasesTotal || 0).toLocaleString('en-IN')}</div>
            </Card>

            <Card className="kpi-compact-card">
              <div className="text-muted">Petty Cash Expenses</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#D97706' }}>₹{(financials?.pettyCashExpenses || 0).toLocaleString('en-IN')}</div>
            </Card>

            <Card className="kpi-compact-card">
              <div className="text-muted">Petty Cash Balance</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>₹{(financials?.pettyCashBalance || 0).toLocaleString('en-IN')}</div>
            </Card>

            <Card className="kpi-compact-card">
              <div className="text-muted">Grand Total Expense</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>₹{(financials?.grandTotalExpense || 0).toLocaleString('en-IN')}</div>
            </Card>
          </div>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3>Project Details</h3>
              {!isSiteSupervisor() && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setActiveTab('location')}
                >
                  <MapPin size={14} /> View Location Tracking
                </button>
              )}
            </div>
            <div className="responsive-grid-2col" style={{ marginTop: '14px', fontSize: '14px' }}>
              <div><strong>Start Date:</strong> {project.startDate ? dayjs(project.startDate).format('DD MMM YYYY') : 'N/A'}</div>
              <div><strong>End Date:</strong> {project.endDate ? dayjs(project.endDate).format('DD MMM YYYY') : 'N/A'}</div>
              <div><strong>Duration:</strong> {project.durationDays ? `${project.durationDays} days` : 'N/A'}</div>
              <div><strong>Days Remaining:</strong> {project.daysRemaining ? `${project.daysRemaining} days` : 'N/A'}</div>
              <div><strong>Project Manager:</strong> {project.assignedManager?.name || 'Unassigned'}</div>
              <div><strong>Site Supervisor:</strong> {project.assignedSupervisor?.name || 'Unassigned'}</div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Site Geofence:</strong>{' '}
                {project.coordinates?.latitude ? (
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    {project.coordinates.latitude.toFixed(5)}, {project.coordinates.longitude.toFixed(5)} ({project.coordinates.radiusMeters || 200}m radius perimeter)
                  </span>
                ) : (
                  <span style={{ color: '#DC2626', fontWeight: 600 }}>
                    ⚠️ Not Configured (Supervisor will be prompted on login)
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB: LOCATION & TRACKING */}
      {activeTab === 'location' && !isSiteSupervisor() && (
        <LocationTrackingTab
          projectId={projectId}
          project={project}
          onProjectUpdated={loadProjectData}
        />
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Subtab Toggle & Date Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${attendanceSubTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setAttendanceSubTab('daily')}
              >
                Daily Attendance
              </button>
              <button 
                className={`btn ${attendanceSubTab === 'labour' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setAttendanceSubTab('labour')}
              >
                Payment Summary
              </button>
            </div>

            {/* Attendance Date Control */}
            {attendanceSubTab === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input 
                  type="date" 
                  className="input" 
                  style={{ width: '150px' }} 
                  value={attendanceDate} 
                  onChange={(e) => setAttendanceDate(e.target.value)} 
                />
                {attendanceDate !== dayjs().format('YYYY-MM-DD') && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setAttendanceDate(dayjs().format('YYYY-MM-DD'))}
                  >
                    Jump to Today
                  </button>
                )}
                {attendanceDate === dayjs().format('YYYY-MM-DD') ? (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', padding: '5px 10px', backgroundColor: '#ECFDF5', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                    🟢 Today ({dayjs().format('DD MMM YYYY')})
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#D97706', padding: '5px 10px', backgroundColor: '#FFFBEB', borderRadius: '4px', border: '1px solid #FCD34D' }}>
                    📅 {dayjs(attendanceDate).format('DD MMM YYYY')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SUBTAB 1: DAILY ATTENDANCE */}
          {attendanceSubTab === 'daily' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Daily Attendance Summary Cards */}
              <div className="kpi-grid-4">
                <Card className="kpi-compact-card">
                  <div className="text-muted">Workers Present</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>
                    {dailyAttendanceSummary.presentCount} Workers
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Total Day Wages</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                    ₹{dailyAttendanceSummary.totalWages.toLocaleString('en-IN')}
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Amount Paid Today</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>
                    ₹{dailyAttendanceSummary.totalPaid.toLocaleString('en-IN')}
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">
                    {dailyAttendanceSummary.extra > 0 ? 'Extra' : 'Balance Due'}
                  </div>
                  <div className="kpi-val" style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    marginTop: '4px',
                    color: dailyAttendanceSummary.extra > 0 ? '#059669' : dailyAttendanceSummary.balanceDue > 0 ? '#DC2626' : '#059669'
                  }}>
                    {dailyAttendanceSummary.extra > 0 
                      ? `₹${dailyAttendanceSummary.extra.toLocaleString('en-IN')}`
                      : dailyAttendanceSummary.balanceDue > 0
                        ? `₹${dailyAttendanceSummary.balanceDue.toLocaleString('en-IN')}`
                        : '₹0'}
                  </div>
                </Card>
              </div>

              <Card>
                {/* Search Bar & Action Buttons */}
                <div className="mobile-flex-wrap" style={{ alignItems: 'flex-start', marginBottom: '16px' }}>
                  {/* Worker Search Bar with Autocomplete Dropdown */}
                  <div style={{ position: 'relative', flex: 1, minWidth: '240px', width: '100%', maxWidth: '520px' }}>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text"
                        className="input"
                        style={{ paddingLeft: '36px', paddingRight: workerSearchQuery ? '36px' : '12px' }}
                        placeholder="Search worker by name, skill or phone..."
                        value={workerSearchQuery}
                        onChange={(e) => setWorkerSearchQuery(e.target.value)}
                      />
                      <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      {workerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setWorkerSearchQuery('')}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    {/* Search Results Dropdown Overlay */}
                    {workerSearchQuery.trim() && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        maxHeight: '340px',
                        overflowY: 'auto'
                      }}>
                        <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                          <span>Worker Master Results</span>
                          {isSearchingWorker && <LoadingSpinner size="sm" inline text="Searching..." />}
                        </div>

                        {/* Combined and deduplicated list */}
                        {(() => {
                          const combined = [...globalWorkerResults];
                          workersList.forEach(w => {
                            if (!combined.some(c => c._id === w._id)) combined.push(w);
                          });
                          const queryLower = workerSearchQuery.toLowerCase();
                          const matches = combined.filter(w => 
                            w.name?.toLowerCase().includes(queryLower) ||
                            w.skill?.toLowerCase().includes(queryLower) ||
                            w.phone?.includes(queryLower)
                          );

                          if (matches.length === 0 && !isSearchingWorker) {
                            return (
                              <div style={{ padding: '16px', textAlign: 'center' }}>
                                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                                  No worker found matching "<strong>{workerSearchQuery}</strong>"
                                </p>
                                <Button 
                                  size="sm" 
                                  variant="primary" 
                                  onClick={() => {
                                    setNewWorkerForm({ ...newWorkerForm, name: workerSearchQuery });
                                    setIsWorkerModalOpen(true);
                                  }}
                                >
                                  + Create Worker "{workerSearchQuery}"
                                </Button>
                              </div>
                            );
                          }

                          return (
                            <div>
                              {matches.map(w => {
                                const isAlreadyAdded = attendanceData.entries.some(e => (e.worker?._id || e.worker) === w._id);
                                return (
                                  <div 
                                    key={w._id}
                                    style={{
                                      padding: '10px 14px',
                                      borderBottom: '1px solid #F1F5F9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '10px',
                                      backgroundColor: isAlreadyAdded ? '#F8FAFC' : '#FFFFFF'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#EFF6FF',
                                        color: 'var(--color-brand)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        fontSize: '13px'
                                      }}>
                                        {w.name?.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                          {w.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                          <span>{w.skill || 'General'}</span>
                                          <span>•</span>
                                          <span style={{ fontWeight: 600, color: '#059669' }}>₹{w.dailyRate || 0}/day</span>
                                          {w.phone && (
                                            <>
                                              <span>•</span>
                                              <span>{w.phone}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      {isAlreadyAdded ? (
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '4px' }}>
                                          ✓ Added
                                        </span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => handleAddWorkerToToday(w)}
                                        >
                                          + Add
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', textAlign: 'center', borderTop: '1px solid #F1F5F9' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewWorkerForm({ ...newWorkerForm, name: workerSearchQuery });
                                    setIsWorkerModalOpen(true);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--color-brand)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  + Not finding who you need? Create new worker
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Actions: Create Worker Modal & Save Record */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setNewWorkerForm({ name: '', phone: '', skill: 'General', dailyRate: 800, workerType: 'daily_wage' });
                        setIsWorkerModalOpen(true);
                      }}
                    >
                      + New Worker
                    </Button>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      disabled={isSavingAttendance} 
                      onClick={handleSaveAttendance}
                    >
                      {isSavingAttendance ? 'Saving...' : "Save Today's Record"}
                    </Button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="table-scroll-hint">👈 Swipe horizontally to view all attendance fields 👉</div>
                {isAttendanceLoading ? (
                  <LoadingSpinner text="Fetching attendance entries..." style={{ padding: '30px' }} />
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Worker Details</th>
                          <th>Daily Rate</th>
                          <th>Time In</th>
                          <th>Time Out</th>
                          <th>Duty Type</th>
                          <th>Amount Paid Today (₹)</th>
                          <th>Remarks</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceData.entries.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                              <Users size={32} style={{ marginBottom: '8px', color: '#CBD5E1' }} />
                              <p>No workers added to attendance for this date yet.</p>
                              <p className="text-muted text-xs" style={{ marginTop: '4px' }}>Use the search bar above to search and add workers.</p>
                            </td>
                          </tr>
                        ) : (
                          attendanceData.entries.map((entry, idx) => {
                            const worker = entry.worker || {};
                            return (
                              <tr key={idx}>
                                <td>
                                  <div>
                                    <strong>{worker.name || 'Worker'}</strong>
                                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                      {worker.skill || 'General'} {worker.phone ? `• ${worker.phone}` : ''}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600 }}>₹{worker.dailyRate || 0}</span>
                                </td>
                                <td>
                                  <input 
                                    className="input" 
                                    style={{ width: '90px', padding: '6px' }} 
                                    value={entry.timeIn || '09:00'} 
                                    onChange={(e) => {
                                      const newEntries = [...attendanceData.entries];
                                      newEntries[idx].timeIn = e.target.value;
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }} 
                                  />
                                </td>
                                <td>
                                  <input 
                                    className="input" 
                                    style={{ width: '90px', padding: '6px' }} 
                                    value={entry.timeOut || '18:00'} 
                                    onChange={(e) => {
                                      const newEntries = [...attendanceData.entries];
                                      newEntries[idx].timeOut = e.target.value;
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }} 
                                  />
                                </td>
                                <td>
                                  <select 
                                    className="input" 
                                    style={{ width: '120px', padding: '6px' }}
                                    value={entry.dutyType || 'full_day'} 
                                    onChange={(e) => {
                                      const newEntries = [...attendanceData.entries];
                                      newEntries[idx].dutyType = e.target.value;
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }}
                                  >
                                    <option value="full_day">Full Day (1.0x)</option>
                                    <option value="half_day">Half Day (0.5x)</option>
                                    <option value="overtime">Overtime (1.5x)</option>
                                    <option value="custom_hours">Custom Hours</option>
                                  </select>
                                </td>
                                <td>
                                  <input 
                                    type="number"
                                    min="0"
                                    className="input" 
                                    style={{ width: '110px', padding: '6px', fontWeight: 600, color: '#059669' }} 
                                    value={entry.amountPaid ?? ''} 
                                    placeholder="0"
                                    onChange={(e) => {
                                      const newEntries = [...attendanceData.entries];
                                      newEntries[idx].amountPaid = e.target.value;
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }} 
                                  />
                                </td>
                                <td>
                                  <input 
                                    className="input" 
                                    style={{ minWidth: '130px', padding: '6px' }}
                                    value={entry.remarks || ''} 
                                    placeholder="e.g. Electrical work" 
                                    onChange={(e) => {
                                      const newEntries = [...attendanceData.entries];
                                      newEntries[idx].remarks = e.target.value;
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }} 
                                  />
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-danger" 
                                    onClick={() => {
                                      const newEntries = attendanceData.entries.filter((_, i) => i !== idx);
                                      setAttendanceData({ ...attendanceData, entries: newEntries });
                                    }}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* SUBTAB 2: PAYMENT SUMMARY (FILTERABLE BY DATE & TOTAL OF ALL) */}
          {attendanceSubTab === 'labour' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter Controls Bar */}
              <Card style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Filter size={15} /> Filter By Date:
                    </span>
                    <input 
                      type="date" 
                      className="input" 
                      style={{ width: '150px' }} 
                      value={paymentSummaryDate === 'all' ? '' : paymentSummaryDate} 
                      onChange={(e) => setPaymentSummaryDate(e.target.value)} 
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button 
                        className={`btn btn-sm ${paymentSummaryDate === dayjs().format('YYYY-MM-DD') ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPaymentSummaryDate(dayjs().format('YYYY-MM-DD'))}
                      >
                        Today
                      </button>
                      <button 
                        className={`btn btn-sm ${paymentSummaryDate === dayjs().subtract(1, 'day').format('YYYY-MM-DD') ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPaymentSummaryDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))}
                      >
                        Yesterday
                      </button>
                      <button 
                        className={`btn btn-sm ${paymentSummaryDate === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPaymentSummaryDate('all')}
                      >
                        All Time
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Showing: <strong>{paymentSummaryDate === 'all' ? 'All Cumulative Records' : dayjs(paymentSummaryDate).format('DD MMMM YYYY')}</strong>
                  </div>
                </div>
              </Card>

              {/* KPI Summary Cards */}
              <div className="kpi-grid-5">
                <Card className="kpi-compact-card">
                  <div className="text-muted">Total Workers</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>
                    {labourSummaryTotals?.totalWorkers || labourSummary.length}
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Duty Days Worked</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                    {labourSummaryTotals?.totalDaysWorked ?? labourSummary.reduce((acc, curr) => acc + (curr.daysWorked || 0), 0)} days
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Total Wages / Earned</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                    ₹{(labourSummaryTotals?.totalEarned ?? labourSummary.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0)).toLocaleString('en-IN')}
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Total Amount Paid</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>
                    ₹{(labourSummaryTotals?.totalPaid ?? labourSummary.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0)).toLocaleString('en-IN')}
                  </div>
                </Card>
                <Card className="kpi-compact-card">
                  <div className="text-muted">Net Pending Balance</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: (labourSummaryTotals?.totalPending ?? 0) > 0 ? '#DC2626' : '#059669' }}>
                    ₹{(labourSummaryTotals?.totalPending ?? labourSummary.reduce((acc, curr) => acc + (curr.pendingAmount || 0), 0)).toLocaleString('en-IN')}
                  </div>
                </Card>
              </div>

              {/* Payment Summary Table */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <h3>Labour Wage & Payment Summary</h3>
                  <Badge variant="active">{paymentSummaryDate === 'all' ? 'All Dates' : dayjs(paymentSummaryDate).format('DD MMM YYYY')}</Badge>
                </div>

                <div className="table-scroll-hint">👈 Swipe horizontally to view all payment columns 👉</div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Worker Name</th>
                        <th>Skill & Type</th>
                        <th>Daily Rate</th>
                        <th>Days Worked</th>
                        <th>Total Earned (₹)</th>
                        <th>Amount Paid (₹)</th>
                        <th>Pending Balance (₹)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labourSummary.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94A3B8' }}>
                            <IndianRupee size={32} style={{ marginBottom: '8px', color: '#CBD5E1' }} />
                            <p>No labour payment or attendance records found for this date.</p>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {labourSummary.map((item) => {
                            const isPaidFull = item.pendingAmount <= 0;
                            const isPartial = item.totalPaid > 0 && item.pendingAmount > 0;
                            return (
                              <tr key={item.workerId || item._id}>
                                <td>
                                  <strong>{item.name}</strong>
                                  {item.phone && <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.phone}</div>}
                                </td>
                                <td>
                                  <div>{item.skill || 'General'}</div>
                                  <span className="text-muted text-xs">{item.workerType?.replace('_', ' ') || 'daily wage'}</span>
                                </td>
                                <td>₹{item.dailyRate || 0}</td>
                                <td>{item.daysWorked} days</td>
                                <td style={{ fontWeight: 600 }}>₹{item.totalEarned?.toLocaleString('en-IN')}</td>
                                <td style={{ fontWeight: 600, color: '#059669' }}>₹{item.totalPaid?.toLocaleString('en-IN')}</td>
                                <td style={{ fontWeight: 700, color: item.pendingAmount > 0 ? '#DC2626' : '#059669' }}>
                                  ₹{item.pendingAmount?.toLocaleString('en-IN')}
                                </td>
                                <td>
                                  {isPaidFull ? (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '4px' }}>
                                      Paid
                                    </span>
                                  ) : isPartial ? (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', backgroundColor: '#FFFBEB', padding: '3px 8px', borderRadius: '4px' }}>
                                      Partial
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '3px 8px', borderRadius: '4px' }}>
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* TOTAL OF ALL FOOTER ROW */}
                          <tr style={{
                            backgroundColor: '#F1F5F9',
                            borderTop: '2px solid var(--color-border)',
                            borderBottom: '2px solid var(--color-border)',
                            fontWeight: 700
                          }}>
                            <td colSpan="3" style={{ fontSize: '14px', fontWeight: 700 }}>
                              TOTAL OF ALL ({labourSummaryTotals?.totalWorkers || labourSummary.length} Workers)
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {labourSummaryTotals?.totalDaysWorked ?? labourSummary.reduce((acc, curr) => acc + (curr.daysWorked || 0), 0)} days
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--color-brand)', fontSize: '15px' }}>
                              ₹{(labourSummaryTotals?.totalEarned ?? labourSummary.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0)).toLocaleString('en-IN')}
                            </td>
                            <td style={{ fontWeight: 700, color: '#059669', fontSize: '15px' }}>
                              ₹{(labourSummaryTotals?.totalPaid ?? labourSummary.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0)).toLocaleString('en-IN')}
                            </td>
                            <td style={{ fontWeight: 700, color: (labourSummaryTotals?.totalPending ?? 0) > 0 ? '#DC2626' : '#059669', fontSize: '15px' }}>
                              ₹{(labourSummaryTotals?.totalPending ?? labourSummary.reduce((acc, curr) => acc + (curr.pendingAmount || 0), 0)).toLocaleString('en-IN')}
                            </td>
                            <td>—</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT PURCHASES */}
      {activeTab === 'purchases' && (
        <Card>
          <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
            <h3>Direct Company Purchases</h3>
            { (isSuperAdmin() || isAccounts()) && (
              <Button icon={Plus} onClick={() => setIsPurchaseModalOpen(true)}>Add Direct Purchase</Button>
            )}
          </div>

          <div className="table-scroll-hint">👈 Swipe horizontally to view all purchase records 👉</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount (₹)</th>
                  <th>Invoice Proof</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8' }}>No direct purchases recorded.</td></tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p._id}>
                      <td>{dayjs(p.date).format('DD-MM-YYYY')}</td>
                      <td><span className="badge badge-active">{p.category}</span></td>
                      <td>{p.description || '—'}</td>
                      <td style={{ fontWeight: 600 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td>
                        {p.invoiceImage ? (
                          <a href={p.invoiceImage} target="_blank" rel="noreferrer" style={{ color: 'var(--color-brand)', fontWeight: 500 }}>View Invoice</a>
                        ) : 'No Proof'}
                      </td>
                      <td>{p.addedBy?.name || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: PETTY CASH */}
      {activeTab === 'pettycash' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="kpi-grid-3">
            <Card className="kpi-compact-card">
              <div className="text-muted">Total Credits</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>+₹{(pettyCash?.totalCredits || 0).toLocaleString('en-IN')}</div>
            </Card>

            <Card className="kpi-compact-card">
              <div className="text-muted">Total Expenses</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#DC2626' }}>−₹{(pettyCash?.totalExpenses || 0).toLocaleString('en-IN')}</div>
            </Card>

            <Card className="kpi-compact-card">
              <div className="text-muted">Current Balance</div>
              <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>₹{(pettyCash?.currentBalance || 0).toLocaleString('en-IN')}</div>
            </Card>
          </div>

          <Card>
            <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
              <h3>Petty Cash Transaction Ledger</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href={`/api/exports/pettycash/${projectId}/excel`} className="btn btn-outline btn-sm">Export Excel</a>
                {(isSuperAdmin() || isAccounts()) && (
                  <Button size="sm" variant="secondary" onClick={() => setIsOpeningModalOpen(true)}>Set Opening Balance</Button>
                )}
                <Button size="sm" icon={Plus} onClick={() => setIsExpenseModalOpen(true)}>Add Expense</Button>
              </div>
            </div>

            <div className="table-scroll-hint">👈 Swipe horizontally to view all transactions 👉</div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount (₹)</th>
                    <th>Receipt</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {!pettyCash?.transactions || pettyCash.transactions.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94A3B8' }}>No transactions recorded.</td></tr>
                  ) : (
                    pettyCash.transactions.map((t, idx) => (
                      <tr key={idx}>
                        <td>{dayjs(t.date).format('DD-MM-YYYY')}</td>
                        <td>
                          <Badge variant={t.type === 'expense' ? 'rejected' : 'approved'}>
                            {t.type === 'expense' ? 'EXPENSE' : t.type === 'cash_refill' ? 'REFILL' : 'OPENING'}
                          </Badge>
                        </td>
                        <td>{t.category === 'custom' ? t.customCategoryName : (t.category || '—')}</td>
                        <td>{t.description || '—'}</td>
                        <td style={{ fontWeight: 600, color: t.type === 'expense' ? '#DC2626' : '#059669' }}>
                          {t.type === 'expense' ? `−₹${t.amount.toLocaleString('en-IN')}` : `+₹${t.amount.toLocaleString('en-IN')}`}
                        </td>
                        <td>
                          {t.receiptImage ? <a href={t.receiptImage} target="_blank" rel="noreferrer" style={{ color: 'var(--color-brand)' }}>View Receipt</a> : '—'}
                        </td>
                        <td>{t.addedBy?.name || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cash Refill Requests List */}
          <Card>
            <h3>Cash Refill Requests</h3>
            <div className="table-scroll-hint" style={{ marginTop: '10px' }}>👈 Swipe horizontally to view refill requests 👉</div>
            <div className="table-container" style={{ marginTop: '4px' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Requested By</th>
                    <th>Amount Requested (₹)</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {refillRequests.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94A3B8' }}>No refill requests.</td></tr>
                  ) : (
                    refillRequests.map(r => (
                      <tr key={r._id}>
                        <td>{dayjs(r.createdAt).format('DD-MM-YYYY HH:mm')}</td>
                        <td>{r.requestedBy?.name}</td>
                        <td style={{ fontWeight: 600 }}>₹{r.requestedAmount.toLocaleString('en-IN')}</td>
                        <td>{r.reason || '—'}</td>
                        <td><Badge variant={r.status}>{r.status}</Badge></td>
                        <td>
                          {r.status === 'pending' && (isSuperAdmin() || isAccounts()) ? (
                            <Button size="sm" onClick={() => handleApproveRefill(r._id)}>Approve Refill</Button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: MATERIALS LIST */}
      {activeTab === 'materials' && (
        <Card>
          <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
            <h3>Site Material Inventory List</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a href={`/api/exports/materials/${projectId}/excel`} className="btn btn-outline btn-sm">Export Excel</a>
              <Button icon={Plus} onClick={() => setIsMaterialModalOpen(true)}>Add Material Item</Button>
            </div>
          </div>

          <div className="table-scroll-hint">👈 Swipe horizontally to view material inventory 👉</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Total Value (₹)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {materials.items.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94A3B8' }}>No materials added.</td></tr>
                ) : (
                  materials.items.map(m => (
                    <tr key={m._id}>
                      <td><strong>{m.itemName}</strong></td>
                      <td>{m.unit || '—'}</td>
                      <td>{m.quantity}</td>
                      <td style={{ fontWeight: 600 }}>₹{(m.totalValue || 0).toLocaleString('en-IN')}</td>
                      <td>{m.remarks || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {materials.items.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                    <td colSpan="3">GRAND TOTAL MATERIAL VALUE</td>
                    <td colSpan="2" style={{ color: 'var(--color-brand)' }}>₹{(materials.grandTotal || 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* TAB 6: SITE EXECUTION */}
      {activeTab === 'execution' && (
        <Card>
          <h3>Site Possession / Readiness Verification (5 Controls)</h3>

          <div className="responsive-grid-2col" style={{ margin: '16px 0' }}>
            <div className="form-group">
              <label>1. Electrical Power Supply</label>
              <select className="input" value={execution?.electricalPowerSupply || 'no'} onChange={(e) => handleUpdateExecution('electricalPowerSupply', e.target.value)}>
                <option value="yes">YES — Power Supply Ready</option>
                <option value="no">NO — No Power</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div className="form-group">
              <label>2. Staff Accommodation</label>
              <select className="input" value={execution?.staffAccommodation || 'no'} onChange={(e) => handleUpdateExecution('staffAccommodation', e.target.value)}>
                <option value="yes">YES — Accommodation Arranged</option>
                <option value="no">NO — Not Arranged</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div className="form-group">
              <label>3. Washroom Facilities</label>
              <select className="input" value={execution?.washroomFacilities || 'no'} onChange={(e) => handleUpdateExecution('washroomFacilities', e.target.value)}>
                <option value="yes">YES — Washrooms Available</option>
                <option value="no">NO — Not Available</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div className="form-group">
              <label>4. Arrangement for Material Purchase</label>
              <select className="input" value={execution?.materialPurchaseArrangement || 'not_ready'} onChange={(e) => handleUpdateExecution('materialPurchaseArrangement', e.target.value)}>
                <option value="ready">READY — Vendors & Accounts Aligned</option>
                <option value="not_ready">NOT READY</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
          </div>

          <hr style={{ margin: '20px 0', borderColor: 'var(--color-border)' }} />

          <h3>5. List of Tools at Site</h3>
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: '1 1 180px' }} placeholder="Tool name e.g. Drill Machine" value={toolNameInput} onChange={(e) => setToolNameInput(e.target.value)} />
            <input className="input" type="number" style={{ width: '90px' }} placeholder="Qty" value={toolQtyInput} onChange={(e) => setToolQtyInput(e.target.value)} />
            <Button size="sm" onClick={handleAddTool}>Add Tool</Button>
          </div>

          <div className="table-scroll-hint">👈 Swipe horizontally to view tools 👉</div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tool Name</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {!execution?.tools || execution.tools.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: '#94A3B8' }}>No tools added to site list.</td></tr>
                ) : (
                  execution.tools.map(t => (
                    <tr key={t._id}>
                      <td><strong>{t.toolName}</strong></td>
                      <td>{t.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 7: SITE CLOSURE */}
      {activeTab === 'closure' && (
        <Card>
          <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
            <div>
              <h3>Project Closure Process (10 Requirements)</h3>
              <p className="text-muted">Completed: {closure?.completedCount || 0}/10 items</p>
            </div>
            <Badge variant={closure?.completedCount === 10 ? 'completed' : 'pending'}>
              {closure?.completedCount === 10 ? 'CLOSED & COMPLETED' : 'IN PROGRESS'}
            </Badge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>1. List of Tools</label>
              <textarea className="input" rows="2" value={closure?.toolsList || ''} onChange={(e) => setClosure({ ...closure, toolsList: e.target.value })} onBlur={(e) => handleUpdateClosureText('toolsList', e.target.value)} placeholder="Enter list of tools at site closure..." />
            </div>

            <div className="form-group">
              <label>2. Waste Disposal Done?</label>
              <select className="input" value={closure?.wasteDisposal?.done ? 'true' : 'false'} onChange={(e) => handleUpdateClosureText('wasteDisposalDone', e.target.value)}>
                <option value="false">NO — Waste pending</option>
                <option value="true">YES — Site cleared of waste</option>
              </select>
            </div>

            <div className="form-group">
              <label>3. Returned Rented Tools?</label>
              <select className="input" value={closure?.rentedToolsReturned?.done ? 'true' : 'false'} onChange={(e) => handleUpdateClosureText('rentedToolsReturnedDone', e.target.value)}>
                <option value="false">NO — Rented tools pending return</option>
                <option value="true">YES — All rented tools returned</option>
              </select>
            </div>

            <div className="form-group">
              <label>5. Pending Vendor Payments</label>
              <input className="input" placeholder="Vendor payment details..." value={closure?.pendingVendorPayments?.description || ''} onChange={(e) => handleUpdateClosureText('pendingVendorPaymentsDesc', e.target.value)} />
            </div>

            <div className="form-group">
              <label>6. Balance Materials</label>
              <textarea className="input" rows="2" value={closure?.balanceMaterials || ''} onChange={(e) => setClosure({ ...closure, balanceMaterials: e.target.value })} onBlur={(e) => handleUpdateClosureText('balanceMaterials', e.target.value)} placeholder="List leftover materials..." />
            </div>

            <div className="form-group">
              <label>7. Electrical DB Marking Completed?</label>
              <select className="input" value={closure?.electricalDbMarking ? 'true' : 'false'} onChange={(e) => handleUpdateClosureText('electricalDbMarking', e.target.value)}>
                <option value="false">NO</option>
                <option value="true">YES — DB marked</option>
              </select>
            </div>

            <div className="form-group">
              <label>8. Transfer of Balance Materials</label>
              <select className="input" value={closure?.materialTransfer?.destination || ''} onChange={(e) => handleUpdateClosureText('materialTransferDestination', e.target.value)}>
                <option value="">Select Destination...</option>
                <option value="godown">Godown</option>
                <option value="new_site">New Site</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>10. Labour Payment Details</label>
              <textarea className="input" rows="2" value={closure?.labourPayment?.details || ''} onChange={(e) => setClosure({ ...closure, labourPayment: { ...closure.labourPayment, details: e.target.value } })} onBlur={(e) => handleUpdateClosureText('labourPaymentDetails', e.target.value)} placeholder="Labour payment remarks / summary..." />
            </div>
          </div>
        </Card>
      )}

      {/* MODALS */}
      {/* Worker Quick Create */}
      <Modal 
        isOpen={isWorkerModalOpen} 
        onClose={() => setIsWorkerModalOpen(false)} 
        title="Quick Add Worker to Attendance" 
        footer={<Button variant="primary" onClick={handleCreateWorker}>Save & Add to Attendance</Button>}
      >
        <form onSubmit={handleCreateWorker} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Duplicate Worker Alert Banner */}
          {newWorkerForm.name && (workersList.some(w => w.name?.toLowerCase() === newWorkerForm.name.trim().toLowerCase()) || globalWorkerResults.some(w => w.name?.toLowerCase() === newWorkerForm.name.trim().toLowerCase())) && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1E40AF',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} color="#2563EB" style={{ flexShrink: 0 }} />
              <div>
                A worker named <strong>"{newWorkerForm.name}"</strong> already exists in the company master. Submitting will link and add the existing worker instead of creating a duplicate.
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Worker Full Name *</label>
            <input 
              className="input" 
              value={newWorkerForm.name} 
              onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })} 
              placeholder="e.g. Ramesh Kumar"
              required 
            />
          </div>

          <div className="responsive-grid-2col" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Skill / Trade</label>
              <input 
                className="input" 
                value={newWorkerForm.skill} 
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, skill: e.target.value })} 
                placeholder="Carpenter, Electrician, Painter, Helper" 
              />
            </div>

            <div className="form-group">
              <label>Daily Rate / Amount (₹) *</label>
              <input 
                type="number" 
                min="0"
                className="input" 
                value={newWorkerForm.dailyRate} 
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, dailyRate: e.target.value })} 
                placeholder="800"
                required
              />
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                className="input" 
                value={newWorkerForm.phone || ''} 
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, phone: e.target.value })} 
                placeholder="10-digit mobile number" 
              />
            </div>

            <div className="form-group">
              <label>Worker Category</label>
              <select 
                className="input" 
                value={newWorkerForm.workerType || 'daily_wage'}
                onChange={(e) => setNewWorkerForm({ ...newWorkerForm, workerType: e.target.value })}
              >
                <option value="daily_wage">Daily Wage</option>
                <option value="contract">Contract</option>
                <option value="permanent">Permanent Staff</option>
                <option value="vendor_supplied">Vendor Supplied</option>
              </select>
            </div>
          </div>

          <p className="text-muted text-xs" style={{ margin: '4px 0' }}>
            💡 This worker will be registered in the company master and automatically added to today's site attendance with the specified daily wage amount.
          </p>
        </form>
      </Modal>

      {/* Add Direct Purchase */}
      <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Add Direct Company Purchase" footer={<Button onClick={handleAddPurchase}>Add Purchase</Button>}>
        <form onSubmit={handleAddPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Category *</label>
            <input className="input" value={purchaseForm.category} onChange={(e) => setPurchaseForm({ ...purchaseForm, category: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Amount (₹) *</label>
            <input type="number" className="input" value={purchaseForm.amount} onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Invoice File / Photo (REQUIRED) *</label>
            <input type="file" className="input" onChange={(e) => setPurchaseFile(e.target.files[0])} required />
          </div>
        </form>
      </Modal>

      {/* Add Petty Cash Expense */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Petty Cash Expense" footer={<Button onClick={handleAddExpense}>Record Expense</Button>}>
        <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Category *</label>
            <select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
              <option value="material">Material charges</option>
              <option value="transportation">Transportation charges</option>
              <option value="labour">Labour charges</option>
              <option value="fuel">Fuel expenses</option>
              <option value="accommodation">Accommodation expenses</option>
              <option value="tools">Tools charges</option>
              <option value="stationery">Stationery</option>
              <option value="travel">Travel expenses</option>
              <option value="food">Food expenses</option>
              <option value="custom">Custom expense</option>
            </select>
          </div>

          {expenseForm.category === 'custom' && (
            <div className="form-group">
              <label>Custom Category Name *</label>
              <input className="input" value={expenseForm.customCategoryName} onChange={(e) => setExpenseForm({ ...expenseForm, customCategoryName: e.target.value })} required />
            </div>
          )}

          <div className="form-group">
            <label>Amount (₹) *</label>
            <input type="number" className="input" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>Receipt Photo / File (MANDATORY) *</label>
            <input type="file" className="input" accept="image/*,application/pdf" onChange={(e) => setExpenseFile(e.target.files[0])} required />
          </div>
        </form>
      </Modal>

      {/* Refill Cash Request Modal */}
      <Modal isOpen={isRefillModalOpen} onClose={() => setIsRefillModalOpen(false)} title="Request Cash Refill (Insufficient Funds)" footer={<Button onClick={handleRequestRefill}>Submit Refill Request</Button>}>
        <form onSubmit={handleRequestRefill} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '10px', backgroundColor: '#FFFBEB', borderRadius: '4px', border: '1px solid #FCD34D', color: '#92400E', fontSize: '13px' }}>
            Current balance is insufficient for this expense. Please submit a refill request to Admin/Accounts.
          </div>
          <div className="form-group">
            <label>Requested Refill Amount (₹) *</label>
            <input type="number" className="input" value={refillForm.requestedAmount} onChange={(e) => setRefillForm({ ...refillForm, requestedAmount: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Reason for Refill</label>
            <textarea className="input" rows="2" value={refillForm.reason} onChange={(e) => setRefillForm({ ...refillForm, reason: e.target.value })} placeholder="e.g. Fuel and tool purchases needed" />
          </div>
        </form>
      </Modal>

      {/* Set Opening Balance Modal */}
      <Modal isOpen={isOpeningModalOpen} onClose={() => setIsOpeningModalOpen(false)} title="Set Initial Opening Balance" footer={<Button onClick={handleSetOpeningBalance}>Save Balance</Button>}>
        <div className="form-group">
          <label>Opening Balance Amount (₹) *</label>
          <input type="number" className="input" value={openingBalanceForm} onChange={(e) => setOpeningBalanceForm(e.target.value)} placeholder="50000" />
        </div>
      </Modal>

      {/* Add Material Modal */}
      <Modal isOpen={isMaterialModalOpen} onClose={() => setIsMaterialModalOpen(false)} title="Add Site Material" footer={<Button onClick={handleAddMaterial}>Add Item</Button>}>
        <form onSubmit={handleAddMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Item Name *</label>
            <input className="input" value={materialForm.itemName} onChange={(e) => setMaterialForm({ ...materialForm, itemName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input type="number" className="input" value={materialForm.quantity} onChange={(e) => setMaterialForm({ ...materialForm, quantity: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Total Value (₹)</label>
            <input type="number" className="input" value={materialForm.totalValue} onChange={(e) => setMaterialForm({ ...materialForm, totalValue: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
