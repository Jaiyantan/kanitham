'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  IndianRupee,
  AlertTriangle,
  Clock,
  Phone,
  FileText,
  Share2,
  Calendar,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import { PaymentMode, FollowupUrgency } from '@/types';
import { toast } from 'sonner';

export default function PaymentsPage() {
  const queryClient = useQueryClient();

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<string | null>(null);

  // Payment Form
  const [formData, setFormData] = useState({
    customer_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'RTGS' as PaymentMode,
    reference_number: '',
    bank_name: 'HDFC Bank',
    notes: '',
  });

  // Query Payments & Follow-up
  const { data, isLoading } = useQuery({
    queryKey: ['payments-data'],
    queryFn: async () => {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Failed to load payments data');
      return res.json();
    },
  });

  // Query Customers list for dropdown
  const { data: customerData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      return res.json();
    },
  });

  // Query Ledger for selected customer
  const { data: ledgerData, isLoading: loadingLedger } = useQuery({
    queryKey: ['customer-ledger', selectedCustomerForLedger],
    queryFn: async () => {
      if (!selectedCustomerForLedger) return null;
      const res = await fetch(`/api/customers/${selectedCustomerForLedger}/ledger`);
      if (!res.ok) throw new Error('Failed to load ledger');
      return res.json();
    },
    enabled: !!selectedCustomerForLedger,
  });

  const payments = data?.payments || [];
  const followupList = data?.followup || [];
  const outstandingList = data?.outstanding || [];

  const totalOutstanding = outstandingList.reduce(
    (sum: number, c: any) => sum + Number(c.outstanding_amount || 0),
    0
  );

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      setIsRecordOpen(false);
      setFormData({
        customer_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'RTGS',
        reference_number: '',
        bank_name: 'HDFC Bank',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['payments-data'] });
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error recording payment');
    },
  });

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.amount || !formData.payment_mode) {
      toast.error('Please enter customer, amount, and payment mode');
      return;
    }
    recordPaymentMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

  // WhatsApp formatted statement generator
  const copyWhatsAppStatement = () => {
    if (!ledgerData) return;
    const cust = ledgerData.customer;
    let text = `*STATEMENT OF ACCOUNT - ${cust.name.toUpperCase()}*\n`;
    text += `*Date:* ${format(new Date(), 'dd/MM/yyyy')}\n`;
    text += `*Opening Balance:* ₹${Number(ledgerData.opening_balance).toLocaleString('en-IN')}\n\n`;
    text += `*TRANSACTION HISTORY:*\n`;

    ledgerData.entries.forEach((e: any) => {
      const dateStr = format(new Date(e.txn_date), 'dd/MM/yy');
      if (e.txn_type === 'INVOICE') {
        text += `• ${dateStr} | ${e.description}: +₹${Number(e.debit).toLocaleString('en-IN')} (Bal: ₹${Number(e.balance_running).toLocaleString('en-IN')})\n`;
      } else {
        text += `• ${dateStr} | ${e.description}: -₹${Number(e.credit).toLocaleString('en-IN')} (Bal: ₹${Number(e.balance_running).toLocaleString('en-IN')})\n`;
      }
    });

    text += `\n*NET OUTSTANDING BALANCE:* ₹${Number(ledgerData.final_outstanding).toLocaleString('en-IN')}\n`;
    text += `Kindly arrange for remittance at the earliest.\nThank you!`;

    navigator.clipboard.writeText(text);
    toast.success('WhatsApp reconciliation statement copied to clipboard!');
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Payments, Ledger &amp; Collections
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer-level payment tracking &bull; Priority follow-up hierarchy &bull; Interleaved ledger &amp; WhatsApp statements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded bg-[#0b1220] border border-slate-800 text-xs font-mono">
            Total Outstanding:{' '}
            <strong className="text-emerald-400 text-sm">
              ₹{(totalOutstanding / 100000).toFixed(2)} Lakhs
            </strong>
          </div>
          <Button onClick={() => setIsRecordOpen(true)} className="font-mono text-xs">
            <Plus className="w-4 h-4 mr-1" /> RECORD PAYMENT
          </Button>
        </div>
      </div>

      {/* Priority Follow-up List (v_payment_followup) */}
      <Card glowBorder="rose">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-rose-400">
              <AlertTriangle className="w-4 h-4" /> Collections Follow-up Priority List
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              Hierarchy: NEVER_PAID &rarr; &gt;60d CRITICAL &rarr; &gt;30d WARNING
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Customer Name</th>
                <th className="console-th">Urgency</th>
                <th className="console-th">Total Outstanding</th>
                <th className="console-th">Last Payment Date</th>
                <th className="console-th">Days Overdue</th>
                <th className="console-th">Phone</th>
                <th className="console-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {followupList.map((f: any) => {
                const isCritical = f.followup_urgency === 'CRITICAL';
                const isNever = f.followup_urgency === 'NEVER_PAID';

                return (
                  <tr
                    key={f.customer_id}
                    className={`hover:bg-slate-900/50 ${
                      isNever || isCritical ? 'bg-rose-950/15' : 'bg-amber-950/10'
                    }`}
                  >
                    <td className="console-td font-semibold text-slate-200">
                      {f.customer_name}
                    </td>
                    <td className="console-td">
                      <Badge
                        variant={isNever || isCritical ? 'critical' : 'warning'}
                        glow={isNever || isCritical}
                        size="sm"
                      >
                        {f.followup_urgency.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="console-td font-mono font-bold text-emerald-400">
                      ₹{Number(f.outstanding_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {f.last_payment_date
                        ? format(new Date(f.last_payment_date), 'dd MMM yyyy')
                        : 'Never Paid'}
                    </td>
                    <td className="console-td font-mono font-bold">
                      <span
                        className={
                          isNever || isCritical
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }
                      >
                        {f.days_since_last_payment ? `${f.days_since_last_payment} days` : 'Pre-system'}
                      </span>
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {f.phone || 'N/A'}
                    </td>
                    <td className="console-td text-right space-x-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCustomerForLedger(f.customer_id)}
                      >
                        Ledger
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setFormData({ ...formData, customer_id: f.customer_id });
                          setIsRecordOpen(true);
                        }}
                      >
                        Pay
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Two columns: Customer Ledger View & Payment Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Ledger Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <FileText className="w-4 h-4 text-sky-400" /> Customer Account Ledger
              </CardTitle>
              {selectedCustomerForLedger && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyWhatsAppStatement}
                  className="text-[11px]"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copy for WhatsApp
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[400px]">
            {!selectedCustomerForLedger ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Select a customer above or click &quot;Ledger&quot; to inspect chronological transactions
              </div>
            ) : loadingLedger ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Calculating running ledger balance...
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Ledger Header */}
                <div className="bg-[#090e18] p-3 rounded border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-100 text-sm">
                      {ledgerData.customer.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Opening Balance:{' '}
                      <strong>₹{Number(ledgerData.opening_balance).toLocaleString('en-IN')}</strong>{' '}
                      (as of {ledgerData.opening_balance_date || 'System Cutoff'})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Current Outstanding
                    </div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      ₹{Number(ledgerData.final_outstanding).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="console-th">Date</th>
                      <th className="console-th">Transaction</th>
                      <th className="console-th">Debit (+)</th>
                      <th className="console-th">Credit (-)</th>
                      <th className="console-th">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {ledgerData.entries.map((e: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="console-td text-slate-400">
                          {format(new Date(e.txn_date), 'dd/MM/yy')}
                        </td>
                        <td className="console-td text-slate-200 font-sans">
                          {e.description}
                        </td>
                        <td className="console-td text-rose-300">
                          {Number(e.debit) > 0 ? `₹${Number(e.debit).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="console-td text-emerald-400">
                          {Number(e.credit) > 0 ? `₹${Number(e.credit).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="console-td font-bold text-slate-100">
                          ₹{Number(e.balance_running).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payment Receipts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <CreditCard className="w-4 h-4 text-emerald-400" /> Recent Payment Receipts
              </CardTitle>
              <span className="text-xs text-slate-500 font-mono">
                {payments.length} transactions
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="console-th">Customer</th>
                  <th className="console-th">Amount</th>
                  <th className="console-th">Mode</th>
                  <th className="console-th">UTR / Ref #</th>
                  <th className="console-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="console-td font-semibold text-slate-200">
                      {p.customer_name}
                    </td>
                    <td className="console-td font-mono font-bold text-emerald-400">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="console-td">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        {p.payment_mode}
                      </span>
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {p.reference_number || 'N/A'}
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Customer Payment Remittance"
        subtitle="Capture RTGS, NEFT, GPay, or Cash receipt at customer level"
        maxWidth="md"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              required
            >
              <option value="">-- Choose Customer --</option>
              {customerData?.customers?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Outstanding: ₹{Number(c.outstanding_amount || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 50000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value as PaymentMode })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                required
              >
                <option value="RTGS">RTGS (Bank Transfer)</option>
                <option value="NEFT">NEFT (Bank Transfer)</option>
                <option value="GPAY">Google Pay (GPay)</option>
                <option value="UPI_OTHER">Other UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                UTR / Reference Number
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC26100599182"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC, SBI, ICICI"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={recordPaymentMutation.isPending}>
              Record &amp; Update Ledger
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

