import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Call, Sentiment } from '../types';
import { SentimentBadge } from '../components/Badge';
import { Button } from '../components/Button';

export const CallsPage: React.FC = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchCalls = async () => {
    const data = await dataService.getCalls();
    setCalls(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleSimulateCall = async () => {
    setSimulating(true);
    await dataService.simulateIncomingCall();
    await fetchCalls();
    setSimulating(false);
  };

  const filteredCalls = calls.filter(call => 
    call.caller_number.includes(searchTerm) || 
    call.ai_data?.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.transcript.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">All Calls</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search transcripts..."
                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleSimulateCall} isLoading={simulating} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Simulate Incoming Call
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Caller</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Summary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sentiment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading calls...</td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No calls found.</td>
                </tr>
              ) : (
                filteredCalls.map(call => (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/calls/${call.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{call.caller_number}</div>
                      <div className="text-xs text-slate-500">{Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.status === 'processing' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">Processing</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 line-clamp-2 max-w-xs">
                        {call.ai_data?.summary || <span className="text-slate-400 italic">Processing summary...</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {call.ai_data ? <SentimentBadge sentiment={call.ai_data.sentiment} /> : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(call.started_at).toLocaleDateString()}<br />
                      <span className="text-xs">{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className="text-blue-600 hover:text-blue-900">View</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CallsPage;