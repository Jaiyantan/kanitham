'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Palette,
  Printer,
  Truck,
  Warehouse,
  IndianRupee,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  ArrowUpRight,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { openPanel } = useContextPanel();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard data');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const kpis = data?.kpis || {};
  const overdueLorries = data?.overdue_lorries || [];
  const godownAging = data?.godown_aging || [];
  const stuckOrders = data?.stuck_orders || [];
  const paymentAlerts = data?.payment_alerts || [];
  const readyToDeliver = data?.ready_to_deliver || [];
  const recentActivity = data?.recent_activity || [];

  const totalAlertsCount =
    Number(kpis.overdue_lorries || 0) +
    Number(kpis.godown_aging_alerts || 0) +
    stuckOrders.length +
    Number(kpis.payment_critical_count || 0);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Top Console Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Operational Intelligence Console
            </h1>
            <Badge variant="info" size="sm">
              Chennai &bull; Delhi
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time supply chain overview &bull; Palantir-style zero mental load monitor
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalAlertsCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-mono glow-rose">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>{totalAlertsCount} CRITICAL SIGNALS</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>SYSTEM ON TRACK</span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            loading={isRefetching}
            className="font-mono text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> REFRESH
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid (12 Metrics from v_dashboard) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Active Orders */}
        <Card className="hover:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Active Orders</span>
              <ShoppingCart className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-100 num-mono">
                {kpis.active_orders || 0}
              </span>
              {Number(kpis.new_orders || 0) > 0 && (
                <span className="text-[10px] text-sky-400 font-mono bg-sky-950/80 px-1 rounded border border-sky-800/60">
                  +{kpis.new_orders} new
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Designs */}
        <Card className="hover:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Designs</span>
              <Palette className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-100 num-mono">
                {kpis.pending_designs || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">in pipeline</span>
            </div>
          </CardContent>
        </Card>

        {/* Delhi Print Jobs */}
        <Card className="hover:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Delhi Print</span>
              <Printer className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-100 num-mono">
                {kpis.active_print_jobs || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">in production</span>
            </div>
          </CardContent>
        </Card>

        {/* Lorry Transit & Overdue */}
        <Card
          className="hover:border-slate-700"
          glowBorder={Number(kpis.overdue_lorries || 0) > 0 ? 'rose' : null}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Lorries Transit</span>
              <Truck
                className={`w-3.5 h-3.5 ${
                  Number(kpis.overdue_lorries || 0) > 0 ? 'text-rose-400' : 'text-sky-400'
                }`}
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-100 num-mono">
                {kpis.active_lorries || 0}
              </span>
              {Number(kpis.overdue_lorries || 0) > 0 ? (
                <span className="text-[10px] text-rose-300 font-mono font-bold bg-rose-950/80 px-1 rounded border border-rose-800">
                  {kpis.overdue_lorries} overdue!
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono">on track</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Godown Stock & Aging Alerts */}
        <Card
          className="hover:border-slate-700"
          glowBorder={Number(kpis.godown_aging_alerts || 0) > 0 ? 'rose' : null}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Godown Stock</span>
              <Warehouse
                className={`w-3.5 h-3.5 ${
                  Number(kpis.godown_aging_alerts || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-100 num-mono">
                {Number(kpis.total_godown_stock_kg || 0).toLocaleString('en-IN')}{' '}
                <span className="text-xs font-normal text-slate-400">kg</span>
              </span>
              {Number(kpis.godown_aging_alerts || 0) > 0 && (
                <span className="text-[10px] text-rose-300 font-mono font-bold bg-rose-950/80 px-1 rounded border border-rose-800">
                  {kpis.godown_aging_alerts} aging!
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Outstanding */}
        <Card className="hover:border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-slate-400 text-[11px] uppercase tracking-wider font-medium">
              <span>Outstanding</span>
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold text-emerald-400 num-mono">
                ₹{(Number(kpis.total_outstanding || 0) / 100000).toFixed(2)}L
              </span>
              {Number(kpis.payment_critical_count || 0) > 0 && (
                <span className="text-[10px] text-rose-300 font-mono bg-rose-950/80 px-1 rounded border border-rose-800">
                  {kpis.payment_critical_count} urgent
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights: Ready to Deliver & Overdue Lorries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ready To Deliver Right Now */}
        <Card glowBorder={readyToDeliver.length > 0 ? 'emerald' : null}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-emerald-400">
                <PackageCheck className="w-4 h-4" /> Ready to Deliver (Stock in Godown)
              </CardTitle>
              <Badge variant="success" size="sm">
                {readyToDeliver.length} Actionable
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {readyToDeliver.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No orders ready for full delivery from godown stock right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {readyToDeliver.slice(0, 4).map((item: any) => (
                  <div
                    key={item.order_id}
                    onClick={() => openPanel('order', item.order_id)}
                    className="flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-xs">
                          Order #{item.order_number}
                        </span>
                        <span className="text-xs font-medium text-sky-400">
                          {item.customer_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.product_name || 'Packaging'} &bull; Pending:{' '}
                        <span className="text-slate-200 num-mono font-bold">
                          {item.pending_quantity} {item.quantity_unit}
                        </span>{' '}
                        (In Godown: {item.quantity_in_godown} {item.quantity_unit})
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/deliveries?order_id=${item.order_id}`;
                      }}
                    >
                      Dispatch Now <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Lorry & Godown Alerts */}
        <Card glowBorder={overdueLorries.length > 0 || godownAging.length > 0 ? 'rose' : null}>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-rose-400">
                <AlertTriangle className="w-4 h-4" /> Transit & Godown Aging Alerts
              </CardTitle>
              <Badge variant="critical" size="sm">
                {overdueLorries.length + godownAging.length} Needs Attention
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800/80">
              {/* Overdue Lorries */}
              {overdueLorries.map((l: any) => (
                <div
                  key={l.lorry_id}
                  onClick={() => openPanel('lorry', l.lorry_id)}
                  className="flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={l.tracking_status === 'OVERDUE' ? 'critical' : 'warning'}
                        size="sm"
                        glow={l.tracking_status === 'OVERDUE'}
                      >
                        {l.tracking_status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="font-mono font-bold text-slate-100 text-xs">
                        LR #{l.lr_number}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {l.transporter_name} &bull; Manifest: {l.customer_names || 'General Cargo'}
                    </div>
                  </div>
                  <div className="text-right">
                    {l.days_overdue > 0 && (
                      <span className="text-xs font-mono font-bold text-rose-400 block">
                        +{l.days_overdue} days late
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      ETA: {l.expected_arrival_date ? format(new Date(l.expected_arrival_date), 'dd MMM') : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Godown Aging Stock */}
              {godownAging.slice(0, 3).map((b: any) => (
                <div
                  key={b.batch_id}
                  onClick={() => openPanel('order', b.order_id)}
                  className="flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={b.aging_status === 'CRITICAL' ? 'critical' : 'warning'}
                        size="sm"
                      >
                        {b.aging_status} AGING
                      </Badge>
                      <span className="text-xs font-medium text-slate-200">
                        {b.customer_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {b.product_name} &bull; Order #{b.order_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400 block">
                      {b.days_in_godown} days in godown
                    </span>
                    <span className="text-[10px] text-slate-400 num-mono">
                      {b.quantity_remaining} {b.quantity_unit} sitting
                    </span>
                  </div>
                </div>
              ))}

              {overdueLorries.length === 0 && godownAging.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  All transit lorries and godown stocks are within healthy thresholds!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Stuck Orders & Payment Priority Follow-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stuck Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <Clock className="w-4 h-4 text-amber-400" /> Stuck Orders in Current Stage
              </CardTitle>
              <span className="text-xs text-slate-500 font-mono">Threshold: &gt; 7 days</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stuckOrders.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                No orders currently exceeding stage thresholds.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {stuckOrders.map((o: any) => (
                  <div
                    key={o.order_id}
                    onClick={() => openPanel('order', o.order_id)}
                    className="flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100 text-xs">
                          Order #{o.order_number}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          {o.customer_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Stage: <span className="font-mono text-sky-400">{o.status}</span> &bull; {o.product_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-400 block">
                        {o.days_in_current_stage} days in stage
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Value: ₹{Number(o.total_amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Payment Follow-up */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>
                <IndianRupee className="w-4 h-4 text-emerald-400" /> Payment Follow-up Priority
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = '/payments')}
              >
                View Ledger
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800/80">
              {paymentAlerts.slice(0, 4).map((p: any) => (
                <div
                  key={p.customer_id}
                  onClick={() => (window.location.href = `/customers`)}
                  className="flex items-center justify-between p-3 hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.followup_urgency === 'CRITICAL' || p.followup_urgency === 'NEVER_PAID'
                            ? 'critical'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {p.followup_urgency.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs font-bold text-slate-200">
                        {p.customer_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Phone: {p.phone || 'N/A'} &bull; Last payment:{' '}
                      {p.last_payment_date ? format(new Date(p.last_payment_date), 'dd MMM yyyy') : 'Never'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      ₹{Number(p.outstanding_amount).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.days_since_last_payment ? `${p.days_since_last_payment}d ago` : 'Pre-system'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Live Activity Stream */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="w-4 h-4 text-sky-400" /> Operational Activity Stream
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono">Auto-logged audit trail</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800/80">
            {recentActivity.map((act: any) => (
              <div key={act.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span className="font-mono uppercase text-slate-400 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {act.entity_type}
                  </span>
                  <span className="text-slate-200 font-medium">{act.description}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {act.created_at ? format(new Date(act.created_at), 'dd MMM HH:mm') : ''}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

