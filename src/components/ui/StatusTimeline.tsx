'use client';

import React from 'react';
import { OrderStatus, OrderStatusHistory } from '@/types';
import { CheckCircle2, Clock, CircleDot } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const ORDER_STAGES: { status: OrderStatus; label: string; step: number }[] = [
  { status: 'ORDER_RECEIVED', label: 'Order Recv', step: 1 },
  { status: 'DESIGN_PENDING', label: 'Design Pend', step: 2 },
  { status: 'DESIGN_IN_PROGRESS', label: 'Design Prog', step: 3 },
  { status: 'DESIGN_APPROVED', label: 'Design Apprv', step: 4 },
  { status: 'SENT_TO_PRINT', label: 'Sent Print', step: 5 },
  { status: 'PRINTING', label: 'Printing', step: 6 },
  { status: 'PRINT_DISPATCHED', label: 'Print Disp', step: 7 },
  { status: 'IN_TRANSIT', label: 'In Transit', step: 8 },
  { status: 'ARRIVED_AT_LORRY_OFFICE', label: 'Lorry Office', step: 9 },
  { status: 'RECEIVED_IN_GODOWN', label: 'In Godown', step: 10 },
  { status: 'PARTIALLY_DELIVERED', label: 'Partially Delv', step: 11 },
  { status: 'FULLY_DELIVERED', label: 'Fully Delv', step: 12 },
  { status: 'CLOSED', label: 'Closed', step: 13 },
];

interface StatusTimelineProps {
  currentStatus: OrderStatus;
  history?: OrderStatusHistory[];
  interactive?: boolean;
  onSelectStatus?: (status: OrderStatus) => void;
}

export function StatusTimeline({
  currentStatus,
  history = [],
  interactive = false,
  onSelectStatus,
}: StatusTimelineProps) {
  const currentStageIndex = ORDER_STAGES.findIndex((s) => s.status === currentStatus);

  // Map history by status
  const historyMap = new Map<string, string>();
  for (const h of history) {
    historyMap.set(h.new_status, h.changed_at);
  }

  return (
    <div className="w-full">
      {/* Horizontal mini timeline bar */}
      <div className="flex items-center justify-between w-full overflow-x-auto py-2 px-1">
        {ORDER_STAGES.map((stage, idx) => {
          const isPassed = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isFuture = idx > currentStageIndex;
          const historyDate = historyMap.get(stage.status);

          return (
            <div
              key={stage.status}
              onClick={() => interactive && onSelectStatus && onSelectStatus(stage.status)}
              className={clsx(
                'flex flex-col items-center flex-1 min-w-[70px] relative group',
                interactive ? 'cursor-pointer hover:opacity-100' : ''
              )}
            >
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className={clsx(
                    'absolute top-3 right-[50%] w-full h-[2px] -z-0',
                    isPassed || isCurrent ? 'bg-sky-600' : 'bg-slate-800'
                  )}
                />
              )}

              {/* Step indicator node */}
              <div
                className={clsx(
                  'relative z-10 flex items-center justify-center w-6 h-6 rounded-full border text-[10px] font-mono transition-all',
                  isPassed
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                    : isCurrent
                    ? 'bg-sky-600 border-sky-400 text-white font-bold ring-2 ring-sky-500/40 glow-cyan'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                )}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <CircleDot className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  stage.step
                )}
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'mt-1.5 text-[10px] text-center font-medium tracking-tight whitespace-nowrap',
                  isCurrent
                    ? 'text-sky-400 font-semibold'
                    : isPassed
                    ? 'text-slate-300'
                    : 'text-slate-500'
                )}
              >
                {stage.label}
              </span>

              {/* Timestamp if logged */}
              {historyDate && (
                <span className="text-[9px] text-slate-500 num-mono mt-0.5">
                  {format(new Date(historyDate), 'dd/MM')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

