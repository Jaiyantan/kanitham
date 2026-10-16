'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Warehouse,
  AlertTriangle,
  Clock,
  Package,
  Layers,
  ChevronRight,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';
import { AgingStatus } from '@/types';

export default function GodownIntelligencePage() {
  const { openPanel } = useContextPanel();
  const [selectedAging, setSelectedAging] = useState<string>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['godown', selectedAging],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAging !== 'ALL') params.set('aging_status', selectedAging);
      const res = await fetch(`/api/godown?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load godown stock');
      return res.json();
    },
  });

  const batches = data?.batches || [];
  const customerSummary = data?.by_customer || [];
  const categories = data?.categories || [];

  const totalStockKg = batches.reduce(
    (sum: number, b: any) => sum + Number(b.quantity_remaining || 0),
    0
  );
  const criticalCount = batches.filter((b: any) => b.aging_status === 'CRITICAL').length;
  const warningCount = batches.filter((b: any) => b.aging_status === 'WARNING').length;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Godown Intelligence &amp; Aging Analysis
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Chennai warehouse inventory &bull; FIFO batch traceability &bull; Automated 15d &amp; 30d aging alarms
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-[#0b1220] border border-slate-800 text-slate-200">
            Total Stock:{' '}
            <strong className="text-emerald-400 text-sm">
              {Number(totalStockKg).toLocaleString('en-IN')} kg
            </strong>
          </span>
        </div>
      </div>

      {/* Stock Overview Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3.5 bg-[#0a0f1c] border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            1. Allocated (Awaiting Partial Delivery)
          </div>
          <div className="text-xl font-bold text-slate-100 num-mono mt-1">
            {Number(
              categories.find((c: any) => c.category === 'AWAITING_PARTIAL')?.total_kg || 0
            ).toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-[11px] text-sky-400 mt-1">
            Stock tied to orders with past partial deliveries
          </div>
        </Card>

        <Card className="p-3.5 bg-[#0a0f1c] border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            2. Received (Delivery Not Yet Started)
          </div>
          <div className="text-xl font-bold text-slate-100 num-mono mt-1">
            {Number(
              categories.find((c: any) => c.category === 'NOT_STARTED')?.total_kg || 0
            ).toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            Full batch waiting for customer dispatch instruction
          </div>
        </Card>

        <Card className="p-3.5 bg-[#0a0f1c] border-slate-800">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            3. Free Stock / Excess Received
          </div>
          <div className="text-xl font-bold text-slate-100 num-mono mt-1">
            {Number(
              categories.find((c: any) => c.category === 'FREE_STOCK')?.total_kg || 0
            ).toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Unallocated surplus available for immediate delivery
          </div>
        </Card>
      </div>

      {/* Filter Tabs for Aging */}
      <div className="flex items-center gap-1.5 text-xs">
        {[
          { id: 'ALL', label: 'All Batches in Godown' },
          { id: 'CRITICAL', label: `🚨 Critical (>= 30 days) [${criticalCount}]` },
          { id: 'WARNING', label: `⚠️ Warning (15-29 days) [${warningCount}]` },
          { id: 'NORMAL', label: 'Normal (< 15 days)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedAging(tab.id)}
            className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors border font-medium ${
              selectedAging === tab.id
                ? 'bg-sky-950/80 text-sky-300 border-sky-700/80 shadow-sm'
                : 'bg-[#0c1220] text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aging Batches Table (v_godown_aging) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Layers className="w-4 h-4 text-sky-400" /> Warehouse Inventory Batches
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">
              {batches.length} active batches
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Customer</th>
                <th className="console-th">Product Cover</th>
                <th className="console-th">Order #</th>
                <th className="console-th">Stock Remaining</th>
                <th className="console-th">Received Date</th>
                <th className="console-th">Days in Godown</th>
                <th className="console-th">Aging Status</th>
                <th className="console-th text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-mono">
                    Querying godown aging view...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-mono">
                    No batches match the selected aging filter.
                  </td>
                </tr>
              ) : (
                batches.map((b: any) => {
                  const isCritical = b.aging_status === 'CRITICAL';
                  const isWarning = b.aging_status === 'WARNING';

                  return (
                    <tr
                      key={b.batch_id}
                      onClick={() => openPanel('order', b.order_id)}
                      className={`hover:bg-slate-900/60 transition-colors cursor-pointer ${
                        isCritical ? 'bg-rose-950/15' : isWarning ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="console-td font-semibold text-slate-200">
                        {b.customer_name}
                      </td>
                      <td className="console-td text-slate-300">
                        {b.product_name || 'Packaging Cover'}
                      </td>
                      <td className="console-td font-mono font-bold text-sky-400">
                        #{b.order_number}
                      </td>
                      <td className="console-td font-mono font-bold text-slate-100">
                        {Number(b.quantity_remaining).toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {b.quantity_unit}
                        </span>
                      </td>
                      <td className="console-td font-mono text-slate-400">
                        {b.received_date ? format(new Date(b.received_date), 'dd MMM yyyy') : 'N/A'}
                      </td>
                      <td className="console-td font-mono font-bold">
                        <span
                          className={
                            isCritical
                              ? 'text-rose-400'
                              : isWarning
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }
                        >
                          {b.days_in_godown} days
                        </span>
                      </td>
                      <td className="console-td">
                        <Badge
                          variant={isCritical ? 'critical' : isWarning ? 'warning' : 'success'}
                          glow={isCritical}
                          size="sm"
                        >
                          {b.aging_status}
                        </Badge>
                      </td>
                      <td className="console-td text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/deliveries?order_id=${b.order_id}&batch_id=${b.batch_id}`;
                          }}
                        >
                          Deliver Batch <ArrowRight className="w-3 h-3 ml-1" />
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

      {/* Customer Aggregate Summary View (v_godown_by_customer) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Warehouse className="w-4 h-4 text-purple-400" /> Stock Sitting By Customer
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              Aggregated from v_godown_by_customer
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Customer Name</th>
                <th className="console-th">Total Stock Sitting</th>
                <th className="console-th">Batch Count</th>
                <th className="console-th">Oldest Batch Date</th>
                <th className="console-th">Max Days Sitting</th>
                <th className="console-th">Critical Aged Quantity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {customerSummary.map((c: any) => (
                <tr key={c.customer_id} className="hover:bg-slate-900/40">
                  <td className="console-td font-semibold text-slate-200">
                    {c.customer_name}
                  </td>
                  <td className="console-td font-mono font-bold text-slate-100">
                    {Number(c.total_quantity_sitting).toLocaleString('en-IN')} kg
                  </td>
                  <td className="console-td font-mono text-slate-400">
                    {c.batch_count} batches
                  </td>
                  <td className="console-td font-mono text-slate-400">
                    {c.oldest_batch_date ? format(new Date(c.oldest_batch_date), 'dd MMM yyyy') : 'N/A'}
                  </td>
                  <td className="console-td font-mono">
                    <span
                      className={
                        Number(c.max_days_sitting) >= 30
                          ? 'text-rose-400 font-bold'
                          : Number(c.max_days_sitting) >= 15
                          ? 'text-amber-400 font-semibold'
                          : 'text-slate-300'
                      }
                    >
                      {c.max_days_sitting} days
                    </span>
                  </td>
                  <td className="console-td font-mono">
                    {Number(c.critical_quantity) > 0 ? (
                      <span className="text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
                        {Number(c.critical_quantity).toLocaleString('en-IN')} kg
                      </span>
                    ) : (
                      <span className="text-slate-500">0 kg</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

