'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AVAILABLE_MODELS } from '@/types/agent';
import type { ModelProvider, ProvisioningEvent } from '@/types/agent';

type WizardStep = 'model' | 'personality' | 'launch';

export default function AgentSetupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('agent');

  // Wizard state
  const [step, setStep] = useState<WizardStep>('model');
  const [modelProvider, setModelProvider] = useState<ModelProvider>('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [agentName, setAgentName] = useState('Nova');
  const [personality, setPersonality] = useState('friendly');

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (!session) {
    router.push('/sign-in?callbackUrl=/agent/setup');
    return null;
  }

  const selectedModel = AVAILABLE_MODELS.find(m => m.id === modelName);

  async function handleLaunch() {
    setIsLaunching(true);
    setError(null);
    setProgress(0);
    setStatusMessage('Starting...');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          personality,
          modelProvider,
          modelName,
          apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to launch agent');
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data: ProvisioningEvent = JSON.parse(line.slice(6));

          switch (data.type) {
            case 'status':
              setStatusMessage(data.message || '');
              if (data.progress) setProgress(data.progress);
              break;
            case 'progress':
              if (data.progress) setProgress(data.progress);
              break;
            case 'agent':
              // Agent is ready — redirect to dashboard
              if (data.agent) {
                router.push(`/agent/${data.agent.id}`);
              }
              break;
            case 'error':
              setError(data.error || 'Unknown error');
              setIsLaunching(false);
              break;
            case 'done':
              setProgress(100);
              break;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch agent');
      setIsLaunching(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚀 Launch Your Personal AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your own always-on AI agent — no terminal required
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['model', 'personality', 'launch'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? 'bg-violet-600 text-white'
                  : ['model', 'personality', 'launch'].indexOf(step) > i
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {['model', 'personality', 'launch'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div className={`w-12 h-0.5 ${
                  ['model', 'personality', 'launch'].indexOf(step) > i
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Model */}
        {step === 'model' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Choose Your AI Brain
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Select the AI model that will power your agent. You can change this later.
            </p>

            {/* Provider tabs */}
            <div className="flex gap-2 mb-4">
              {(['openai', 'anthropic', 'google'] as const).map(provider => (
                <button
                  key={provider}
                  onClick={() => {
                    setModelProvider(provider);
                    const firstModel = AVAILABLE_MODELS.find(m => m.provider === provider);
                    if (firstModel) setModelName(firstModel.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    modelProvider === provider
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Anthropic' : 'Google'}
                </button>
              ))}
            </div>

            {/* Model cards */}
            <div className="space-y-2 mb-6">
              {AVAILABLE_MODELS.filter(m => m.provider === modelProvider).map(model => (
                <button
                  key={model.id}
                  onClick={() => setModelName(model.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    modelName === model.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{model.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{model.description}</div>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      <div>{model.contextWindow} context</div>
                      <div>{model.pricePerMillion}/1M tokens</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* API Key */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {modelProvider === 'openai' ? 'OpenAI' : modelProvider === 'anthropic' ? 'Anthropic' : 'Google'} API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={`sk-...`}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-400">
                Encrypted and stored securely. Only your agent can access it.
              </p>
            </div>

            <button
              onClick={() => setStep('personality')}
              disabled={!apiKey}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Personality */}
        {step === 'personality' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Personalize Your Agent
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Give your AI a name and personality that matches your style.
            </p>

            {/* Agent Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agent Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                placeholder="Nova"
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            {/* Personality */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personality
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'friendly', label: '😊 Friendly', desc: 'Warm, helpful, and encouraging' },
                  { id: 'professional', label: '💼 Professional', desc: 'Concise, efficient, business-focused' },
                  { id: 'playful', label: '🎮 Playful', desc: 'Fun, witty, uses humor' },
                  { id: 'mentor', label: '🎓 Mentor', desc: 'Patient, educational, guiding' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      personality === p.id
                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Preview</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white text-lg">
                  🌟
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{agentName || 'Nova'}</div>
                  <div className="text-xs text-gray-500">
                    {selectedModel?.name} · {personality}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('model')}
                className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('launch')}
                disabled={!agentName}
                className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 'launch' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
            {!isLaunching ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Ready to Launch
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Your personal AI agent will be deployed to a dedicated server. No data shared with other users.
                </p>

                {/* Summary */}
                <div className="space-y-3 mb-6">
                  <SummaryRow label="Agent Name" value={agentName} />
                  <SummaryRow label="Personality" value={personality} />
                  <SummaryRow label="AI Model" value={selectedModel?.name || modelName} />
                  <SummaryRow label="Provider" value={modelProvider} />
                  <SummaryRow label="Infrastructure" value="Dedicated AWS Server (EU)" />
                  <SummaryRow label="Data Isolation" value="✅ Fully isolated — your data only" />
                </div>

                {/* Security callout */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6">
                  <div className="flex gap-2">
                    <span className="text-green-600">🔒</span>
                    <div>
                      <div className="text-sm font-medium text-green-800 dark:text-green-300">
                        Privacy Guaranteed
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Your agent runs on its own dedicated server. API keys are encrypted in AWS Secrets Manager.
                        No data is shared between users. You can destroy everything at any time.
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                    <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('personality')}
                    className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-200 dark:shadow-violet-900/50"
                  >
                    🚀 Launch My Agent
                  </button>
                </div>
              </>
            ) : (
              /* Launching animation */
              <div className="text-center py-8">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"
                    style={{ animationDuration: '1.5s' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-3xl">
                    🌟
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {statusMessage}
                </h2>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4 max-w-sm mx-auto">
                  <div
                    className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This usually takes about 60 seconds...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
