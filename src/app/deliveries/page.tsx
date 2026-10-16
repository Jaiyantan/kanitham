'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  PackageCheck,
  Plus,
  FileText,
  Truck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function DeliveriesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading dispatch console...
        </div>
      }
    >
      <DeliveriesContent />
    </Suspense>
  );
}

function DeliveriesContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get('order_id');

  const [isCreateOpen, setIsCreateOpen] = useState(!!prefillOrderId);
  const [selectedOrderId, setSelectedOrderId] = useState(prefillOrderId || '');
  const [deliveryMode, setDeliveryMode] = useState('Local Tempo (Tata Ace)');
  const [vehicleNumber, setVehicleNumber] = useState('TN 09 CK 3312');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<{ [batchId: string]: string }>({});

  // Query Deliveries
  const { data: deliveriesData, isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const res = await fetch('/api/deliveries');
      if (!res.ok) throw new Error('Failed to load deliveries');
      return res.json();
    },
  });

  // Query Orders with godown stock
  const { data: pendingDeliveriesData } = useQuery({
    queryKey: ['pending-deliveries-list'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=RECEIVED_IN_GODOWN');
      return res.json();
    },
  });

  // Query Godown Batches for the selected order
  const { data: orderDetailData } = useQuery({
    queryKey: ['order-batches-for-delivery', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await fetch(`/api/orders/${selectedOrderId}`);
      return res.json();
    },
    enabled: !!selectedOrderId,
  });

  // When order is selected, auto-allocate oldest batches FIFO
  useEffect(() => {
    if (orderDetailData?.godown_batches) {
      const activeBatches = orderDetailData.godown_batches.filter(
        (b: any) => Number(b.quantity_remaining) > 0
      );
      const newAlloc: { [key: string]: string } = {};
      for (const b of activeBatches) {
        // default allocate full remaining
        newAlloc[b.id] = b.quantity_remaining.toString();
      }
      setAllocations(newAlloc);
    }
  }, [orderDetailData]);

  // Create Delivery Mutation
  const createDeliveryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record delivery');
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(`Challan #${result.delivery.challan_number} generated successfully`);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['godown'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error recording delivery');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error('Please select an order');
      return;
    }

    const batchAllocations = Object.entries(allocations)
      .map(([batch_id, qty]) => ({
        batch_id,
        quantity: parseFloat(qty),
      }))
      .filter((a) => a.quantity > 0);

    if (batchAllocations.length === 0) {
      toast.error('Please specify a delivery quantity from at least one godown batch');
      return;
    }

    const ord = orderDetailData?.order;

    createDeliveryMutation.mutate({
      order_id: selectedOrderId,
      customer_id: ord.customer_id,
      delivery_mode: deliveryMode,
      vehicle_number: vehicleNumber,
      received_by: receivedBy,
      notes: notes,
      batch_allocations: batchAllocations,
    });
  };

  const deliveries = deliveriesData?.deliveries || [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Customer Deliveries &amp; Challans
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Full and partial dispatches with transactional FIFO batch drawdown and auto-generated challan numbers
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="font-mono text-xs">
          <Plus className="w-4 h-4 mr-1" /> CREATE DELIVERY CHALLAN
        </Button>
      </div>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <FileText className="w-4 h-4 text-emerald-400" /> Dispatch Challan Log
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">
              {deliveries.length} challans issued
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Challan #</th>
                <th className="console-th">Customer</th>
                <th className="console-th">Order Ref</th>
                <th className="console-th">Quantity Delivered</th>
                <th className="console-th">Dispatch Mode</th>
                <th className="console-th">Vehicle #</th>
                <th className="console-th">Received By</th>
                <th className="console-th">Delivery Date</th>
                <th className="console-th">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono">
                    Querying deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-mono">
                    No deliveries recorded yet.
                  </td>
                </tr>
              ) : (
                deliveries.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-900/40">
                    <td className="console-td font-mono font-bold text-emerald-400 text-sm">
                      CH-{d.challan_number}
                    </td>
                    <td className="console-td font-semibold text-slate-200">
                      {d.customer_name}
                    </td>
                    <td className="console-td font-mono text-sky-400">
                      Order #{d.order_number}
                      <div className="text-[10px] text-slate-500 font-sans">
                        {d.product_name}
                      </div>
                    </td>
                    <td className="console-td font-mono font-bold text-slate-100">
                      {Number(d.quantity_delivered).toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        {d.quantity_unit}
                      </span>
                    </td>
                    <td className="console-td text-slate-300">
                      {d.delivery_mode || 'Tempo'}
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {d.vehicle_number || 'N/A'}
                    </td>
                    <td className="console-td text-slate-300">
                      {d.received_by || 'Store Manager'}
                    </td>
                    <td className="console-td font-mono text-slate-400">
                      {d.delivery_date ? format(new Date(d.delivery_date), 'dd MMM yyyy') : 'N/A'}
                    </td>
                    <td className="console-td">
                      <Badge
                        variant={d.delivery_type === 'FULL' ? 'success' : 'default'}
                        size="sm"
                      >
                        {d.delivery_type}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Record Delivery Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record Delivery &amp; Generate Challan"
        subtitle="Allocate stock from FIFO godown batches with transactional balance decrement"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Order select */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Order for Delivery *
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              required
            >
              <option value="">-- Choose Order with Godown Stock --</option>
              {pendingDeliveriesData?.orders?.map((o: any) => (
                <option key={o.id} value={o.id}>
                  Order #{o.order_number} - {o.customer_name} ({o.product_name})
                </option>
              ))}
            </select>
          </div>

          {/* Godown Batches Allocation */}
          {selectedOrderId && orderDetailData?.godown_batches && (
            <div className="p-3 rounded bg-[#090f1d] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                <span>Available Godown Batches (FIFO)</span>
                <span className="text-sky-400 font-mono">
                  Order Ordered: {orderDetailData.order.quantity_ordered}{' '}
                  {orderDetailData.order.quantity_unit}
                </span>
              </div>

              {orderDetailData.godown_batches.length === 0 ? (
                <div className="text-amber-400 py-2">
                  No stock received into godown for this order yet!
                </div>
              ) : (
                <div className="space-y-2">
                  {orderDetailData.godown_batches
                    .filter((b: any) => Number(b.quantity_remaining) > 0)
                    .map((batch: any) => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between p-2 rounded bg-[#0e1628] border border-slate-700 text-xs"
                      >
                        <div>
                          <div className="font-mono text-slate-200">
                            Available:{' '}
                            <strong className="text-emerald-400">
                              {Number(batch.quantity_remaining).toLocaleString('en-IN')}{' '}
                              {batch.quantity_unit}
                            </strong>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Received:{' '}
                            {batch.received_date
                              ? format(new Date(batch.received_date), 'dd MMM yyyy')
                              : 'N/A'}{' '}
                            ({batch.days_in_godown}d ago)
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-400">Draw:</label>
                          <input
                            type="number"
                            step="any"
                            max={batch.quantity_remaining}
                            value={allocations[batch.id] || ''}
                            onChange={(e) =>
                              setAllocations({
                                ...allocations,
                                [batch.id]: e.target.value,
                              })
                            }
                            className="w-24 bg-[#080d18] border border-slate-600 rounded px-2 py-1 text-slate-100 font-mono text-right"
                          />
                          <span className="text-slate-400">{batch.quantity_unit}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Delivery Logistics */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Delivery Transport Mode
              </label>
              <input
                type="text"
                placeholder="e.g. Tempo, Customer Pickup, Courier"
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value)}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Vehicle Registration #
              </label>
              <input
                type="text"
                placeholder="e.g. TN 09 CK 3312"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Received By (Customer Rep Name)
            </label>
            <input
              type="text"
              placeholder="e.g. Murugan (Store In-Charge)"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createDeliveryMutation.isPending}>
              Issue Challan &amp; Dispatch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
