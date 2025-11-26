import React, { useEffect, useState } from 'react';
import { Save, Bot, Smartphone } from 'lucide-react';
import { dataService } from '../services/dataService';
import { CompanySettings } from '../types';
import { Button } from '../components/Button';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    dataService.getSettings().then(setSettings);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    await dataService.updateSettings(settings);
    setIsSaving(false);
    setMessage('Settings saved successfully.');
    setTimeout(() => setMessage(null), 3000);
  };

  if (!settings) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Company Settings</h2>
        <p className="text-slate-500">Manage your voice bot behavior and phone configuration.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Phone Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Phone Configuration</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Twilio Number</label>
               <input 
                  type="text" 
                  disabled
                  value={settings.phone_number}
                  className="block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md sm:text-sm"
               />
               <p className="mt-1 text-xs text-slate-500">Contact support to provision additional lines.</p>
             </div>
           </div>
        </div>

        {/* Bot Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Voice Bot Behavior</h3>
           </div>

           <div className="space-y-6">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Greeting Message</label>
               <p className="text-sm text-slate-500 mb-2">The first thing the customer hears when the bot answers.</p>
               <textarea
                 required
                 rows={3}
                 className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                 value={settings.bot_greeting}
                 onChange={(e) => setSettings({...settings, bot_greeting: e.target.value})}
               />
             </div>

             <div className="flex items-start">
               <div className="flex items-center h-5">
                 <input
                   id="ai_class"
                   name="ai_class"
                   type="checkbox"
                   className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                   checked={settings.enable_ai_classification}
                   onChange={(e) => setSettings({...settings, enable_ai_classification: e.target.checked})}
                 />
               </div>
               <div className="ml-3 text-sm">
                 <label htmlFor="ai_class" className="font-medium text-slate-700">Enable AI Auto-Classification</label>
                 <p className="text-slate-500">Automatically tag calls and detect urgency using LLM.</p>
               </div>
             </div>
           </div>
        </div>

        <div className="flex items-center justify-end gap-4">
           {message && <span className="text-green-600 text-sm font-medium">{message}</span>}
           <Button type="submit" isLoading={isSaving}>
             <Save className="h-4 w-4 mr-2" />
             Save Changes
           </Button>
        </div>
      </form>
    </div>
  );
};
