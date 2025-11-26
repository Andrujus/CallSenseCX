import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Download, Calendar, Clock, Phone, User, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { dataService } from '../services/dataService';
import { Call } from '../types';
import { SentimentBadge, UrgencyBadge } from '../components/Badge';
import { Button } from '../components/Button';

export const CallDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      dataService.getCallById(id).then(data => {
        setCall(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading call details...</div>;
  if (!call) return <div className="p-8 text-center text-red-500">Call not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-6 w-6 text-slate-400" />
              {call.caller_number}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
               <span className="flex items-center"><Calendar className="h-4 w-4 mr-1.5" /> {new Date(call.started_at).toLocaleString()}</span>
               <span className="flex items-center"><Clock className="h-4 w-4 mr-1.5" /> {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s</span>
               <span className="flex items-center"><User className="h-4 w-4 mr-1.5" /> handled by {call.agent_name}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="secondary" size="sm">
              <PlayCircle className="h-4 w-4 mr-2" />
              Play Recording
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: AI Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-700 p-1.5 rounded-lg mr-2">
                 <FileText className="h-5 w-5" />
              </span>
              AI Summary
            </h3>
            
            {call.ai_data ? (
              <div className="space-y-4">
                <p className="text-slate-700 leading-relaxed text-lg">{call.ai_data.summary}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Intent</span>
                    <p className="font-medium text-slate-900 mt-1">{call.ai_data.customer_intent}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Tags</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {call.ai_data.tags.map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                <div className="animate-pulse flex flex-col items-center">
                   <div className="h-2 bg-slate-200 rounded w-3/4 mb-2"></div>
                   <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                   <p className="mt-4 text-sm">Generating summary...</p>
                </div>
              </div>
            )}
          </div>

          {/* Transcript Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">Transcript</h3>
              <span className="text-xs text-slate-500 uppercase tracking-wide">English (US)</span>
            </div>
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 font-mono text-sm">
              {call.transcript.split('\n').map((line, idx) => {
                if (!line.trim()) return null;
                const isBot = line.startsWith('Bot:');
                const isSystem = line.startsWith('System:');
                return (
                  <div key={idx} className={`flex ${isBot || isSystem ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      isSystem ? 'bg-gray-100 text-gray-500 text-xs w-full text-center italic' :
                      isBot ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 
                      'bg-blue-50 text-blue-900 rounded-tr-none'
                    }`}>
                      {!isSystem && <span className="block text-xs font-bold mb-1 opacity-50">{isBot ? 'CallSense AI' : 'Customer'}</span>}
                      {line.replace(/^(Bot|Customer|System):/, '').trim()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Actions */}
        <div className="space-y-6">
          {/* Sentiment & Urgency */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Analysis</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Sentiment</span>
                {call.ai_data ? <SentimentBadge sentiment={call.ai_data.sentiment} /> : '-'}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Urgency</span>
                {call.ai_data ? <UrgencyBadge urgency={call.ai_data.urgency} /> : '-'}
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Action Items</h3>
            {call.ai_data && call.ai_data.action_items.length > 0 ? (
              <ul className="space-y-3">
                {call.ai_data.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    {item.owner === 'business' ? <AlertCircle className="h-5 w-5 text-orange-500 mr-2 shrink-0 mt-0.5" /> : <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm text-slate-900">{item.task}</p>
                      {item.deadline && <p className="text-xs text-slate-500 mt-0.5">Due: {item.deadline}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">No action items detected.</p>
            )}
          </div>

          {/* Manual Notes Input */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Agent Notes</h3>
            <textarea 
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-blue-500 focus:border-blue-500 h-32"
              placeholder="Add internal notes about this call..."
            ></textarea>
            <div className="mt-3 text-right">
              <Button size="sm" variant="secondary">Save Note</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
