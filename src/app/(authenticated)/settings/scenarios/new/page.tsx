'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PromptInput } from '@/components/prompts/prompt-input';

export default function NewScenarioPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    touchpointType: 'email',
    description: '',
    status: 'active',
    filters: '[]',
    customizationPrompt: '',
    emailExamplesPrompt: '',
    subjectLine: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create scenario');
      router.push('/scenarios');
    } catch (error) {
      console.error('Error creating scenario:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Create New Scenario</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter scenario name"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.touchpointType}
              onChange={(e) => setFormData({ ...formData, touchpointType: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="email">Email</option>
              <option value="research">Research</option>
              <option value="googleDrive">Google Drive</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter scenario description"
              rows={4}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Subject Line</label>
            <PromptInput
              value={formData.subjectLine}
              onChange={(value) => setFormData({ ...formData, subjectLine: value })}
              placeholder="Enter email subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customization Prompt</label>
            <PromptInput
              value={formData.customizationPrompt}
              onChange={(value) => setFormData({ ...formData, customizationPrompt: value })}
              placeholder="Enter customization prompt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email Examples Prompt</label>
            <PromptInput
              value={formData.emailExamplesPrompt}
              onChange={(value) => setFormData({ ...formData, emailExamplesPrompt: value })}
              placeholder="Enter email examples prompt"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Create Scenario
        </button>
      </form>
    </div>
  );
} 