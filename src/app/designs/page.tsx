'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Palette,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useContextPanel } from '@/context/ContextPanelContext';
import { format } from 'date-fns';
import { DesignStatus, PipelineStatus } from '@/types';
import { toast } from 'sonner';

const COLUMNS: { status: DesignStatus; label: string }[] = [
  { status: 'PENDING', label: 'Pending' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'SENT_FOR_APPROVAL', label: 'Sent For Approval' },
  { status: 'REVISION_REQUIRED', label: 'Revision Required' },
  { status: 'APPROVED', label: 'Approved (Locked)' },
];

export default function DesignPipelinePage() {
  const { openPanel } = useContextPanel();
  const queryClient = useQueryClient();

  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [actionStatus, setActionStatus] = useState<DesignStatus>('APPROVED');
  const [approverName, setApproverName] = useState('');
  const [feedback, setFeedback] = useState('');

  // Fetch designs
  const { data, isLoading } = useQuery({
    queryKey: ['designs'],
    queryFn: async () => {
      const res = await fetch('/api/designs');
      if (!res.ok) throw new Error('Failed to load designs');
      return res.json();
    },
  });

  const designs = data?.designs || [];

  // Mutation to update design status
  const updateDesignMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update design');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Design status updated');
      setIsUpdateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['designs'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    },
  });

  const handleActionClick = (design: any, status: DesignStatus) => {
    setSelectedDesign(design);
    setActionStatus(status);
    setApproverName(design.customer_name?.split(' ')[0] || '');
    setFeedback('');
    setIsUpdateOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDesign) return;

    updateDesignMutation.mutate({
      id: selectedDesign.id,
      payload: {
        status: actionStatus,
        approved_by: actionStatus === 'APPROVED' ? approverName : undefined,
        customer_feedback: feedback || undefined,
      },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Design Pipeline
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Artwork versioning, customer approval tracking &amp; handoff to Delhi print
          </p>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Total in pipeline: <span className="font-bold text-slate-100">{designs.length}</span>
        </div>
      </div>

      {/* Kanban Board (5 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start overflow-x-auto min-h-[500px]">
        {COLUMNS.map((col) => {
          const colDesigns = designs.filter((d: any) => d.status === col.status);

          return (
            <div
              key={col.status}
              className="rounded-lg bg-[#0a0f1b] border border-[#182338] p-3 flex flex-col space-y-3 min-w-[220px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {col.label}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {colDesigns.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {colDesigns.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-slate-600 font-mono">
                    Empty
                  </div>
                ) : (
                  colDesigns.map((d: any) => {
                    const pipelineStatus: PipelineStatus = d.pipeline_status || 'ON_TRACK';

                    return (
                      <div
                        key={d.id}
                        className="p-3 rounded bg-[#0f172a] border border-[#1e293b] hover:border-slate-600 transition-all space-y-2 text-xs shadow-sm"
                      >
                        {/* Header: Customer and Version */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-slate-100 line-clamp-1">
                            {d.customer_name}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800 shrink-0">
                            v{d.version_number}
                          </span>
                        </div>

                        {/* Product & Order Ref */}
                        <div className="text-[11px] text-slate-400">
                          {d.product_name || 'Packaging Cover'}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                          <span
                            onClick={() => openPanel('order', d.order_id)}
                            className="text-sky-400 hover:underline cursor-pointer"
                          >
                            Order #{d.order_number}
                          </span>
                          <span>{d.days_since_created || 0}d in pipe</span>
                        </div>

                        {/* Health Status Pill */}
                        <div className="flex items-center justify-between pt-1">
                          <Badge
                            variant={
                              pipelineStatus === 'ACTION_NEEDED'
                                ? 'critical'
                                : pipelineStatus === 'SLOW'
                                ? 'warning'
                                : 'success'
                            }
                            size="sm"
                          >
                            {pipelineStatus.replace(/_/g, ' ')}
                          </Badge>

                          {/* Quick Action Button */}
                          {d.status !== 'APPROVED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActionClick(d, 'APPROVED')}
                              className="text-[10px] h-6 px-2"
                            >
                              Approve <CheckCircle2 className="w-2.5 h-2.5 ml-1" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => openPanel('order', d.order_id)}
                              className="text-[10px] h-6 px-2"
                            >
                              To Print <ArrowRight className="w-2.5 h-2.5 ml-1" />
                            </Button>
                          )}
                        </div>

                        {d.customer_feedback && (
                          <div className="text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800 text-amber-300 italic">
                            &quot;{d.customer_feedback}&quot;
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Update Design Action Modal */}
      <Modal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
        title={`Update Design Status: ${selectedDesign?.customer_name}`}
        subtitle={`Order #${selectedDesign?.order_number} &bull; Version ${selectedDesign?.version_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Select Target Status
            </label>
            <select
              value={actionStatus}
              onChange={(e) => setActionStatus(e.target.value as DesignStatus)}
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="APPROVED">APPROVED (Customer signed off)</option>
              <option value="REVISION_REQUIRED">REVISION REQUIRED (Changes requested)</option>
              <option value="SENT_FOR_APPROVAL">SENT FOR APPROVAL (Waiting on customer)</option>
              <option value="IN_PROGRESS">IN PROGRESS (Being worked on)</option>
            </select>
          </div>

          {actionStatus === 'APPROVED' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Approved By (Customer Contact Person) *
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. Suresh Babu (Managing Partner)"
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
              Customer Feedback / Revision Notes
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Approved layout; proceed with 6-color rotogravure cylinder engraving"
              className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsUpdateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateDesignMutation.isPending}>
              Confirm &amp; Update
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

