'use client';

const features = [
  { name: 'Natural conversation', cosmo: true, chatgpt: true, siri: true, alexa: true },
  { name: 'Actually takes actions', cosmo: true, chatgpt: false, siri: 'partial', alexa: 'partial' },
  { name: 'Email integration', cosmo: true, chatgpt: false, siri: false, alexa: false },
  { name: 'Calendar management', cosmo: true, chatgpt: false, siri: 'partial', alexa: 'partial' },
  { name: 'Smart home control', cosmo: true, chatgpt: false, siri: true, alexa: true },
  { name: 'Privacy-first (no data selling)', cosmo: true, chatgpt: false, siri: true, alexa: false },
  { name: 'Remembers context long-term', cosmo: true, chatgpt: 'partial', siri: false, alexa: false },
  { name: 'Works across all devices', cosmo: true, chatgpt: true, siri: 'partial', alexa: 'partial' },
  { name: 'No subscription required', cosmo: true, chatgpt: false, siri: true, alexa: true },
  { name: 'Custom automations', cosmo: true, chatgpt: false, siri: 'partial', alexa: 'partial' },
];

function CheckIcon({ type }: { type: boolean | string }) {
  if (type === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-400">
        ✓
      </span>
    );
  }
  if (type === 'partial') {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
        ~
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400">
      ✗
    </span>
  );
}

export function ComparisonTable() {
  return (
    <section
      className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24"
      aria-labelledby="comparison-heading"
    >
      <div className="text-center mb-12">
        <h2
          id="comparison-heading"
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
        >
          Why Cosmo?
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          See how Cosmo compares to other AI assistants
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-4 px-6 text-white/60 font-medium">Feature</th>
              <th className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm">
                    ✨
                  </span>
                  <span className="text-white font-semibold">Cosmo</span>
                </div>
              </th>
              <th className="py-4 px-4 text-center text-white/60 font-medium">ChatGPT</th>
              <th className="py-4 px-4 text-center text-white/60 font-medium">Siri</th>
              <th className="py-4 px-4 text-center text-white/60 font-medium">Alexa</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr
                key={feature.name}
                className={index !== features.length - 1 ? 'border-b border-white/5' : ''}
              >
                <td className="py-4 px-6 text-white/80">{feature.name}</td>
                <td className="py-4 px-4 text-center bg-violet-500/5">
                  <CheckIcon type={feature.cosmo} />
                </td>
                <td className="py-4 px-4 text-center">
                  <CheckIcon type={feature.chatgpt} />
                </td>
                <td className="py-4 px-4 text-center">
                  <CheckIcon type={feature.siri} />
                </td>
                <td className="py-4 px-4 text-center">
                  <CheckIcon type={feature.alexa} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4"
          >
            <h3 className="text-white font-medium mb-3">{feature.name}</h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <div className="text-white/40 mb-1">Cosmo</div>
                <CheckIcon type={feature.cosmo} />
              </div>
              <div>
                <div className="text-white/40 mb-1">ChatGPT</div>
                <CheckIcon type={feature.chatgpt} />
              </div>
              <div>
                <div className="text-white/40 mb-1">Siri</div>
                <CheckIcon type={feature.siri} />
              </div>
              <div>
                <div className="text-white/40 mb-1">Alexa</div>
                <CheckIcon type={feature.alexa} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <CheckIcon type={true} />
          <span>Fully supported</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon type="partial" />
          <span>Partial support</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon type={false} />
          <span>Not supported</span>
        </div>
      </div>
    </section>
  );
}
