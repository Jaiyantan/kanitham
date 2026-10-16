'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';
import { OrderStatus } from '@/types';
import { toast } from 'sonner';

export default function OrdersPage() {
  const { openPanel } = useContextPanel();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New Order Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    product_id: '',
    quantity_ordered: '',
    quantity_unit: 'kg',
    rate_per_unit: '',
    expected_delivery_date: '',
    notes: '',
    is_historical: false,
  });

  // Query Orders
  const { data, isLoading } = useQuery({
    queryKey: ['orders', selectedStatus, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (search) params.set('search', search);
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load orders');
      return res.json();
    },
  });

  // Query Customers for Form
  const { data: customerData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      return res.json();
    },
  });

  // Query Products for selected customer
  const { data: productData } = useQuery({
    queryKey: ['products-list', formData.customer_id],
    queryFn: async () => {
      if (!formData.customer_id) return { products: [] };
      const res = await fetch(`/api/products?customer_id=${formData.customer_id}`);
      return res.json();
    },
    enabled: !!formData.customer_id,
  });

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create order');
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`Order #${result.order.order_number} created successfully`);
      setIsCreateOpen(false);
      setFormData({
        customer_id: '',
        product_id: '',
        quantity_ordered: '',
        quantity_unit: 'kg',
        rate_per_unit: '',
        expected_delivery_date: '',
        notes: '',
        is_historical: false,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      openPanel('order', result.order.id);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error creating order');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.quantity_ordered || !formData.rate_per_unit) {
      toast.error('Please enter customer, quantity, and rate.');
      return;
    }
    createOrderMutation.mutate({
      ...formData,
      quantity_ordered: parseFloat(formData.quantity_ordered),
      rate_per_unit: parseFloat(formData.rate_per_unit),
      total_amount: parseFloat(formData.quantity_ordered) * parseFloat(formData.rate_per_unit),
    });
  };

  const orders = data?.orders || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Order Command Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            13-stage order tracking &bull; Click any order row for timeline and quick operations
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="font-mono text-xs">
          <Plus className="w-4 h-4 mr-1" /> CREATE ORDER
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Status Stage Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ORDER_RECEIVED', label: 'New Received' },
            { id: 'DESIGN_IN_PROGRESS', label: 'Design' },
            { id: 'PRINTING', label: 'Printing (Delhi)' },
            { id: 'IN_TRANSIT', label: 'In Transit' },
            { id: 'ARRIVED_AT_LORRY_OFFICE', label: 'At Depot' },
            { id: 'RECEIVED_IN_GODOWN', label: 'In Godown' },
            { id: 'PARTIALLY_DELIVERED', label: 'Partial Delv' },
            { id: 'FULLY_DELIVERED', label: 'Delivered' },
            { id: 'CLOSED', label: 'Closed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors border font-medium ${
                selectedStatus === tab.id
                  ? 'bg-sky-950/80 text-sky-300 border-sky-700/80 shadow-sm'
                  : 'bg-[#0c1220] text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search order #, customer, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c1220] border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="console-th">Order #</th>
                <th className="console-th">Customer</th>
                <th className="console-th">Product / SKU</th>
                <th className="console-th">Ordered Qty</th>
                <th className="console-th">Total Value</th>
                <th className="console-th">Current Stage</th>
                <th className="console-th">Stage Age</th>
                <th className="console-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-xs font-mono">
                    Querying orders database...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 text-xs font-mono">
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((o: any) => {
                  const isStuck = o.is_stuck;
                  const daysInStage = o.days_in_current_stage || 0;

                  return (
                    <tr
                      key={o.id}
                      onClick={() => openPanel('order', o.id)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer group ${
                        isStuck ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Order Number */}
                      <td className="console-td font-mono font-bold text-sky-400">
                        #{o.order_number}
                        {o.is_historical && (
                          <span className="ml-1.5 text-[9px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-400">
                            HIST
                          </span>
                        )}
                      </td>

                      {/* Customer Name */}
                      <td className="console-td">
                        <div className="font-semibold text-slate-200 text-xs">
                          {o.customer_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {o.customer_phone || ''}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="console-td text-xs text-slate-300">
                        <div>{o.product_name || 'Packaging Cover'}</div>
                        {o.product_sku && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {o.product_sku}
                          </div>
                        )}
                      </td>

                      {/* Ordered Qty */}
                      <td className="console-td font-mono font-semibold text-slate-200">
                        {Number(o.quantity_ordered).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {o.quantity_unit}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="console-td font-mono font-bold text-emerald-400">
                        ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="console-td">
                        <Badge
                          variant={
                            o.status === 'FULLY_DELIVERED' || o.status === 'CLOSED'
                              ? 'success'
                              : o.status === 'IN_TRANSIT'
                              ? 'info'
                              : o.status === 'RECEIVED_IN_GODOWN'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {o.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      {/* Days in stage (Stuck Alert) */}
                      <td className="console-td font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isStuck
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-800 glow-rose animate-pulse'
                              : daysInStage > 4
                              ? 'text-amber-400 bg-amber-950/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {isStuck && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {daysInStage}d
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="console-td text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPanel('order', o.id);
                          }}
                        >
                          Inspect <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Packaging Order"
        subtitle="Initiate order lifecycle in ORDER_RECEIVED stage"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Customer select */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Customer *
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, product_id: '' })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              required
            >
              <option value="">-- Choose Customer --</option>
              {customerData?.customers?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.company_type})
                </option>
              ))}
            </select>
          </div>

          {/* Product SKU select */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Product SKU / Material Cover
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => {
                const prod = productData?.products?.find((p: any) => p.id === e.target.value);
                setFormData({
                  ...formData,
                  product_id: e.target.value,
                  rate_per_unit: prod?.default_rate ? prod.default_rate.toString() : formData.rate_per_unit,
                  quantity_unit: prod?.rate_unit?.replace('per_', '') || formData.quantity_unit,
                });
              }}
              disabled={!formData.customer_id}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
            >
              <option value="">-- Select Product SKU (or leave empty) --</option>
              {productData?.products?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku_code ? `(${p.sku_code})` : ''} - ₹{p.default_rate}/{p.rate_unit}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Rate */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 500"
                value={formData.quantity_ordered}
                onChange={(e) => setFormData({ ...formData, quantity_ordered: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Unit
              </label>
              <select
                value={formData.quantity_unit}
                onChange={(e) => setFormData({ ...formData, quantity_unit: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="kg">kg</option>
                <option value="pieces">pieces</option>
                <option value="rolls">rolls</option>
                <option value="tonnes">tonnes</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Rate (₹/unit) *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 280"
                value={formData.rate_per_unit}
                onChange={(e) => setFormData({ ...formData, rate_per_unit: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono"
                required
              />
            </div>
          </div>

          {/* Total calculation indicator */}
          {formData.quantity_ordered && formData.rate_per_unit && (
            <div className="p-2.5 rounded bg-sky-950/40 border border-sky-800/60 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Calculated Order Total:</span>
              <span className="text-emerald-400 font-bold text-sm">
                ₹{(parseFloat(formData.quantity_ordered) * parseFloat(formData.rate_per_unit)).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Expected Delivery Date
            </label>
            <input
              type="date"
              value={formData.expected_delivery_date}
              onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Internal Production Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Customer requested high gloss finish with nitrogen flush specs"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Historical flag checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_historical"
              checked={formData.is_historical}
              onChange={(e) => setFormData({ ...formData, is_historical: e.target.checked })}
              className="rounded bg-[#080d18] border-slate-700 text-sky-500 focus:ring-0"
            />
            <label htmlFor="is_historical" className="text-slate-400 text-[11px]">
              Mark as Historical Record (exclude from current live financial balance)
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createOrderMutation.isPending}>
              Create & Track Order
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

