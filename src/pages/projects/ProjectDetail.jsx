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
  Search, Check, Filter, X, CheckCircle2, PlayCircle, PauseCircle, AlertTriangle, FileText, ExternalLink, Image,
  ShieldCheck, ShieldAlert, Crosshair, RefreshCw, Navigation
} from 'lucide-react';
import dayjs from 'dayjs';
import LocationTrackingTab from '../../components/location/LocationTrackingTab';
import ScheduleTab from '../../components/projects/ScheduleTab';

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
  const [purchaseForm, setPurchaseForm] = useState({
    category: 'Material',
    description: '',
    amount: '',
    isMaterialPurchase: true,
    materialName: '',
    materialUnit: 'Bags',
    materialQuantity: '',
    materialUnitCost: ''
  });
  const [purchaseFile, setPurchaseFile] = useState(null);

  const [pettyCash, setPettyCash] = useState(null);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [ledgerDate, setLedgerDate] = useState('');
  const [isPettyCashLoading, setIsPettyCashLoading] = useState(false);
  const [refillRequests, setRefillRequests] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: 'fuel', customCategoryName: '', description: '', amount: '' });
  const [expenseFile, setExpenseFile] = useState(null);

  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [refillForm, setRefillForm] = useState({ requestedAmount: '', reason: '' });
  const [openingBalanceForm, setOpeningBalanceForm] = useState('');
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);

  const [materials, setMaterials] = useState(null);
  const [isMaterialsLoading, setIsMaterialsLoading] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    itemName: '',
    source: 'Direct Purchase',
    unit: 'Bags',
    quantity: '',
    unitCost: '',
    totalValue: '',
    remarks: '',
    date: dayjs().format('YYYY-MM-DD')
  });
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [selectedUsageItem, setSelectedUsageItem] = useState(null);
  const [usageFormData, setUsageFormData] = useState({ quantity: '', reason: '', date: dayjs().format('YYYY-MM-DD') });
  const [isSubmittingUsage, setIsSubmittingUsage] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const [execution, setExecution] = useState(null);
  const [executionTools, setExecutionTools] = useState([]);
  const [toolNameInput, setToolNameInput] = useState('');
  const [toolQtyInput, setToolQtyInput] = useState(1);

  const [closure, setClosure] = useState(null);
  const [isStartingClosure, setIsStartingClosure] = useState(false);
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [wastePhotosFiles, setWastePhotosFiles] = useState([]);
  const [rentedToolPhotoFile, setRentedToolPhotoFile] = useState(null);
  const [sitePhotosFiles, setSitePhotosFiles] = useState([]);
  const [labourPaymentFile, setLabourPaymentFile] = useState(null);

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

  useEffect(() => {
    if (activeTab === 'pettycash') loadPettyCash();
  }, [ledgerFilter, ledgerDate]);

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
    formData.append('isMaterialPurchase', purchaseForm.isMaterialPurchase);
    if (purchaseForm.isMaterialPurchase) {
      formData.append('materialName', purchaseForm.materialName || purchaseForm.category);
      formData.append('materialUnit', purchaseForm.materialUnit || 'Bags');
      formData.append('materialQuantity', purchaseForm.materialQuantity || 1);
      const unitCost = purchaseForm.materialUnitCost || (purchaseForm.materialQuantity ? (Number(purchaseForm.amount) / Number(purchaseForm.materialQuantity)).toFixed(2) : purchaseForm.amount);
      formData.append('materialUnitCost', unitCost);
    }
    formData.append('invoiceImage', purchaseFile);

    try {
      await api.post(`/projects/${projectId}/purchases`, formData);
      setIsPurchaseModalOpen(false);
      setPurchaseForm({ category: 'Material', description: '', amount: '', isMaterialPurchase: true, materialName: '', materialUnit: 'Bags', materialQuantity: '', materialUnitCost: '' });
      setPurchaseFile(null);
      loadPurchases();
      loadMaterials();
      loadProjectData();
      alert('Direct company purchase recorded successfully! Material inventory updated without affecting petty cash.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add purchase');
    }
  };

  // --- PETTY CASH ---
  const loadPettyCash = async () => {
    setIsPettyCashLoading(true);
    try {
      const params = ledgerDate ? `date=${encodeURIComponent(ledgerDate)}` : `range=${ledgerFilter}`;
      const res = await api.get(`/projects/${projectId}/pettycash?${params}`);
      setPettyCash(res.data.data.pettyCash);
      setLedgerTransactions(res.data.data.filteredTransactions || []);
      setRefillRequests(res.data.data.refillRequests);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPettyCashLoading(false);
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
    setIsMaterialsLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/materials`);
      setMaterials(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMaterialsLoading(false);
    }
  };

  const openMaterialUsageModal = (item) => {
    if (project?.status === 'on_hold' && !isSuperAdmin()) {
      alert('This project is currently on hold. Material usage recording is locked.');
      return;
    }
    setSelectedUsageItem(item);
    setUsageFormData({ quantity: '', reason: '', date: dayjs().format('YYYY-MM-DD') });
    setIsUsageModalOpen(true);
  };

  const handleSubmitMaterialUsage = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUsageItem) return;
    const qty = Number(usageFormData.quantity);
    if (!qty || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }
    if (qty > selectedUsageItem.balance) {
      if (!window.confirm(`Warning: Quantity entered (${qty}) exceeds current available balance (${selectedUsageItem.balance} ${selectedUsageItem.unit || ''}). Do you want to proceed?`)) {
        return;
      }
    }
    try {
      setIsSubmittingUsage(true);
      await api.post(`/projects/${projectId}/materials/items/${selectedUsageItem._id}/usage`, {
        quantity: qty,
        reason: usageFormData.reason || 'Site consumption',
        date: usageFormData.date || dayjs().format('YYYY-MM-DD'),
      });
      setIsUsageModalOpen(false);
      setSelectedUsageItem(null);
      loadMaterials();
      alert(`Recorded ${qty} ${selectedUsageItem.unit || ''} usage for "${selectedUsageItem.itemName}".`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record material usage.');
    } finally {
      setIsSubmittingUsage(false);
    }
  };

  const openMaterialHistoryModal = (item) => {
    setSelectedHistoryItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...materialForm,
        source: materialForm.source || 'Direct Purchase',
      };
      await api.post(`/projects/${projectId}/materials/items`, payload);
      setIsMaterialModalOpen(false);
      setMaterialForm({ itemName: '', source: 'Direct Purchase', unit: 'Bags', quantity: '', unitCost: '', totalValue: '', remarks: '', date: dayjs().format('YYYY-MM-DD') });
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

  const handleStartClosure = async () => {
    if (project?.status === 'on_hold' && !isSuperAdmin()) {
      alert('This project is currently on hold. Cannot start closure.');
      return;
    }
    if (!window.confirm('Start the official Site Closure Procedure for this project? This will unlock the formal 10-step handover and clearance checklist.')) {
      return;
    }
    try {
      setIsStartingClosure(true);
      const res = await api.post(`/projects/${projectId}/closure/start`);
      setClosure(res.data.data);
      alert('Site closure procedure initiated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start site closure procedure');
    } finally {
      setIsStartingClosure(false);
    }
  };

  const handleUpdateClosureText = async (field, val) => {
    if (project?.status === 'on_hold' && !isSuperAdmin()) {
      alert('This project is currently on hold. Operational changes are locked.');
      return;
    }
    try {
      const res = await api.put(`/projects/${projectId}/closure`, { [field]: val });
      setClosure(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update closure requirement');
    }
  };

  const handleSaveClosureMultipart = async (e) => {
    if (e) e.preventDefault();
    if (project?.status === 'on_hold' && !isSuperAdmin()) {
      alert('This project is currently on hold. Operational changes are locked.');
      return;
    }

    // Validation 1: Waste disposal mandatory image submission if YES
    const hasExistingWastePhotos = (closure?.wasteDisposal?.photoUrls?.length || 0) > 0;
    const hasNewWastePhotos = wastePhotosFiles.length > 0;
    if (closure?.wasteDisposal?.done && !hasExistingWastePhotos && !hasNewWastePhotos) {
      alert('Validation Error: Waste disposal requires at least one photographic proof when marked as YES (Site cleared). Please choose photo files to upload.');
      return;
    }

    // Validation 2: Labour Payment PDF check
    if (labourPaymentFile) {
      const isPdf = labourPaymentFile.type === 'application/pdf' || labourPaymentFile.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        alert('Validation Error: Labour payment document must be a PDF file.');
        return;
      }
    }

    // Validation 3: Completed site photos check (warn if less than 5)
    const totalSitePhotos = (closure?.completedSitePhotos?.length || 0) + sitePhotosFiles.length;
    if (sitePhotosFiles.length > 0 && totalSitePhotos < 5) {
      if (!window.confirm(`Notice: You have ${totalSitePhotos}/5 completed site photos. A minimum of 5 photos is required to fulfill requirement #4. Do you still want to proceed and save?`)) {
        return;
      }
    }

    try {
      setIsSavingClosure(true);
      const formData = new FormData();
      if (closure?.toolsList !== undefined) formData.append('toolsList', closure.toolsList);
      formData.append('wasteDisposalDone', closure?.wasteDisposal?.done ? 'true' : 'false');
      formData.append('rentedToolsReturnedDone', closure?.rentedToolsReturned?.done ? 'true' : 'false');
      if (closure?.pendingVendorPayments?.description !== undefined) {
        formData.append('pendingVendorPaymentsDesc', closure.pendingVendorPayments.description);
      }
      if (closure?.pendingVendorPayments?.amount !== undefined) {
        formData.append('pendingVendorPaymentsAmount', closure.pendingVendorPayments.amount);
      }
      if (closure?.balanceMaterials !== undefined) formData.append('balanceMaterials', closure.balanceMaterials);
      formData.append('electricalDbMarking', closure?.electricalDbMarking ? 'true' : 'false');
      if (closure?.materialTransfer?.destination) {
        formData.append('materialTransferDestination', closure.materialTransfer.destination);
      }
      if (closure?.materialTransfer?.destinationNote !== undefined) {
        formData.append('materialTransferNote', closure.materialTransfer.destinationNote);
      }
      if (closure?.pettyCashClosure?.finalAmount != null) {
        formData.append('pettyCashClosureFinalAmount', closure.pettyCashClosure.finalAmount);
      }
      if (closure?.labourPayment?.details !== undefined) {
        formData.append('labourPaymentDetails', closure.labourPayment.details);
      }

      // Append files
      wastePhotosFiles.forEach(f => formData.append('wastePhotos', f));
      if (rentedToolPhotoFile) formData.append('rentedToolPhoto', rentedToolPhotoFile);
      sitePhotosFiles.forEach(f => formData.append('sitePhotos', f));
      if (labourPaymentFile) formData.append('labourFile', labourPaymentFile);

      const res = await api.put(`/projects/${projectId}/closure`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setClosure(res.data.data);
      setWastePhotosFiles([]);
      setRentedToolPhotoFile(null);
      setSitePhotosFiles([]);
      setLabourPaymentFile(null);
      alert('Site closure requirements and uploaded files successfully saved!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save site closure');
    } finally {
      setIsSavingClosure(false);
    }
  };

  const handleRemoveClosurePhoto = async (photoUrl, type) => {
    if (project?.status === 'on_hold' && !isSuperAdmin()) {
      alert('This project is on hold. Modifications are locked.');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this photograph?')) return;
    try {
      const field = type === 'site' ? 'removedSitePhoto' : 'removedWastePhoto';
      const res = await api.put(`/projects/${projectId}/closure`, { [field]: photoUrl });
      setClosure(res.data.data);
    } catch (err) {
      alert('Failed to remove photo');
    }
  };

  const handleToggleHoldFromDetail = async () => {
    if (!isSuperAdmin()) return;
    const isHold = project?.status === 'on_hold';
    const actionText = isHold ? 'resume this project to Ongoing' : 'put this project ON HOLD';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;
    try {
      const res = await api.put(`/projects/${projectId}/hold`);
      setProject(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update project hold status');
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

      {/* On Hold Warning Banner */}
      {project.status === 'on_hold' && (
        <div style={{
          backgroundColor: '#FFFBEB',
          border: '2px solid #F59E0B',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          color: '#92400E',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={26} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                PROJECT IS CURRENTLY ON HOLD
              </div>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>
                This project is paused by administration. Site operations (recording attendance, petty cash expenses, material requests, and site closure) are temporarily locked.
              </div>
            </div>
          </div>
          {isSuperAdmin() && (
            <button
              onClick={handleToggleHoldFromDetail}
              className="btn btn-sm"
              style={{ backgroundColor: '#16A34A', color: '#FFF', flexShrink: 0 }}
            >
              <PlayCircle size={14} /> Resume Project
            </button>
          )}
        </div>
      )}

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
          <span> Scroll tabs </span>
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
                  <MapPin size={14} /> Location & Tracking
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

      {/* TAB: LOCATION & TRACKING (Admin & Project Manager Only) */}
      {!isSiteSupervisor() && activeTab === 'location' && (
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
                Attendance & Payment Summary
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
                <div className="table-scroll-hint"> Swipe horizontally to view all attendance fields </div>
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

                <div className="table-scroll-hint"> Swipe horizontally to view all payment columns </div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Direct Purchases KPI Breakdown */}
          {(() => {
            const totalDirectPurchases = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const materialPurchases = purchases.filter(p => p.isMaterialPurchase || (p.category && p.category.toLowerCase().includes('material')) || p.materialName).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const otherPurchases = totalDirectPurchases - materialPurchases;
            const invoicesCount = purchases.length;

            return (
              <div className="kpi-grid-4">
                <Card className="kpi-compact-card">
                  <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Direct Purchases</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#1E293B' }}>
                    ₹{totalDirectPurchases.toLocaleString('en-IN')}
                  </div>
                </Card>

                <Card className="kpi-compact-card">
                  <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Material Purchases</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#4F46E5' }}>
                    ₹{materialPurchases.toLocaleString('en-IN')}
                  </div>
                </Card>

                <Card className="kpi-compact-card">
                  <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Tools, Equipment & Other</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#0284C7' }}>
                    ₹{otherPurchases.toLocaleString('en-IN')}
                  </div>
                </Card>

                <Card className="kpi-compact-card">
                  <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Recorded Invoices</div>
                  <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>
                    {invoicesCount} Invoices
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Petty Cash Independence Notice */}
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#166534',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ShieldCheck size={20} color="#16A34A" style={{ flexShrink: 0 }} />
            <div>
              <strong>Direct Company Purchases</strong> are processed and settled directly via corporate invoices. 
              These purchases <strong>do not affect or deduct from the Site Supervisor's Petty Cash balance</strong>. 
              Material purchases are automatically tracked in the <strong>Materials List</strong> with a <span style={{ fontWeight: 700, backgroundColor: '#E0E7FF', color: '#3730A3', padding: '2px 6px', borderRadius: '4px' }}>DIRECT PURCHASE</span> label.
            </div>
          </div>

          <Card>
            <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Direct Company Purchases Ledger</h3>
                <p className="text-muted" style={{ fontSize: '12px', margin: '2px 0 0 0' }}>
                  Direct invoice records, supplier bills, and materials added to site inventory.
                </p>
              </div>
              {(isSuperAdmin() || isAccounts()) && (
                <Button icon={Plus} onClick={() => setIsPurchaseModalOpen(true)}>Add Direct Purchase</Button>
              )}
            </div>

            <div className="table-scroll-hint"> Swipe horizontally to view all purchase records </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type / Category</th>
                    <th>Material Item / Description</th>
                    <th>Quantity & Rate</th>
                    <th>Total Amount (₹)</th>
                    <th>Invoice Proof</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>No direct purchases recorded.</td></tr>
                  ) : (
                    purchases.map(p => {
                      const isMat = p.isMaterialPurchase || (p.category && p.category.toLowerCase().includes('material')) || p.materialName;
                      return (
                        <tr key={p._id}>
                          <td>{dayjs(p.date).format('DD-MM-YYYY')}</td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: isMat ? '#EEF2FF' : '#F1F5F9',
                                color: isMat ? '#4338CA' : '#334155',
                                border: isMat ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                fontWeight: 600,
                                fontSize: '11px'
                              }}
                            >
                              {p.category || (isMat ? 'Material' : 'Purchase')}
                            </span>
                          </td>
                          <td>
                            {p.materialName ? (
                              <div>
                                <strong style={{ color: '#1E293B' }}>{p.materialName}</strong>
                                {p.description && <div style={{ fontSize: '12px', color: '#64748B' }}>{p.description}</div>}
                              </div>
                            ) : (
                              <span>{p.description || '—'}</span>
                            )}
                          </td>
                          <td style={{ fontSize: '13px', color: '#475569' }}>
                            {p.materialQuantity ? (
                              <span>
                                <strong>{p.materialQuantity} {p.materialUnit || 'Units'}</strong>
                                {p.materialUnitCost && <span style={{ color: '#64748B', fontSize: '11px' }}> (@ ₹{p.materialUnitCost})</span>}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </td>
                          <td>
                            {p.invoiceImage ? (
                              <a
                                href={p.invoiceImage}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: 'var(--color-brand)',
                                  fontWeight: 600,
                                  fontSize: '12px'
                                }}
                              >
                                <FileText size={13} /> View Invoice
                              </a>
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '12px' }}>No Proof</span>
                            )}
                          </td>
                          <td style={{ fontSize: '13px', color: '#64748B' }}>
                            {p.addedBy?.name || 'Accounts/System'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PETTY CASH */}
      {activeTab === 'pettycash' && (
        isPettyCashLoading || !pettyCash ? <LoadingSpinner text="Loading petty cash ledger..." style={{ padding: '48px' }} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                <select className="input" style={{ width: 'auto', padding: '6px 8px', fontSize: '12px' }} value={ledgerDate ? 'custom' : ledgerFilter} onChange={(e) => { const value = e.target.value; setLedgerDate(''); setLedgerFilter(value === 'custom' ? 'all' : value); }}>
                  <option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="this_month">This month</option>
                </select>
                <input type="date" className="input" style={{ width: '145px', padding: '5px 8px' }} value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
              </div>
            </div>

            <div className="table-scroll-hint"> Swipe horizontally to view all transactions </div>
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
                  {ledgerTransactions.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94A3B8' }}>No transactions recorded.</td></tr>
                  ) : (
                    ledgerTransactions.map((t, idx) => (
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
            <div className="table-scroll-hint" style={{ marginTop: '10px' }}> Swipe horizontally to view refill requests </div>
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
        isMaterialsLoading || !materials ? <LoadingSpinner text="Loading material inventory..." style={{ padding: '48px' }} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Materials KPI Summary */}
            {(() => {
              const items = materials.items || [];
              let directPurchaseCount = 0;
              let directPurchaseVal = 0;
              let siteStockCount = 0;
              let siteStockVal = 0;

              items.forEach(m => {
                const isDirect = m.source === 'direct_purchase' || m.source === 'Direct Purchase' || m.isDirectPurchase || m.remarks?.toLowerCase().includes('direct') || m.remarks?.toLowerCase().includes('invoice');
                const val = Number(m.balanceValue) || Number(m.totalValue) || 0;
                if (isDirect) {
                  directPurchaseCount++;
                  directPurchaseVal += val;
                } else {
                  siteStockCount++;
                  siteStockVal += val;
                }
              });

              return (
                <div className="kpi-grid-4">
                  <Card className="kpi-compact-card">
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Inventory Value</div>
                    <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--color-brand)' }}>
                      ₹{(materials.grandTotal || 0).toLocaleString('en-IN')}
                    </div>
                  </Card>

                  <Card className="kpi-compact-card">
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Direct Purchase Stock</div>
                    <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#4338CA' }}>
                      ₹{directPurchaseVal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {directPurchaseCount} Direct Items (No Petty Cash)
                    </div>
                  </Card>

                  <Card className="kpi-compact-card">
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Site Stock Value</div>
                    <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#059669' }}>
                      ₹{siteStockVal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {siteStockCount} Site Items
                    </div>
                  </Card>

                  <Card className="kpi-compact-card">
                    <div className="text-muted" style={{ fontSize: '12px', fontWeight: 600 }}>Total Material Items</div>
                    <div className="kpi-val" style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: '#1E293B' }}>
                      {items.length} Items
                    </div>
                  </Card>
                </div>
              );
            })()}

            {/* Direct Purchase Distinction Banner */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#1E40AF',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Layers size={20} color="#2563EB" style={{ flexShrink: 0 }} />
              <div>
                <strong>Material Inventory & Source Tracking:</strong> Items labeled <span style={{ fontWeight: 700, backgroundColor: '#E0E7FF', color: '#3730A3', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>DIRECT PURCHASE</span> are procured via direct company supplier invoices and <strong>do not affect or deduct from the site's petty cash ledger</strong>.
              </div>
            </div>

            <Card>
              <div className="mobile-flex-wrap" style={{ marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Site Material Inventory List</h3>
                  <p className="text-muted" style={{ fontSize: '12px', margin: '2px 0 0 0' }}>
                    Track all materials received, usage consumption, balance stock, and acquisition origin.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a href={`/api/exports/materials/${projectId}/excel`} className="btn btn-outline btn-sm">Export Excel</a>
                  <Button icon={Plus} onClick={() => setIsMaterialModalOpen(true)}>Add Material Item</Button>
                </div>
              </div>

              <div className="table-scroll-hint"> Swipe horizontally to view material inventory </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Source Type</th>
                      <th>Unit</th>
                      <th>Received</th>
                      <th>Used</th>
                      <th>Balance</th>
                      <th>Actions</th>
                      <th>Total Value (₹)</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.items.length === 0 ? (
                      <tr><td colSpan="9" style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>No materials added.</td></tr>
                    ) : (
                      materials.items.map(m => {
                        const isDirect = m.source === 'direct_purchase' || m.source === 'Direct Purchase' || m.isDirectPurchase || m.remarks?.toLowerCase().includes('direct') || m.remarks?.toLowerCase().includes('invoice');

                        return (
                          <tr key={m._id}>
                            <td>
                              <strong style={{ color: '#0F172A' }}>{m.itemName}</strong>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: isDirect ? '#EEF2FF' : '#F8FAFC',
                                  color: isDirect ? '#4338CA' : '#475569',
                                  border: isDirect ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                  fontWeight: isDirect ? 700 : 500,
                                  fontSize: '11px',
                                  letterSpacing: '0.02em'
                                }}
                              >
                                {isDirect ? 'DIRECT PURCHASE' : 'SITE STOCK'}
                              </span>
                            </td>
                            <td>{m.unit || '—'}</td>
                            <td style={{ fontWeight: 600 }}>{m.totalReceived}</td>
                            <td style={{ color: '#DC2626' }}>{m.totalUsed}</td>
                            <td style={{ fontWeight: 700, color: m.balance > 0 ? '#059669' : '#DC2626' }}>{m.balance}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <Button
                                size="sm"
                                onClick={() => openMaterialUsageModal(m)}
                                disabled={project?.status === 'on_hold' && !isSuperAdmin()}
                              >
                                Record Usage
                              </Button>{' '}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMaterialHistoryModal(m)}
                              >
                                History
                              </Button>
                            </td>
                            <td style={{ fontWeight: 600, color: '#0F172A' }}>₹{(m.balanceValue || 0).toLocaleString('en-IN')}</td>
                            <td style={{ fontSize: '12px', color: '#64748B' }}>
                              {m.remarks || (isDirect ? 'Direct company purchase' : '—')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {materials.items.length > 0 && (
                    <tfoot>
                      <tr style={{ fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                        <td colSpan="4">GRAND TOTAL MATERIAL VALUE</td>
                        <td colSpan="5" style={{ color: 'var(--color-brand)', fontSize: '15px' }}>₹{(materials.grandTotal || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </div>
        )
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

          <div className="table-scroll-hint"> Swipe horizontally to view tools </div>
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
        <div>
          {!closure?.isStarted && (closure?.completedCount || 0) === 0 ? (
            <Card style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '640px', margin: '20px auto' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: 'var(--color-brand)'
              }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Start Site Closure Procedure</h2>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                This project is currently marked as <strong>{project.status.toUpperCase()}</strong>.
                When physical on-site work is nearing completion, start the formal closure procedure to unlock the 10-step checklist (including tools audit, mandatory waste clearance photos, min 5 finished site photos, material transfer, and labour wage PDF documentation).
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Button
                  variant="primary"
                  icon={PlayCircle}
                  disabled={isStartingClosure || (project.status === 'on_hold' && !isSuperAdmin())}
                  onClick={handleStartClosure}
                >
                  {isStartingClosure ? 'Starting Closure...' : 'Start Closure Procedure'}
                </Button>
              </div>
              {project.status === 'on_hold' && (
                <p style={{ color: '#D97706', fontSize: '12px', marginTop: '12px' }}>
                  ⚠️ Project is currently ON HOLD. Hold must be resumed by admin before closure can begin.
                </p>
              )}
            </Card>
          ) : (
            <Card>
              <div className="mobile-flex-wrap" style={{ marginBottom: '16px', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Project Closure Checklist (10 Requirements)</h3>
                  <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                    Completed: <strong>{closure?.completedCount || 0}/10</strong> items fulfilled
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge variant={closure?.completedCount === 10 ? 'completed' : 'pending'}>
                    {closure?.completedCount === 10 ? 'CLOSED & COMPLETED' : 'IN PROGRESS'}
                  </Badge>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{
                  width: `${((closure?.completedCount || 0) / 10) * 100}%`,
                  height: '100%',
                  backgroundColor: closure?.completedCount === 10 ? '#16A34A' : 'var(--color-brand)',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Tools List */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>1. List of Tools at Site</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={closure?.toolsList || ''}
                    onChange={(e) => setClosure({ ...closure, toolsList: e.target.value })}
                    onBlur={(e) => handleUpdateClosureText('toolsList', e.target.value)}
                    placeholder="Enter inventory of company tools present at site closure..."
                  />
                </div>

                {/* 2. Waste Disposal with Mandatory Photo Proof */}
                <div className="form-group" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, margin: 0 }}>2. Waste Disposal & Site Cleared?</label>
                    <Badge variant={closure?.wasteDisposal?.done && ((closure?.wasteDisposal?.photoUrls?.length || 0) > 0 || wastePhotosFiles.length > 0) ? 'completed' : 'pending'}>
                      {closure?.wasteDisposal?.done ? ((closure?.wasteDisposal?.photoUrls?.length || 0) > 0 || wastePhotosFiles.length > 0 ? 'Verified & Completed' : 'Photo Required') : 'Pending'}
                    </Badge>
                  </div>

                  <select
                    className="input"
                    value={closure?.wasteDisposal?.done ? 'true' : 'false'}
                    onChange={(e) => {
                      const isYes = e.target.value === 'true';
                      setClosure({
                        ...closure,
                        wasteDisposal: { ...closure?.wasteDisposal, done: isYes }
                      });
                      if (!isYes) {
                        handleUpdateClosureText('wasteDisposalDone', 'false');
                      }
                    }}
                    style={{ marginBottom: '10px' }}
                  >
                    <option value="false">NO — Waste disposal pending</option>
                    <option value="true">YES — Site cleared & debris removed</option>
                  </select>

                  {/* Mandatory photo submission when YES */}
                  {closure?.wasteDisposal?.done && (
                    <div style={{
                      padding: '12px 14px',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '6px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#166534' }}>
                          📷 Proof of Waste Disposal (Mandatory for YES) *
                        </span>
                        <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                          {(closure?.wasteDisposal?.photoUrls?.length || 0) + wastePhotosFiles.length > 0 ? '✓ Proof Attached' : '⚠️ Photo required to save'}
                        </span>
                      </div>

                      {closure?.wasteDisposal?.photoUrls?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          {closure.wasteDisposal.photoUrls.map((url, idx) => (
                            <div key={idx} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                              <img src={url} alt="Waste clearance" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                type="button"
                                onClick={() => handleRemoveClosurePhoto(url, 'waste')}
                                style={{
                                  position: 'absolute', top: 2, right: 2,
                                  backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF',
                                  border: 'none', borderRadius: '50%', width: '18px', height: '18px',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                                }}
                                title="Remove photo"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => setWastePhotosFiles(Array.from(e.target.files || []))}
                        className="input"
                        style={{ backgroundColor: '#FFF' }}
                      />
                      {wastePhotosFiles.length > 0 && (
                        <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px' }}>
                          ✓ {wastePhotosFiles.length} new waste photo(s) selected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Returned Rented Tools */}
                <div className="form-group" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, margin: 0 }}>3. Returned Rented Tools?</label>
                    <Badge variant={closure?.rentedToolsReturned?.done ? 'completed' : 'pending'}>
                      {closure?.rentedToolsReturned?.done ? 'Returned' : 'Pending Return'}
                    </Badge>
                  </div>
                  <select
                    className="input"
                    value={closure?.rentedToolsReturned?.done ? 'true' : 'false'}
                    onChange={(e) => handleUpdateClosureText('rentedToolsReturnedDone', e.target.value)}
                    style={{ marginBottom: '10px' }}
                  >
                    <option value="false">NO — Rented tools pending return</option>
                    <option value="true">YES — All rented tools returned</option>
                  </select>

                  {closure?.rentedToolsReturned?.photoUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <img src={closure.rentedToolsReturned.photoUrl} alt="Return receipt" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Return slip / receipt attached</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setRentedToolPhotoFile(e.target.files?.[0] || null)}
                    className="input"
                    style={{ backgroundColor: '#FFF' }}
                  />
                  {rentedToolPhotoFile && (
                    <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
                      ✓ New receipt photo selected: {rentedToolPhotoFile.name}
                    </div>
                  )}
                </div>

                {/* 4. Completed Site Photographs (Minimum 5 Photos) */}
                <div className="form-group" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 600, margin: 0 }}>4. Completed Site Photographs (Minimum 5 Photos)</label>
                    <Badge variant={(closure?.completedSitePhotos?.length || 0) + sitePhotosFiles.length >= 5 ? 'completed' : 'pending'}>
                      Photos: {(closure?.completedSitePhotos?.length || 0) + sitePhotosFiles.length}/5 {(closure?.completedSitePhotos?.length || 0) + sitePhotosFiles.length >= 5 ? '✓ Fulfilled' : '⚠️ Min 5 required'}
                    </Badge>
                  </div>
                  <p className="text-muted" style={{ fontSize: '12px', marginBottom: '12px' }}>
                    Capture finished angles, rooms, exterior elevation, and detailed work (minimum 5 photographs mandatory for completion).
                  </p>

                  {closure?.completedSitePhotos?.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                      {closure.completedSitePhotos.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #CBD5E1' }}>
                          <img src={url} alt={`Site photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveClosurePhoto(url, 'site')}
                            style={{
                              position: 'absolute', top: 2, right: 2,
                              backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF',
                              border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                            }}
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setSitePhotosFiles(Array.from(e.target.files || []))}
                    className="input"
                    style={{ backgroundColor: '#FFF' }}
                  />
                  {sitePhotosFiles.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '6px' }}>
                      ✓ {sitePhotosFiles.length} new site photo(s) selected for upload on save
                    </div>
                  )}
                </div>

                {/* 5. Pending Vendor Payments */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>5. Pending Vendor Payments</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <input
                      className="input"
                      placeholder="Vendor payment details & description..."
                      value={closure?.pendingVendorPayments?.description || ''}
                      onChange={(e) => setClosure({
                        ...closure,
                        pendingVendorPayments: { ...closure?.pendingVendorPayments, description: e.target.value }
                      })}
                      onBlur={(e) => handleUpdateClosureText('pendingVendorPaymentsDesc', e.target.value)}
                    />
                    <input
                      type="number"
                      className="input"
                      placeholder="Amount (₹)"
                      value={closure?.pendingVendorPayments?.amount || ''}
                      onChange={(e) => setClosure({
                        ...closure,
                        pendingVendorPayments: { ...closure?.pendingVendorPayments, amount: e.target.value }
                      })}
                      onBlur={(e) => handleUpdateClosureText('pendingVendorPaymentsAmount', e.target.value)}
                    />
                  </div>
                </div>

                {/* 6. Balance Materials */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>6. Balance Materials at Site</label>
                  <textarea
                    className="input"
                    rows="2"
                    value={closure?.balanceMaterials || ''}
                    onChange={(e) => setClosure({ ...closure, balanceMaterials: e.target.value })}
                    onBlur={(e) => handleUpdateClosureText('balanceMaterials', e.target.value)}
                    placeholder="List leftover materials, quantities, condition..."
                  />
                </div>

                {/* 7. Electrical DB Marking */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>7. Electrical DB Marking Completed?</label>
                  <select
                    className="input"
                    value={closure?.electricalDbMarking ? 'true' : 'false'}
                    onChange={(e) => handleUpdateClosureText('electricalDbMarking', e.target.value)}
                  >
                    <option value="false">NO — DB markings pending</option>
                    <option value="true">YES — Distribution board circuits labelled</option>
                  </select>
                </div>

                {/* 8. Transfer of Balance Materials */}
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>8. Transfer of Balance Materials</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <select
                      className="input"
                      value={closure?.materialTransfer?.destination || ''}
                      onChange={(e) => handleUpdateClosureText('materialTransferDestination', e.target.value)}
                    >
                      <option value="">Select Destination...</option>
                      <option value="godown">Godown / Warehouse</option>
                      <option value="new_site">New Site Transfer</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      className="input"
                      placeholder="Destination details or note..."
                      value={closure?.materialTransfer?.destinationNote || ''}
                      onChange={(e) => setClosure({
                        ...closure,
                        materialTransfer: { ...closure?.materialTransfer, destinationNote: e.target.value }
                      })}
                      onBlur={(e) => handleUpdateClosureText('materialTransferNote', e.target.value)}
                    />
                  </div>
                </div>

                {/* 9. Petty Cash Closure */}
                <div className="form-group" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, margin: 0 }}>9. Petty Cash Closure & Hand-in</label>
                    <Badge variant={closure?.pettyCashClosure?.finalAmount != null ? 'completed' : 'pending'}>
                      {closure?.pettyCashClosure?.finalAmount != null ? 'Settled' : 'Pending Settlement'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                    System Petty Cash Balance: <strong>₹{(financials?.totalPettyCashBalance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter final cash handed in / settled (₹)..."
                    value={closure?.pettyCashClosure?.finalAmount != null ? closure.pettyCashClosure.finalAmount : ''}
                    onChange={(e) => setClosure({
                      ...closure,
                      pettyCashClosure: { finalAmount: e.target.value }
                    })}
                    onBlur={(e) => handleUpdateClosureText('pettyCashClosureFinalAmount', e.target.value)}
                  />
                </div>

                {/* 10. Labour Payment Details & PDF Submission */}
                <div className="form-group" style={{ padding: '16px', backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, margin: 0 }}>10. Labour Payment Details & PDF Submission</label>
                    <Badge variant={closure?.labourPayment?.details || closure?.labourPayment?.fileUrl || labourPaymentFile ? 'completed' : 'pending'}>
                      {closure?.labourPayment?.fileUrl ? 'PDF Submitted' : (closure?.labourPayment?.details ? 'Details Provided' : 'Pending')}
                    </Badge>
                  </div>

                  <textarea
                    className="input"
                    rows="2"
                    value={closure?.labourPayment?.details || ''}
                    onChange={(e) => setClosure({
                      ...closure,
                      labourPayment: { ...closure?.labourPayment, details: e.target.value }
                    })}
                    onBlur={(e) => handleUpdateClosureText('labourPaymentDetails', e.target.value)}
                    placeholder="Labour payment remarks, wage settlement summary, worker sign-off..."
                    style={{ marginBottom: '12px' }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      📄 Labour Payment Details PDF Submission:
                    </label>

                    {closure?.labourPayment?.fileUrl && (
                      <div style={{ marginBottom: '8px' }}>
                        <a
                          href={closure.labourPayment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#2563EB',
                            borderColor: '#BFDBFE',
                            backgroundColor: '#EFF6FF'
                          }}
                        >
                          <FileText size={14} />
                          <span>View Uploaded Labour Payment Document (PDF)</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setLabourPaymentFile(e.target.files?.[0] || null)}
                      className="input"
                      style={{ backgroundColor: '#FFF' }}
                    />
                    {labourPaymentFile && (
                      <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
                        ✓ PDF Document Selected: <strong>{labourPaymentFile.name}</strong> ({(labourPaymentFile.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Progress Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                  <Button
                    variant="primary"
                    icon={Upload}
                    onClick={handleSaveClosureMultipart}
                    disabled={isSavingClosure || (project.status === 'on_hold' && !isSuperAdmin())}
                  >
                    {isSavingClosure ? 'Saving & Uploading Files...' : 'Save Site Closure Progress & Upload Files'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 8: SCHEDULE */}
      {activeTab === 'schedule' && (
        <ScheduleTab projectId={projectId} />
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
      <Modal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} title="Add Direct Company Purchase" footer={<Button onClick={handleAddPurchase}>Add Direct Purchase</Button>}>
        <form onSubmit={handleAddPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} color="#16A34A" style={{ flexShrink: 0 }} />
            <div>
              <strong>Company Invoice Purchase:</strong> This expense is paid directly through corporate accounts and will <strong>not deduct from the site's petty cash balance</strong>.
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Purchase Category *</label>
              <select
                className="input"
                value={purchaseForm.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const isMat = !['Tools & Machinery', 'Subcontractor & Services', 'Logistics & Transportation', 'Miscellaneous'].includes(cat);
                  setPurchaseForm({
                    ...purchaseForm,
                    category: cat,
                    isMaterialPurchase: isMat,
                    materialName: isMat && !purchaseForm.materialName ? cat : purchaseForm.materialName
                  });
                }}
                required
              >
                <option value="Material">Material (General)</option>
                <option value="Cement">Cement & Aggregates</option>
                <option value="Steel & Rebar">Steel & Rebar</option>
                <option value="Sand & Aggregates">Sand & Aggregates</option>
                <option value="Bricks & Blocks">Bricks & AAC Blocks</option>
                <option value="Plumbing & Sanitary">Plumbing & Sanitary</option>
                <option value="Electrical Goods">Electrical Goods</option>
                <option value="Paint & Chemicals">Paint & Chemicals</option>
                <option value="Tools & Machinery">Tools & Machinery</option>
                <option value="Consumables & Safety">Consumables & Safety Gear</option>
                <option value="Subcontractor & Services">Subcontractor & Services</option>
                <option value="Logistics & Transportation">Logistics & Transportation</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>

            <div className="form-group">
              <label>Vendor / Supplier Name</label>
              <input
                className="input"
                placeholder="e.g. UltraTech Dealer / ABC Traders"
                value={purchaseForm.description}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
              />
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#3730A3', backgroundColor: '#EEF2FF', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={purchaseForm.isMaterialPurchase}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, isMaterialPurchase: e.target.checked })}
            />
            Link & Add to Site Material Inventory (Tagged as DIRECT PURCHASE)
          </label>

          {purchaseForm.isMaterialPurchase && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '12px' }}>Material Item Name *</label>
                <input
                  className="input"
                  placeholder="e.g. UltraTech 53 Grade Cement / 12mm TMT Steel"
                  value={purchaseForm.materialName}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, materialName: e.target.value })}
                  required
                />
              </div>

              <div className="responsive-grid-3col" style={{ gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '12px' }}>Unit *</label>
                  <select
                    className="input"
                    value={purchaseForm.materialUnit || 'Bags'}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, materialUnit: e.target.value })}
                  >
                    <option value="Bags">Bags</option>
                    <option value="Tons">Tons</option>
                    <option value="Kg">Kg</option>
                    <option value="Liters">Liters</option>
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Pieces">Pieces / Nos</option>
                    <option value="Brass">Brass</option>
                    <option value="Trips">Trips / Loads</option>
                    <option value="Meters">Meters</option>
                    <option value="Units">Units / Boxes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '12px' }}>Quantity Received *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="e.g. 100"
                    value={purchaseForm.materialQuantity}
                    onChange={(e) => {
                      const qty = e.target.value;
                      const unitCost = purchaseForm.materialUnitCost;
                      const amount = qty && unitCost ? (Number(qty) * Number(unitCost)).toFixed(2) : purchaseForm.amount;
                      setPurchaseForm({ ...purchaseForm, materialQuantity: qty, amount: amount || purchaseForm.amount });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '12px' }}>Unit Rate (₹/unit)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input"
                    placeholder="e.g. 380"
                    value={purchaseForm.materialUnitCost}
                    onChange={(e) => {
                      const rate = e.target.value;
                      const qty = purchaseForm.materialQuantity;
                      const amount = qty && rate ? (Number(qty) * Number(rate)).toFixed(2) : purchaseForm.amount;
                      setPurchaseForm({ ...purchaseForm, materialUnitCost: rate, amount: amount || purchaseForm.amount });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Total Invoice Amount (₹) *</label>
            <input
              type="number"
              min="0"
              step="any"
              className="input"
              placeholder="e.g. 38000"
              value={purchaseForm.amount}
              onChange={(e) => {
                const amt = e.target.value;
                const qty = purchaseForm.materialQuantity;
                const unitRate = amt && qty && Number(qty) > 0 ? (Number(amt) / Number(qty)).toFixed(2) : purchaseForm.materialUnitCost;
                setPurchaseForm({ ...purchaseForm, amount: amt, materialUnitCost: unitRate });
              }}
              required
            />
          </div>

          <div className="form-group">
            <label>Invoice File / Receipt Photo (REQUIRED) *</label>
            <input
              type="file"
              className="input"
              accept="image/*,application/pdf"
              onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)}
              required
            />
            {purchaseFile && (
              <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
                ✓ Selected file: <strong>{purchaseFile.name}</strong> ({(purchaseFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
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
      <Modal isOpen={isMaterialModalOpen} onClose={() => setIsMaterialModalOpen(false)} title="Add Site Material Item" footer={<Button onClick={handleAddMaterial}>Add Material Item</Button>}>
        <form onSubmit={handleAddMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label>Acquisition Source / Origin *</label>
            <select
              className="input"
              value={materialForm.source || 'Direct Purchase'}
              onChange={(e) => setMaterialForm({ ...materialForm, source: e.target.value })}
            >
              <option value="Direct Purchase">Direct Purchase (Direct invoice — No Petty Cash deduction)</option>
              <option value="Site Stock">Site Stock / General Site Entry</option>
              <option value="Internal Transfer">Internal Transfer from another project</option>
            </select>
          </div>

          <div className="form-group">
            <label>Item Name *</label>
            <input
              className="input"
              placeholder="e.g. UltraTech Cement / 16mm TMT Steel"
              value={materialForm.itemName}
              onChange={(e) => setMaterialForm({ ...materialForm, itemName: e.target.value })}
              required
            />
          </div>

          <div className="responsive-grid-2col" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="e.g. 50"
                value={materialForm.quantity}
                onChange={(e) => {
                  const qty = e.target.value;
                  const unitCost = materialForm.unitCost;
                  const total = qty && unitCost ? (Number(qty) * Number(unitCost)).toFixed(2) : materialForm.totalValue;
                  setMaterialForm({ ...materialForm, quantity: qty, totalValue: total });
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit *</label>
              <select
                className="input"
                value={materialForm.unit}
                onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
              >
                <option value="Bags">Bags</option>
                <option value="Tons">Tons</option>
                <option value="Kg">Kg</option>
                <option value="Liters">Liters</option>
                <option value="Sq.Ft">Sq.Ft</option>
                <option value="Pieces">Pieces / Nos</option>
                <option value="Brass">Brass</option>
                <option value="Trips">Trips / Loads</option>
                <option value="Meters">Meters</option>
                <option value="Units">Units / Boxes</option>
              </select>
            </div>
          </div>

          <div className="responsive-grid-2col" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Unit Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="e.g. 400"
                value={materialForm.unitCost}
                onChange={(e) => {
                  const cost = e.target.value;
                  const qty = materialForm.quantity;
                  const total = qty && cost ? (Number(qty) * Number(cost)).toFixed(2) : materialForm.totalValue;
                  setMaterialForm({ ...materialForm, unitCost: cost, totalValue: total });
                }}
              />
            </div>

            <div className="form-group">
              <label>Total Value (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                placeholder="e.g. 20000"
                value={materialForm.totalValue}
                onChange={(e) => setMaterialForm({ ...materialForm, totalValue: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Date Received</label>
            <input
              type="date"
              className="input"
              value={materialForm.date}
              onChange={(e) => setMaterialForm({ ...materialForm, date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Remarks / Supplier Note</label>
            <textarea
              className="input"
              rows="2"
              placeholder="e.g. Delivered on site by vendor, verified by supervisor"
              value={materialForm.remarks}
              onChange={(e) => setMaterialForm({ ...materialForm, remarks: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Record Material Usage Modal */}
      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        title={`Record Usage — ${selectedUsageItem?.itemName || 'Material'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsUsageModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitMaterialUsage} disabled={isSubmittingUsage}>
              {isSubmittingUsage ? 'Recording...' : 'Record Usage'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitMaterialUsage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600, letterSpacing: '0.05em' }}>CURRENT STOCK BALANCE</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E3A8A', marginTop: '2px' }}>
                {selectedUsageItem?.balance} {selectedUsageItem?.unit || ''}
              </div>
            </div>
            <Badge variant="active">In Stock</Badge>
          </div>

          <div className="form-group">
            <label>Quantity Used ({selectedUsageItem?.unit || 'Units'}) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              max={selectedUsageItem?.balance || undefined}
              className="input"
              value={usageFormData.quantity}
              onChange={(e) => setUsageFormData({ ...usageFormData, quantity: e.target.value })}
              placeholder={`e.g. 5 ${selectedUsageItem?.unit || ''}`}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Usage Reason / Location *</label>
            <input
              className="input"
              value={usageFormData.reason}
              onChange={(e) => setUsageFormData({ ...usageFormData, reason: e.target.value })}
              placeholder="e.g. 1st floor brick masonry / plastering work"
              required
            />
          </div>

          <div className="form-group">
            <label>Date of Consumption</label>
            <input
              type="date"
              className="input"
              value={usageFormData.date}
              onChange={(e) => setUsageFormData({ ...usageFormData, date: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Material Transaction History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Inventory History — ${selectedHistoryItem?.itemName || 'Material'}`}
        footer={<Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            backgroundColor: '#F8FAFC',
            borderRadius: '6px',
            border: '1px solid var(--color-border)'
          }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Item: </span>
              <strong>{selectedHistoryItem?.itemName}</strong> ({selectedHistoryItem?.unit || '—'})
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Current Balance: </span>
              <strong style={{ color: 'var(--color-brand)' }}>{selectedHistoryItem?.balance} {selectedHistoryItem?.unit || ''}</strong>
            </div>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Remarks / Reason</th>
                </tr>
              </thead>
              <tbody>
                {!selectedHistoryItem?.transactions || selectedHistoryItem.transactions.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...selectedHistoryItem.transactions].reverse().map((tx, idx) => (
                    <tr key={idx}>
                      <td>{dayjs(tx.date).format('DD MMM YYYY')}</td>
                      <td>
                        <Badge variant={tx.type === 'received' ? 'completed' : (tx.type === 'usage' ? 'pending' : 'active')}>
                          {tx.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ fontWeight: 600, color: tx.quantity > 0 ? '#16A34A' : '#DC2626' }}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {selectedHistoryItem.unit || ''}
                      </td>
                      <td>{tx.remarks || tx.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
}
