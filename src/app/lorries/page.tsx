'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  AlertTriangle,
  Clock,
  Phone,
  CheckCircle2,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';
import { TrackingStatus } from '@/types';
import { toast } from 'sonner';

export default function LorryTrackerPage() {
  const { openPanel } = useContextPanel();
  const queryClient = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [expandedLorryId, setExpandedLorryId] = useState<string | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // New Lorry Dispatch Form
  const [formData, setFormData] = useState({
    lr_number: '',
    transporter_name: 'VRL Logistics',
    transporter_phone: '',
    vehicle_number: '',
    driver_name: '',
    driver_phone: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    expected_arrival_date: '',
    lorry_office_name: 'Madhavaram Transport Hub, Chennai',
    freight_cost: '',
    selected_order_ids: [] as string[],
  });

  // Query Lorries
  const { data: lorriesData, isLoading } = useQuery({
    queryKey: ['lorries', selectedFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFilter !== 'ALL') params.set('status', selectedFilter);
      const res = await fetch(`/api/lorries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load lorries');
      return res.json();
    },
  });

  // Query Ready for Dispatch Orders
  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-lorry'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=PRINT_DISPATCHED');
      return res.json();
    },
  });

  const lorries = lorriesData?.lorries || [];

  // Dispatch Lorry Mutation
  const dispatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/lorries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to dispatch lorry');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Lorry shipment dispatched from Delhi');
      setIsDispatchModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['lorries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lr_number || !formData.transporter_name) {
      toast.error('Please enter LR Number and Transporter');
      return;
    }

    const items = formData.selected_order_ids.map((id) => {
      const ord = ordersData?.orders?.find((o: any) => o.id === id);
      return {
        order_id: id,
        customer_id: ord.customer_id,
        product_id: ord.product_id,
        quantity: ord.quantity_ordered,
        quantity_unit: ord.quantity_unit,
        weight_kg: ord.quantity_ordered,
      };
    });

    dispatchMutation.mutate({
      ...formData,
      freight_cost: formData.freight_cost ? parseFloat(formData.freight_cost) : undefined,
      items,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Lorry Transit Tracker (Delhi &rarr; Chennai)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            LR tracking, ETA monitoring, tempo pickup alerts, and multi-order manifest reconciliation
          </p>
        </div>

        <Button onClick={() => setIsDispatchModalOpen(true)} className="font-mono text-xs">
          <Plus className="w-4 h-4 mr-1" /> DISPATCH NEW LORRY
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {[
          { id: 'ALL', label: 'All Lorries' },
          { id: 'OVERDUE', label: '🚨 Overdue ETA' },
          { id: 'NEEDS_TEMPO', label: '⚠️ Needs Tempo Pickup' },
          { id: 'ARRIVING_TODAY', label: 'Arriving Today' },
          { id: 'ON_TRACK', label: 'On Track In Transit' },
          { id: 'COMPLETED', label: 'Received in Godown' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors border font-medium ${
              selectedFilter === tab.id
                ? 'bg-sky-950/80 text-sky-300 border-sky-700/80 shadow-sm'
                : 'bg-[#0c1220] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lorries Grid / List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-xs">
            Querying active lorry shipments...
          </div>
        ) : lorries.length === 0 ? (
          <div className="text-center py-16 text-slate-500 font-mono text-xs">
            No lorries found matching this filter.
          </div>
        ) : (
          lorries.map((l: any) => {
            const isOverdue = l.tracking_status === 'OVERDUE';
            const isNeedsTempo = l.tracking_status === 'NEEDS_TEMPO';
            const isExpanded = expandedLorryId === l.lorry_id;

            return (
              <Card
                key={l.lorry_id}
                className="hover:border-slate-700 transition-all cursor-pointer"
                glowBorder={isOverdue ? 'rose' : isNeedsTempo ? 'amber' : null}
                onClick={() => openPanel('lorry', l.lorry_id)}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Top Bar: LR Number & Tracking Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-base text-slate-100">
                            LR #{l.lr_number}
                          </span>
                          <Badge
                            variant={
                              isOverdue
                                ? 'critical'
                                : isNeedsTempo
                                ? 'warning'
                                : l.tracking_status === 'COMPLETED'
                                ? 'success'
                                : 'info'
                            }
                            glow={isOverdue}
                            size="sm"
                          >
                            {l.tracking_status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {l.transporter_name} &bull; Vehicle: {l.vehicle_number || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      {isOverdue && (
                        <div className="text-xs font-mono font-bold text-rose-400 animate-pulse">
                          🚨 OVERDUE BY {l.days_overdue} DAYS
                        </div>
                      )}
                      {isNeedsTempo && (
                        <div className="text-xs font-mono font-bold text-amber-300">
                          ⚠️ AT LORRY OFFICE - BOOK TEMPO
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ETA:{' '}
                        {l.expected_arrival_date
                          ? format(new Date(l.expected_arrival_date), 'dd MMM yyyy')
                          : 'Pending'}
                      </div>
                    </div>
                  </div>

                  {/* Route & Manifest Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
                    <div className="bg-[#090e18] p-2.5 rounded border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Route Corridor
                      </div>
                      <div className="font-mono text-slate-200 mt-0.5">
                        Delhi (Okhla) &rarr; Chennai
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        Depot: {l.lorry_office_name || 'Chennai Transport Hub'}
                      </div>
                    </div>

                    <div className="bg-[#090e18] p-2.5 rounded border border-slate-800/60">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Manifest Cargo
                      </div>
                      <div className="font-mono text-slate-200 mt-0.5 font-bold">
                        {l.item_count || 0} Orders ({Number(l.total_weight_kg || 0).toLocaleString('en-IN')} kg)
                      </div>
                      <div className="text-[10px] text-sky-400 truncate mt-0.5">
                        {l.customer_names || 'General Cargo'}
                      </div>
                    </div>

                    <div className="bg-[#090e18] p-2.5 rounded border border-slate-800/60 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                          Freight Logistics
                        </div>
                        <div className="font-mono text-slate-200 mt-0.5">
                          ₹{Number(l.freight_cost || 0).toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-500">
                            ({l.freight_paid ? 'Paid' : 'To-Pay'})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tempo: {l.tempo_booked ? 'Booked' : 'Not Booked'}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPanel('lorry', l.lorry_id);
                        }}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dispatch Lorry Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Lorry Shipment (Delhi &rarr; Chennai)"
        subtitle="Create lorry record, link manifest orders, and start transit monitoring"
        maxWidth="lg"
      >
        <form onSubmit={handleDispatchSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Lorry Receipt (LR) # *
              </label>
              <input
                type="text"
                placeholder="e.g. LR-DEL-98442"
                value={formData.lr_number}
                onChange={(e) => setFormData({ ...formData, lr_number: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Transporter Name *
              </label>
              <input
                type="text"
                placeholder="e.g. VRL Logistics, ARC, TCI"
                value={formData.transporter_name}
                onChange={(e) => setFormData({ ...formData, transporter_name: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Vehicle Registration #
              </label>
              <input
                type="text"
                placeholder="e.g. DL 01 AA 4082"
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Transporter / Driver Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 9811002233"
                value={formData.transporter_phone}
                onChange={(e) => setFormData({ ...formData, transporter_phone: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Dispatch Date
              </label>
              <input
                type="date"
                value={formData.dispatch_date}
                onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Expected Arrival Date (ETA) *
              </label>
              <input
                type="date"
                value={formData.expected_arrival_date}
                onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Chennai Lorry Office / Depot
            </label>
            <input
              type="text"
              value={formData.lorry_office_name}
              onChange={(e) => setFormData({ ...formData, lorry_office_name: e.target.value })}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Select Orders on this Lorry */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Dispatched Orders for this Manifest
            </label>
            <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded bg-[#080d18] border border-slate-700">
              {ordersData?.orders?.length === 0 ? (
                <div className="text-slate-500 text-center py-2">
                  No orders currently in PRINT_DISPATCHED stage.
                </div>
              ) : (
                ordersData?.orders?.map((ord: any) => {
                  const isChecked = formData.selected_order_ids.includes(ord.id);
                  return (
                    <label
                      key={ord.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_order_ids: [...formData.selected_order_ids, ord.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selected_order_ids: formData.selected_order_ids.filter(
                                (id) => id !== ord.id
                              ),
                            });
                          }
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-sky-500"
                      />
                      <span className="font-mono font-bold text-sky-400">
                        Order #{ord.order_number}
                      </span>
                      <span className="text-slate-200 font-medium">{ord.customer_name}</span>
                      <span className="text-slate-400 ml-auto font-mono">
                        {ord.quantity_ordered} {ord.quantity_unit}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={dispatchMutation.isPending}>
              Dispatch Lorry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

