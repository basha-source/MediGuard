const STEPS = [
  { icon: "💊", title: "Don't Flush", desc: "Never flush medicines down the toilet or drain unless the label specifically says to. This pollutes water supplies." },
  { icon: "🗑️", title: "Medicine Take-Back Programs", desc: "Use official medicine take-back programs or drop-off locations at pharmacies. This is the safest disposal method." },
  { icon: "🔒", title: "Mix with Undesirable Substances", desc: "If no take-back is available, mix medicines with coffee grounds, dirt, or cat litter in a sealed bag before trashing." },
  { icon: "✂️",  title: "Remove Personal Info", desc: "Scratch out or remove your name and prescription details from labels before disposing of containers." },
  { icon: "🧴", title: "Liquids & Inhalers", desc: "For liquid medicines, seal the container tightly. Inhalers should be checked for puncture instructions before disposal." },
  { icon: "♻️", title: "Recycling Containers", desc: "Empty, clean medicine containers (bottles, inhalers) can often be recycled. Check local recycling guidelines." },
];

export function DisposalGuidePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Disposal Guide</h1>
      <p className="text-text-secondary text-sm mb-6">Safely dispose of expired or unused medicines to protect the environment.</p>

      <div className="space-y-4">
        {STEPS.map((s, i) => (
          <div key={i} className="bg-card rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-4">
            <div className="text-3xl shrink-0">{s.icon}</div>
            <div>
              <p className="font-semibold text-text-primary mb-1">{s.title}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800">
        🌱 Proper medicine disposal protects children, pets, and the environment. When in doubt, contact your local pharmacy for guidance.
      </div>
    </div>
  );
}
