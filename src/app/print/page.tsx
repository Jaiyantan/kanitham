'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PrintManagementPage() {
  const { openPanel } = useContextPanel();
  const queryClient = useQueryClient();

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [formData, setFormData] = useState({
    order_id: '',
    printer_id: '',
    material_type: 'Metalized BOPP',
    width_mm: '',
    height_mm: '',
    color_count: '6',
    quantity: '',
    quantity_unit: 'kg',
    expected_dispatch_date: '',
    cost_per_unit: '',
    notes: '',
  });

  // Query Print Jobs
  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ['print-jobs'],
    queryFn: async () => {
      const res = await fetch('/api/print-jobs');
      if (!res.ok) throw new Error('Failed to load print jobs');
      return res.json();
    },
  });

  // Query Printers
  const { data: printersData, isLoading: loadingPrinters } = useQuery({
    queryKey: ['printers'],
    queryFn: async () => {
      const res = await fetch('/api/printers');
      if (!res.ok) throw new Error('Failed to load printers');
      return res.json();
    },
  });

  // Query Orders ready for print
  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-print'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=DESIGN_APPROVED');
      return res.json();
    },
  });

  const printJobs = jobsData?.print_jobs || [];
  const printers = printersData?.printers || [];

  // Create Print Job Mutation
  const createJobMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create print job');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Print job dispatched to Delhi printer');
      setIsAddJobOpen(false);
      queryClient.invalidateQueries({ queryKey: ['print-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.order_id || !formData.printer_id || !formData.quantity) {
      toast.error('Please select order, printer, and enter quantity');
      return;
    }
    createJobMutation.mutate({
      ...formData,
      quantity: parseFloat(formData.quantity),
      width_mm: formData.width_mm ? parseFloat(formData.width_mm) : undefined,
      height_mm: formData.height_mm ? parseFloat(formData.height_mm) : undefined,
      color_count: formData.color_count ? parseInt(formData.color_count) : undefined,
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : undefined,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Delhi Print Operations
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production scheduling, cylinder specs, and dispatch monitoring across Delhi press partners
          </p>
        </div>

        <Button onClick={() => setIsAddJobOpen(true)} className="font-mono text-xs">
          <Plus className="w-4 h-4 mr-1" /> SEND JOB TO PRINT
        </Button>
      </div>

      {/* Delhi Printers Master Directory Cards */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Delhi Printing Partners
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {printers.map((p: any) => (
            <Card key={p.id} className="p-3.5 bg-[#0a0f1c] border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-sm">{p.name}</div>
                  <div className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {p.address || p.city}
                  </div>
                </div>
                <Badge variant="info" size="sm">
                  {p.active_jobs_count || 0} active jobs
                </Badge>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {p.contact_person} &bull; {p.phone || 'N/A'}
                  </span>
                </div>
                {p.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{p.email}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Print Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Printer className="w-4 h-4 text-amber-400" /> Active Print Jobs in Delhi
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">
              {printJobs.length} total jobs
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Job Ref</th>
                <th className="console-th">Customer / Order</th>
                <th className="console-th">Delhi Printer</th>
                <th className="console-th">Material Specifications</th>
                <th className="console-th">Quantity</th>
                <th className="console-th">Print Cost</th>
                <th className="console-th">Target Dispatch</th>
                <th className="console-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {printJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-mono">
                    No print jobs active right now.
                  </td>
                </tr>
              ) : (
                printJobs.map((j: any) => (
                  <tr
                    key={j.id}
                    onClick={() => openPanel('order', j.order_id)}
                    className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <td className="console-td font-mono text-slate-400">
                      PJ-{j.id.substring(0, 6)}
                    </td>
                    <td className="console-td">
                      <div className="font-bold text-slate-200">{j.customer_name}</div>
                      <div className="text-[10px] text-sky-400 font-mono">
                        Order #{j.order_number} &bull; {j.product_name}
                      </div>
                    </td>
                    <td className="console-td font-semibold text-amber-300">
                      {j.printer_name}
                    </td>
                    <td className="console-td text-slate-300">
                      <div>{j.material_type || 'Custom Film'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {j.width_mm && j.height_mm ? `${j.width_mm}x${j.height_mm}mm` : ''}{' '}
                        {j.color_count ? `&bull; ${j.color_count} Colors` : ''}
                      </div>
                    </td>
                    <td className="console-td font-mono font-bold text-slate-200">
                      {Number(j.quantity).toLocaleString('en-IN')} {j.quantity_unit}
                    </td>
                    <td className="console-td font-mono font-bold text-emerald-400">
                      {j.total_cost ? `₹${Number(j.total_cost).toLocaleString('en-IN')}` : 'TBD'}
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {j.expected_dispatch_date
                        ? format(new Date(j.expected_dispatch_date), 'dd MMM yyyy')
                        : 'Pending'}
                    </td>
                    <td className="console-td">
                      <Badge
                        variant={
                          j.status === 'DISPATCHED'
                            ? 'success'
                            : j.status === 'IN_PRODUCTION'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {j.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Modal: Send to Print */}
      <Modal
        isOpen={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        title="Send Job to Delhi Printer"
        subtitle="Specify film specs, cylinder colors, and target dispatch date"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Order select */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Approved Order *
            </label>
            <select
              value={formData.order_id}
              onChange={(e) => {
                const ord = ordersData?.orders?.find((o: any) => o.id === e.target.value);
                setFormData({
                  ...formData,
                  order_id: e.target.value,
                  quantity: ord?.quantity_ordered?.toString() || formData.quantity,
                  quantity_unit: ord?.quantity_unit || formData.quantity_unit,
                });
              }}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              required
            >
              <option value="">-- Choose Order --</option>
              {ordersData?.orders?.map((o: any) => (
                <option key={o.id} value={o.id}>
                  Order #{o.order_number} - {o.customer_name} ({o.quantity_ordered} {o.quantity_unit})
                </option>
              ))}
            </select>
          </div>

          {/* Printer select */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Delhi Printer *
            </label>
            <select
              value={formData.printer_id}
              onChange={(e) => setFormData({ ...formData, printer_id: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              required
            >
              <option value="">-- Choose Printer --</option>
              {printers.map((pr: any) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name} ({pr.city})
                </option>
              ))}
            </select>
          </div>

          {/* Material & Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Material Type
              </label>
              <input
                type="text"
                placeholder="e.g. Metalized BOPP, PET/Poly"
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Color Count
              </label>
              <input
                type="number"
                value={formData.color_count}
                onChange={(e) => setFormData({ ...formData, color_count: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Print Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Unit Print Cost (₹/kg)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 175.00"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono"
              />
            </div>
          </div>

          {/* Target Dispatch Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Expected Printer Dispatch Date
            </label>
            <input
              type="date"
              value={formData.expected_dispatch_date}
              onChange={(e) => setFormData({ ...formData, expected_dispatch_date: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddJobOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createJobMutation.isPending}>
              Dispatch Job to Press
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

