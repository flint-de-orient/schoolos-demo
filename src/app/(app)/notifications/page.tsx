import OutboundLogTable from '@/components/notifications/OutboundLogTable';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center">
          <Bell className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-sora font-semibold text-navy">Notification Log</h1>
          <p className="text-sm text-gray-500">Track every WhatsApp and SMS message sent to parents</p>
        </div>
      </div>

      <OutboundLogTable />
    </div>
  );
}
