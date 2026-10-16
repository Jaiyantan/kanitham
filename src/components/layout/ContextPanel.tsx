'use client';

import React from 'react';
import { useContextPanel } from '@/context/ContextPanelContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, ExternalLink, ArrowRight, Truck, CheckCircle2, Clock, IndianRupee, PackageCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatusTimeline } from '@/components/ui/StatusTimeline';
import { format } from 'date-fns';
import { OrderStatus } from '@/types';

export function ContextPanel() {
  const { isOpen, type, entityId, closePanel } = useContextPanel();
  const queryClient = useQueryClient();

  // Fetch Order Details
  const { data: orderData, isLoading: loadingOrder } = useQuery({
    queryKey: ['order-detail', entityId],
    queryFn: async () => {
      if (!entityId || type !== 'order') return null;
      const res = await fetch(`/api/orders/${entityId}`);
      if (!res.ok) throw new Error('Failed to load order');
      return res.json();
    },
    enabled: isOpen && type === 'order' && !!entityId,
  });

  // Fetch Lorry Details
  const { data: lorryData, isLoading: loadingLorry } = useQuery({
    queryKey: ['lorry-detail', entityId],
    queryFn: async () => {
      if (!entityId || type !== 'lorry') return null;
      const res = await fetch(`/api/lorries/${entityId}`);
      if (!res.ok) throw new Error('Failed to load lorry');
      return res.json();
    },
    enabled: isOpen && type === 'lorry' && !!entityId,
  });

  // Mutation to update order status
  const updateOrderStatus = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      const res = await fetch(`/api/orders/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', entityId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
    },
  });

  // Mutation to update lorry status
  const updateLorryStatus = useMutation({
    mutationFn: async (updates: any) => {
      const res = await fetch(`/api/lorries/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update lorry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lorries'] });
      queryClient.invalidateQueries({ queryKey: ['lorry-detail', entityId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['godown'] });
    },
  });

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full md:w-[420px] bg-[#0b101c] border-l border-[#1b263b] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b263b] bg-[#070b14]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 bg-sky-950/70 border border-sky-800/80 px-2 py-0.5 rounded">
            {type} detail
          </span>
          <span className="text-xs font-mono text-slate-400">
            ID: {entityId?.substring(0, 8)}...
          </span>
        </div>
        <button
          onClick={closePanel}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'order' && (
          <div>
            {loadingOrder ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Loading order intelligence...
              </div>
            ) : orderData?.order ? (
              <div className="space-y-4">
                {/* Title & Customer */}
                <div className="bg-[#0f172a] p-3.5 rounded border border-[#1e293b]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-slate-100 font-mono">
                      Order #{orderData.order.order_number}
                    </span>
                    <Badge
                      variant={
                        orderData.order.status === 'CLOSED' || orderData.order.status === 'FULLY_DELIVERED'
                          ? 'success'
                          : orderData.order.status === 'IN_TRANSIT'
                          ? 'info'
                          : 'default'
                      }
                      glow={orderData.order.status === 'IN_TRANSIT'}
                    >
                      {orderData.order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs font-medium text-sky-400">
                    {orderData.order.customer_name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {orderData.order.product_name || 'Packaging Cover'}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0e1627] p-2.5 rounded border border-[#1b263b]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Ordered Quantity
                    </div>
                    <div className="text-sm font-semibold text-slate-100 num-mono mt-0.5">
                      {Number(orderData.order.quantity_ordered).toLocaleString('en-IN')} {orderData.order.quantity_unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      @ ₹{Number(orderData.order.rate_per_unit).toFixed(2)} / {orderData.order.quantity_unit}
                    </div>
                  </div>

                  <div className="bg-[#0e1627] p-2.5 rounded border border-[#1b263b]">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Total Order Value
                    </div>
                    <div className="text-sm font-semibold text-emerald-400 num-mono mt-0.5">
                      ₹{Number(orderData.order.total_amount).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Days in Stage: <span className="font-bold text-amber-400">{orderData.order.days_in_current_stage || 0}d</span>
                    </div>
                  </div>
                </div>

                {/* 13 Stage Visual Progression */}
                <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Lifecycle Pipeline (13 Stages)
                    </span>
                    <span className="text-[10px] text-sky-400 font-mono">
                      {orderData.history?.length || 1} transitions logged
                    </span>
                  </div>
                  <StatusTimeline
                    currentStatus={orderData.order.status}
                    history={orderData.history}
                  />
                </div>

                {/* Fast Action Buttons */}
                <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-2">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Operations
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {orderData.order.status === 'ORDER_RECEIVED' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('DESIGN_PENDING')}
                        loading={updateOrderStatus.isPending}
                      >
                        Start Design <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {orderData.order.status === 'DESIGN_IN_PROGRESS' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateOrderStatus.mutate('DESIGN_APPROVED')}
                        loading={updateOrderStatus.isPending}
                      >
                        Approve Design <CheckCircle2 className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {orderData.order.status === 'DESIGN_APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('SENT_TO_PRINT')}
                        loading={updateOrderStatus.isPending}
                      >
                        Send to Delhi Print <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {orderData.order.status === 'SENT_TO_PRINT' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('PRINTING')}
                        loading={updateOrderStatus.isPending}
                      >
                        Mark Printing
                      </Button>
                    )}
                    {orderData.order.status === 'PRINTING' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('PRINT_DISPATCHED')}
                        loading={updateOrderStatus.isPending}
                      >
                        Dispatch from Printer
                      </Button>
                    )}
                    {orderData.order.status === 'PRINT_DISPATCHED' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('IN_TRANSIT')}
                        loading={updateOrderStatus.isPending}
                      >
                        Dispatch on Lorry
                      </Button>
                    )}
                    {orderData.order.status === 'IN_TRANSIT' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus.mutate('ARRIVED_AT_LORRY_OFFICE')}
                        loading={updateOrderStatus.isPending}
                      >
                        Arrived at Lorry Office
                      </Button>
                    )}
                    {orderData.order.status === 'ARRIVED_AT_LORRY_OFFICE' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateOrderStatus.mutate('RECEIVED_IN_GODOWN')}
                        loading={updateOrderStatus.isPending}
                      >
                        Receive in Godown
                      </Button>
                    )}
                    {(orderData.order.status === 'RECEIVED_IN_GODOWN' || orderData.order.status === 'PARTIALLY_DELIVERED') && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          window.location.href = `/deliveries?order_id=${entityId}`;
                        }}
                      >
                        <PackageCheck className="w-3 h-3 mr-1" /> Record Delivery
                      </Button>
                    )}
                    {orderData.order.status === 'FULLY_DELIVERED' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateOrderStatus.mutate('CLOSED')}
                        loading={updateOrderStatus.isPending}
                      >
                        Close Order
                      </Button>
                    )}
                  </div>
                </div>

                {/* Godown Batches for this Order */}
                {orderData.godown_batches?.length > 0 && (
                  <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Godown Inventory Batches
                    </span>
                    {orderData.godown_batches.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800 last:border-none"
                      >
                        <div>
                          <div className="text-slate-200 num-mono font-medium">
                            {Number(b.quantity_remaining).toLocaleString('en-IN')} {b.quantity_unit} remaining
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Rcvd: {format(new Date(b.received_date), 'dd MMM yyyy')} ({b.days_in_godown}d ago)
                          </div>
                        </div>
                        <Badge
                          variant={
                            b.days_in_godown >= 30
                              ? 'critical'
                              : b.days_in_godown >= 15
                              ? 'warning'
                              : 'success'
                          }
                          size="sm"
                        >
                          {b.days_in_godown >= 30 ? 'CRITICAL' : b.days_in_godown >= 15 ? 'WARNING' : 'NORMAL'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Deliveries made */}
                {orderData.deliveries?.length > 0 && (
                  <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Challans & Deliveries
                    </span>
                    {orderData.deliveries.map((d: any) => (
                      <div
                        key={d.id}
                        className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800 last:border-none"
                      >
                        <div>
                          <div className="text-slate-200 font-semibold font-mono">
                            Challan #{d.challan_number}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {format(new Date(d.delivery_date), 'dd MMM yyyy')} • {d.delivery_mode || 'Tempo'}
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {Number(d.quantity_delivered).toLocaleString('en-IN')} {d.quantity_unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* LORRY PANEL */}
        {type === 'lorry' && (
          <div>
            {loadingLorry ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Loading lorry manifest...
              </div>
            ) : lorryData?.lorry ? (
              <div className="space-y-4">
                <div className="bg-[#0f172a] p-3.5 rounded border border-[#1e293b]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base font-bold text-slate-100 font-mono">
                      LR #{lorryData.lorry.lr_number}
                    </span>
                    <Badge
                      variant={
                        lorryData.lorry.tracking_status === 'OVERDUE'
                          ? 'critical'
                          : lorryData.lorry.tracking_status === 'NEEDS_TEMPO'
                          ? 'warning'
                          : lorryData.lorry.tracking_status === 'COMPLETED'
                          ? 'success'
                          : 'info'
                      }
                      glow={lorryData.lorry.tracking_status === 'OVERDUE'}
                    >
                      {lorryData.lorry.tracking_status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-xs font-medium text-slate-200">
                    {lorryData.lorry.transporter_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Vehicle: {lorryData.lorry.vehicle_number || 'Pending'} • Driver: {lorryData.lorry.driver_name || 'N/A'}
                  </div>
                </div>

                {/* Operations */}
                <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Lorry Transit Operations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {lorryData.lorry.status === 'IN_TRANSIT' && (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateLorryStatus.mutate({ status: 'ARRIVED_AT_OFFICE' })
                        }
                        loading={updateLorryStatus.isPending}
                      >
                        Mark Arrived at Depot
                      </Button>
                    )}
                    {lorryData.lorry.status === 'ARRIVED_AT_OFFICE' && !lorryData.lorry.tempo_booked && (
                      <Button
                        size="sm"
                        variant="warning"
                        onClick={() =>
                          updateLorryStatus.mutate({
                            tempo_booked: true,
                            tempo_cost: 2500,
                            tempo_vehicle_number: 'TN 05 AF 1024',
                          })
                        }
                        loading={updateLorryStatus.isPending}
                      >
                        Book Local Tempo (₹2,500)
                      </Button>
                    )}
                    {lorryData.lorry.status !== 'RECEIVED_IN_GODOWN' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() =>
                          updateLorryStatus.mutate({ status: 'RECEIVED_IN_GODOWN' })
                        }
                        loading={updateLorryStatus.isPending}
                      >
                        Unload & Stock in Godown
                      </Button>
                    )}
                  </div>
                </div>

                {/* Manifest Items */}
                <div className="bg-[#0e1627] p-3 rounded border border-[#1b263b] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Lorry Manifest ({lorryData.items?.length || 0} items)
                    </span>
                    <span className="text-[10px] text-slate-400 num-mono">
                      {lorryData.items?.reduce((s: number, i: any) => s + Number(i.weight_kg || 0), 0)} kg total
                    </span>
                  </div>

                  <div className="space-y-2">
                    {lorryData.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded bg-[#090e18] border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sky-400">
                            {item.customer_name}
                          </span>
                          <span className="num-mono font-bold text-slate-200">
                            {item.quantity} {item.quantity_unit}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.product_name} • Order #{item.order_number}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

