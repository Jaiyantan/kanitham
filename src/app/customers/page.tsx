'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Package,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Layers,
  IndianRupee,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CompanyType } from '@/types';
import { toast } from 'sonner';

export default function CustomersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Customer Form
  const [custForm, setCustForm] = useState({
    name: '',
    company_type: 'CHIPS' as CompanyType,
    gstn: '',
    contact_person: '',
    phone: '',
    whatsapp_number: '',
    address_line1: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    opening_balance_amount: '0',
    opening_balance_date: '2026-10-01',
    notes: '',
  });

  // Product Form
  const [prodForm, setProdForm] = useState({
    sku_code: '',
    name: '',
    material_type: 'Metalized BOPP',
    width_mm: '',
    height_mm: '',
    thickness_micron: '',
    color_count: '6',
    default_rate: '',
    rate_unit: 'per_kg',
  });

  // Query Customers
  const { data: custData, isLoading } = useQuery({
    queryKey: ['customers', selectedType, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.set('type', selectedType);
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load customers');
      return res.json();
    },
  });

  // Query Customer Details when selected
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ['customer-detail', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      const res = await fetch(`/api/customers/${selectedCustomer.id}`);
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const customers = custData?.customers || [];

  // Add Customer Mutation
  const addCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create customer');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Customer added successfully');
      setIsAddCustomerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Add Product Mutation
  const addProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create product');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Product SKU created for customer');
      setIsAddProductOpen(false);
      queryClient.invalidateQueries({ queryKey: ['customer-detail', selectedCustomer?.id] });
    },
  });

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name) return;
    addCustomerMutation.mutate({
      ...custForm,
      opening_balance_amount: parseFloat(custForm.opening_balance_amount || '0'),
    });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !prodForm.name) return;
    addProductMutation.mutate({
      ...prodForm,
      customer_id: selectedCustomer.id,
      width_mm: prodForm.width_mm ? parseFloat(prodForm.width_mm) : undefined,
      height_mm: prodForm.height_mm ? parseFloat(prodForm.height_mm) : undefined,
      thickness_micron: prodForm.thickness_micron ? parseFloat(prodForm.thickness_micron) : undefined,
      color_count: prodForm.color_count ? parseInt(prodForm.color_count) : undefined,
      default_rate: prodForm.default_rate ? parseFloat(prodForm.default_rate) : undefined,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1b263b]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-100 uppercase">
              Customer Directory &amp; SKU Catalog
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Chennai FMCG client profiles &bull; Opening balance migration &bull; Per-customer packaging specifications
          </p>
        </div>

        <Button onClick={() => setIsAddCustomerOpen(true)} className="font-mono text-xs">
          <Plus className="w-4 h-4 mr-1" /> ADD NEW CUSTOMER
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1">
          {['ALL', 'CHIPS', 'SNACKS', 'MASALA', 'PICKLE', 'GROUNDNUT', 'FMCG_OTHER'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors border font-medium ${
                selectedType === type
                  ? 'bg-sky-950/80 text-sky-300 border-sky-700/80 shadow-sm'
                  : 'bg-[#0c1220] text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer, GSTN, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0c1220] border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Two columns: Customer List & Customer Detail / SKU Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Customer Cards Column */}
        <div className="lg:col-span-1 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {customers.map((c: any) => {
            const isSelected = selectedCustomer?.id === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-600 shadow-md'
                    : 'bg-[#0a0f1c] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-slate-100 text-xs">{c.name}</div>
                  <Badge variant="outline" size="sm">
                    {c.company_type}
                  </Badge>
                </div>

                <div className="mt-2 text-xs text-slate-400 space-y-1">
                  <div>
                    {c.contact_person} &bull;{' '}
                    <span className="font-mono text-slate-300">{c.phone || 'N/A'}</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 truncate">
                    GSTN: {c.gstn || 'Unregistered'}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Net Outstanding:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{Number(c.outstanding_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Customer Profile & SKU Catalog */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedCustomer ? (
            <Card>
              <CardContent className="p-16 text-center text-xs text-slate-500 font-mono">
                Select a customer from the left column to view SKU specifications, opening balance, and active orders.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-100">
                          {selectedCustomer.name}
                        </span>
                        <Badge variant="info" size="sm">
                          {selectedCustomer.company_type}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedCustomer.address_line1}, {selectedCustomer.city},{' '}
                        {selectedCustomer.state} {selectedCustomer.pincode}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Outstanding
                      </div>
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        ₹{Number(selectedCustomer.outstanding_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#090e18] p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Opening Balance
                    </span>
                    <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                      ₹{Number(selectedCustomer.opening_balance_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-[#090e18] p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Total Invoiced
                    </span>
                    <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                      ₹{Number(selectedCustomer.total_invoiced || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-[#090e18] p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Total Paid
                    </span>
                    <span className="font-mono font-semibold text-emerald-400 mt-0.5 block">
                      ₹{Number(selectedCustomer.total_paid || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="bg-[#090e18] p-2.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      WhatsApp Statement
                    </span>
                    <span className="font-mono text-sky-400 mt-0.5 block">
                      {selectedCustomer.whatsapp_number || selectedCustomer.phone || 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Product SKUs Catalog */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle>
                      <Package className="w-4 h-4 text-sky-400" /> Registered Products / SKUs
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setIsAddProductOpen(true)}
                      className="font-mono text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> ADD SKU SPEC
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="console-th">SKU Code</th>
                        <th className="console-th">Product Name</th>
                        <th className="console-th">Material Spec</th>
                        <th className="console-th">Dimensions (W x H)</th>
                        <th className="console-th">Colors</th>
                        <th className="console-th">Standard Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {detailData?.products?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                            No product SKUs registered for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        detailData?.products?.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-900/40">
                            <td className="console-td text-sky-400 font-bold">
                              {p.sku_code || 'SKU-AUTO'}
                            </td>
                            <td className="console-td font-sans font-semibold text-slate-200">
                              {p.name}
                            </td>
                            <td className="console-td font-sans text-slate-300">
                              {p.material_type || 'BOPP'}
                            </td>
                            <td className="console-td text-slate-400">
                              {p.width_mm && p.height_mm ? `${p.width_mm}x${p.height_mm}mm` : 'Standard'}
                            </td>
                            <td className="console-td text-slate-400">
                              {p.color_count ? `${p.color_count} Colors` : 'Custom'}
                            </td>
                            <td className="console-td font-bold text-emerald-400">
                              ₹{Number(p.default_rate || 0).toFixed(2)} / {p.rate_unit?.replace('per_', '')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        title="Add New Customer Profile"
        subtitle="Configure company details and historical opening balance cutoff"
        maxWidth="lg"
      >
        <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Anandham Foods LLP"
                value={custForm.name}
                onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Company Category
              </label>
              <select
                value={custForm.company_type}
                onChange={(e) => setCustForm({ ...custForm, company_type: e.target.value as CompanyType })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="SNACKS">SNACKS</option>
                <option value="CHIPS">CHIPS</option>
                <option value="GROUNDNUT">GROUNDNUT</option>
                <option value="PICKLE">PICKLE</option>
                <option value="MASALA">MASALA</option>
                <option value="FMCG_OTHER">FMCG OTHER</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={custForm.contact_person}
                onChange={(e) => setCustForm({ ...custForm, contact_person: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={custForm.phone}
                onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                GSTN Number
              </label>
              <input
                type="text"
                placeholder="15-char GST"
                value={custForm.gstn}
                onChange={(e) => setCustForm({ ...custForm, gstn: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Historical Opening Balance */}
          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/40 space-y-2">
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Historical Paper-Era Migration Cutoff
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Opening Balance Amount (₹) [Positive = Customer owes us]
                </label>
                <input
                  type="number"
                  step="any"
                  value={custForm.opening_balance_amount}
                  onChange={(e) => setCustForm({ ...custForm, opening_balance_amount: e.target.value })}
                  className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Opening Balance Effective Date
                </label>
                <input
                  type="date"
                  value={custForm.opening_balance_date}
                  onChange={(e) => setCustForm({ ...custForm, opening_balance_date: e.target.value })}
                  className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addCustomerMutation.isPending}>
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title={`Add Product SKU for ${selectedCustomer?.name}`}
        subtitle="Enter packaging specifications and default pricing"
        maxWidth="md"
      >
        <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                SKU Code
              </label>
              <input
                type="text"
                placeholder="e.g. BHC-POT-200G"
                value={prodForm.sku_code}
                onChange={(e) => setProdForm({ ...prodForm, sku_code: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Classic Potato Chips 200g Pouch"
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                value={prodForm.width_mm}
                onChange={(e) => setProdForm({ ...prodForm, width_mm: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Height (mm)
              </label>
              <input
                type="number"
                value={prodForm.height_mm}
                onChange={(e) => setProdForm({ ...prodForm, height_mm: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Color Count
              </label>
              <input
                type="number"
                value={prodForm.color_count}
                onChange={(e) => setProdForm({ ...prodForm, color_count: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Standard Rate (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 285.00"
                value={prodForm.default_rate}
                onChange={(e) => setProdForm({ ...prodForm, default_rate: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 num-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 uppercase tracking-wider mb-1">
                Pricing Unit
              </label>
              <select
                value={prodForm.rate_unit}
                onChange={(e) => setProdForm({ ...prodForm, rate_unit: e.target.value })}
                className="w-full bg-[#080d18] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="per_kg">Per kg</option>
                <option value="per_piece">Per piece</option>
                <option value="per_roll">Per roll</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={addProductMutation.isPending}>
              Create SKU Spec
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
