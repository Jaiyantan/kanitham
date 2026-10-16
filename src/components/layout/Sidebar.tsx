'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Palette,
  Printer,
  Truck,
  Warehouse,
  PackageCheck,
  CreditCard,
  Users,
  Settings,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

export function Sidebar() {
  const pathname = usePathname();

  // Query dashboard alert counts for badge pills
  const { data: dashData } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 30000,
  });

  const kpis = dashData?.kpis;
  const overdueLorries = Number(kpis?.overdue_lorries || 0);
  const godownAgingAlerts = Number(kpis?.godown_aging_alerts || 0);
  const stuckOrders = dashData?.stuck_orders?.length || 0;
  const paymentCritical = Number(kpis?.payment_critical_count || 0);
  const newOrders = Number(kpis?.new_orders || 0);

  const navItems = [
    {
      label: 'Console',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      label: 'Order Center',
      href: '/orders',
      icon: ShoppingCart,
      badge: stuckOrders > 0 ? { count: stuckOrders, type: 'warning' } : newOrders > 0 ? { count: newOrders, type: 'info' } : null,
    },
    {
      label: 'Design Pipeline',
      href: '/designs',
      icon: Palette,
      badge: kpis?.pending_designs > 0 ? { count: kpis.pending_designs, type: 'info' } : null,
    },
    {
      label: 'Print (Delhi)',
      href: '/print',
      icon: Printer,
      badge: null,
    },
    {
      label: 'Lorry Tracker',
      href: '/lorries',
      icon: Truck,
      badge: overdueLorries > 0 ? { count: overdueLorries, type: 'critical' } : null,
    },
    {
      label: 'Godown Stock',
      href: '/godown',
      icon: Warehouse,
      badge: godownAgingAlerts > 0 ? { count: godownAgingAlerts, type: 'critical' } : null,
    },
    {
      label: 'Deliveries',
      href: '/deliveries',
      icon: PackageCheck,
      badge: kpis?.orders_ready_to_deliver > 0 ? { count: kpis.orders_ready_to_deliver, type: 'success' } : null,
    },
    {
      label: 'Payments & Ledger',
      href: '/payments',
      icon: CreditCard,
      badge: paymentCritical > 0 ? { count: paymentCritical, type: 'critical' } : null,
    },
    {
      label: 'Customers & SKUs',
      href: '/customers',
      icon: Users,
      badge: null,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen bg-[#070b13] border-r border-[#162032] shrink-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[#162032] bg-[#090e1a]/80">
        <div className="w-8 h-8 rounded bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-sm tracking-wider">
          SP
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest text-slate-100 uppercase">
            KANITHAM
          </div>
          <div className="text-[10px] text-slate-400 tracking-wider uppercase font-mono">
            PACKAGING HUB
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Operational Modules
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group',
                isActive
                  ? 'bg-sky-950/70 text-sky-300 border border-sky-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={clsx(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <span className="tracking-wide">{item.label}</span>
              </div>

              {/* Real-time alert badge pill */}
              {item.badge && (
                <span
                  className={clsx(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-none',
                    item.badge.type === 'critical'
                      ? 'bg-rose-900 text-rose-200 glow-rose animate-pulse'
                      : item.badge.type === 'warning'
                      ? 'bg-amber-900 text-amber-200'
                      : item.badge.type === 'success'
                      ? 'bg-emerald-900 text-emerald-200'
                      : 'bg-sky-900 text-sky-200'
                  )}
                >
                  {item.badge.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-[#162032] bg-[#090e1a]/50 text-[10px] text-slate-400 font-mono">
        <div className="flex justify-between items-center mb-1">
          <span>CHENNAI HQ</span>
          <span className="text-slate-400">DELHI PRINT</span>
        </div>
        <div className="text-[9px] text-slate-400 truncate">
          v1.0 • Supabase + Prisma
        </div>
      </div>
    </aside>
  );
}

