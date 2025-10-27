'use client';

import { useIsAdmin, useUserRole } from '@/lib/useUserRole';
import { Shield } from 'lucide-react';

export default function AdminPanel() {
  const isAdmin = useIsAdmin();
  const role = useUserRole();

  if (!isAdmin) {
    return null; // Don't show anything to non-admins
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-900">Admin Panel</h3>
      </div>
      <p className="text-sm text-amber-700">
        You have admin access. Your role: <span className="font-medium">{role}</span>
      </p>
      
      {/* Add admin-only features here */}
      <div className="mt-3 space-y-2">
        <button className="w-full text-left px-3 py-2 text-sm bg-white rounded border border-amber-200 hover:bg-amber-50 transition-colors">
          View All Users
        </button>
        <button className="w-full text-left px-3 py-2 text-sm bg-white rounded border border-amber-200 hover:bg-amber-50 transition-colors">
          Manage Analytics
        </button>
      </div>
    </div>
  );
}

