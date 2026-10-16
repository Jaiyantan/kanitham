'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Truck, CreditCard, Menu } from 'lucide-react';
import clsx from 'clsx';

export function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Orders', href: '/orders', icon: ShoppingCart },
    { label: 'Lorries', href: '/lorries', icon: Truck },
    { label: 'Payments', href: '/payments', icon: CreditCard },
    { label: 'More', href: '/godown', icon: Menu },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#070b13] border-t border-[#182338] px-2 py-1.5 flex justify-around items-center">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={clsx(
              'flex flex-col items-center justify-center py-1 px-3 rounded text-[10px] font-medium transition-colors',
              isActive
                ? 'text-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

