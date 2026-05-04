'use client';

import PageWrapper from '@/components/layout/PageWrapper';
import { MapPin, Phone, Users, AlertTriangle, CheckCircle, Truck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import transportData from '@/data/transport.json';

export default function TransportPage() {
  return (
    <PageWrapper>
      {/* Route Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {transportData.routes.map(r => {
          const pct = Math.round((r.studentsCount / r.capacity) * 100);
          const statusColor = r.status === 'Arrived' ? 'text-green bg-green/10' : 'text-amber bg-amber/10';
          return (
            <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-sora font-semibold text-navy text-sm leading-tight">{r.routeName}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{r.vehicle}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>{r.studentsCount} / {r.capacity} students</span>
              </div>
              <Progress value={pct} className="h-2 mb-2" />
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3 h-3" />
                <span>{r.driver} · {r.driverPhone}</span>
              </div>
              {r.status === 'In Transit' && r.eta && (
                <div className="mt-2 text-xs bg-teal/8 text-teal font-semibold px-2 py-1 rounded-lg">
                  📍 {r.currentLocation.area} · ETA: {r.eta}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Live Tracking */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-teal" />
              <h3 className="font-sora font-semibold text-navy">Live Tracking — Kolkata</h3>
              <span className="text-[10px] bg-teal text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
            </div>
            {/* Simulated Map */}
            <div className="bg-gradient-to-br from-iceLight to-blue-50 rounded-xl h-56 border border-ice flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full grid grid-cols-8 grid-rows-6">
                  {[...Array(48)].map((_, i) => <div key={i} className="border border-navy/20" />)}
                </div>
              </div>
              <div className="relative z-10 text-center">
                <p className="font-sora font-semibold text-navy text-sm mb-2">Kolkata Metro Area</p>
                <div className="space-y-1.5">
                  {transportData.routes.filter(r => r.status === 'In Transit').map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs bg-white/80 rounded-lg px-3 py-1.5 shadow-sm">
                      <span className="w-2 h-2 bg-teal rounded-full animate-pulse flex-shrink-0" />
                      <strong>{r.routeName.split('—')[0].trim()}</strong>
                      <span className="text-gray-500">— {r.currentLocation.area} · ETA: {r.eta}</span>
                    </div>
                  ))}
                  {transportData.routes.filter(r => r.status === 'Arrived').map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-xs bg-white/80 rounded-lg px-3 py-1.5 shadow-sm">
                      <CheckCircle className="w-3 h-3 text-green flex-shrink-0" />
                      <strong>{r.routeName.split('—')[0].trim()}</strong>
                      <span className="text-gray-500">— Arrived at {r.arrived}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Status Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-sora font-semibold text-navy">Today&apos;s Status</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Route', 'Driver', 'Students', 'Departed', 'Arrived', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs uppercase tracking-wide text-gray-400 px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transportData.routes.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50/80 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-800">{r.routeName.split('—')[0].trim()}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{r.driver}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-navy">{r.studentsCount}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.departed}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.arrived ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'Arrived' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SOS Panel + Route Stops */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-green/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-green" />
              <h3 className="font-sora font-semibold text-navy text-sm">SOS Alerts</h3>
            </div>
            <div className="bg-green/8 border border-green/20 rounded-lg p-3 mb-3">
              <p className="text-xs text-green font-semibold">✓ No active SOS alerts</p>
            </div>
            {transportData.sosAlerts.map(s => (
              <div key={s.id} className="bg-gray-50 rounded-lg p-3 text-xs">
                <p className="font-semibold text-gray-700">{s.routeName.split('—')[0]}</p>
                <p className="text-gray-500 mt-0.5">SOS — {s.date} · {s.description}</p>
                <span className="text-green font-semibold">{s.status}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-navy" />
              <h3 className="font-sora font-semibold text-navy text-sm">Route 1 Stops</h3>
            </div>
            <div className="space-y-2">
              {transportData.routes[0].stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i === transportData.routes[0].stops.length - 1 ? 'bg-navy text-white' : 'bg-teal/10 text-teal'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{stop.stopName}</p>
                    <p className="text-[10px] text-gray-400">{stop.time} · {stop.studentCount} students</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
