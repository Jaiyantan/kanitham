'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Save,
  RotateCcw,
  Shield,
  Clock,
  Calendar,
  AlertTriangle,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Query Settings
  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
  });

  // Query Audit Activity Logs
  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['audit-activity-logs'],
    queryFn: async () => {
      const res = await fetch('/api/activity?limit=50');
      if (!res.ok) throw new Error('Failed to load activity');
      return res.json();
    },
  });

  const [thresholds, setThresholds] = useState<any>({
    godown_aging_warning_days: 15,
    godown_aging_alert_days: 30,
    payment_overdue_warning_days: 30,
    payment_overdue_alert_days: 60,
    lorry_overdue_days: 2,
    order_stuck_warning_days: 7,
    system_start_date: '2026-10-01',
  });

  // Sync state once fetched
  React.useEffect(() => {
    if (settingsData?.settings) {
      setThresholds((prev: any) => ({
        ...prev,
        ...settingsData.settings,
      }));
    }
  }, [settingsData]);

  // Update Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Operational alert thresholds updated');
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['godown'] });
      queryClient.invalidateQueries({ queryKey: ['payments-data'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Re-seed Data Mutation
  const reseedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reseed database');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Sample Chennai/Delhi operational data re-seeded');
      queryClient.invalidateQueries();
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate(thresholds);
  };

  const activity = activityData?.activity || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              System Settings &amp; Intelligence Thresholds
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure automated alarm triggers, system cutoff date, and audit trail
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            if (confirm('Re-seed realistic Chennai packaging operations data?')) {
              reseedMutation.mutate();
            }
          }}
          loading={reseedMutation.isPending}
          className="font-mono text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" /> RESET / RE-SEED DEMO DATA
        </Button>
      </div>

      {/* Threshold Configuration Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Operational Alert Thresholds
            </CardTitle>
            <span className="text-xs text-slate-400 font-mono">
              Live applied to PostgreSQL Intelligence Views
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Godown Aging Warning */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase">
                  Godown Warning Threshold (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days in warehouse before batch triggers yellow warning
                </p>
                <input
                  type="number"
                  value={thresholds.godown_aging_warning_days || 15}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      godown_aging_warning_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono font-bold"
                />
              </div>

              {/* Godown Aging Alert */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-rose-300 uppercase">
                  Godown Critical Alert (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days in warehouse before stock flags RED critical alarm
                </p>
                <input
                  type="number"
                  value={thresholds.godown_aging_alert_days || 30}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      godown_aging_alert_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-rose-400 font-mono font-bold"
                />
              </div>

              {/* Lorry Overdue */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-rose-300 uppercase">
                  Lorry Overdue Grace (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days past ETA before lorry transit flags OVERDUE alarm
                </p>
                <input
                  type="number"
                  value={thresholds.lorry_overdue_days || 2}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      lorry_overdue_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-rose-400 font-mono font-bold"
                />
              </div>

              {/* Payment Warning */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-amber-300 uppercase">
                  Payment Follow-up Warning (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days since last remittance before collections follow-up starts
                </p>
                <input
                  type="number"
                  value={thresholds.payment_overdue_warning_days || 30}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      payment_overdue_warning_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-amber-300 font-mono font-bold"
                />
              </div>

              {/* Payment Critical */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-rose-300 uppercase">
                  Payment Critical Alarm (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days since payment before customer is marked CRITICAL in follow-up
                </p>
                <input
                  type="number"
                  value={thresholds.payment_overdue_alert_days || 60}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      payment_overdue_alert_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-rose-400 font-mono font-bold"
                />
              </div>

              {/* Order Stuck Days */}
              <div className="bg-[#090e18] p-3 rounded border border-slate-800 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase">
                  Order Stuck Threshold (Days)
                </label>
                <p className="text-[10px] text-slate-400">
                  Days in one stage before order is flagged as stuck
                </p>
                <input
                  type="number"
                  value={thresholds.order_stuck_warning_days || 7}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      order_stuck_warning_days: parseInt(e.target.value),
                    })
                  }
                  className="w-full mt-1 bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-slate-100 font-mono font-bold"
                />
              </div>
            </div>

            {/* System Cutoff Start Date */}
            <div className="p-3.5 rounded bg-sky-950/20 border border-sky-800/40 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-wider text-[11px]">
                <Calendar className="w-4 h-4" /> System Cutoff Date (Paper Era Migration)
              </div>
              <p className="text-[11px] text-slate-400">
                Transactions before this date are treated as historical. Only customer opening balances are counted towards ongoing receivables.
              </p>
              <input
                type="date"
                value={thresholds.system_start_date || '2026-10-01'}
                onChange={(e) =>
                  setThresholds({ ...thresholds, system_start_date: e.target.value })
                }
                className="bg-[#0c1220] border border-slate-700 rounded px-3 py-1.5 text-sky-300 font-mono"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saveSettingsMutation.isPending}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save Intelligence Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Audit Activity Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>
              <Shield className="w-4 h-4 text-sky-400" /> Operational Audit Trail (activity_log)
            </CardTitle>
            <span className="text-xs text-slate-500 font-mono">
              Immutable PostgreSQL transaction history
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr>
                <th className="console-th">Timestamp</th>
                <th className="console-th">Entity</th>
                <th className="console-th">Action</th>
                <th className="console-th">Description</th>
                <th className="console-th font-mono">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {activity.map((act: any) => (
                <tr key={act.id} className="hover:bg-slate-900/40">
                  <td className="console-td text-slate-400">
                    {act.created_at ? format(new Date(act.created_at), 'dd MMM yyyy HH:mm:ss') : ''}
                  </td>
                  <td className="console-td font-bold uppercase text-sky-400">
                    {act.entity_type}
                  </td>
                  <td className="console-td text-slate-300 font-sans">
                    {act.action}
                  </td>
                  <td className="console-td font-sans text-slate-200">
                    {act.description}
                  </td>
                  <td className="console-td text-slate-500">
                    {act.entity_id ? act.entity_id.substring(0, 8) + '...' : ''}
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

