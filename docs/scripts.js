const commandExamples = {
  local: `pnpm install
cp .env.example .env
cp data/clients.example.json data/clients.json
pnpm dev -- run --client tech_en_gb_stub`,
  doctor: `pnpm dev -- doctor --client tech_en_gb_stub

checks:
  env: ok
  client profile: ok
  provider mode: stub
  upload target: private`,
  quota: `pnpm dev -- quota --client tech_en_gb_stub

clientId            date          todayCount  maxUploadsPerDay
tech_en_gb_stub     2026-05-12    1           3`
};

const revealItems = document.querySelectorAll('.reveal');
const header = document.querySelector('[data-scroll-header]');
const commandOutput = document.querySelector('[data-command-output]');
const tabButtons = document.querySelectorAll('[data-command]');
const flowSteps = document.querySelectorAll('[data-flow-step]');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

function syncHeaderState() {
  if (!header) {
    return;
  }

  header.classList.toggle('is-scrolled', window.scrollY > 20);
}

syncHeaderState();
window.addEventListener('scroll', syncHeaderState, { passive: true });

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const commandKey = button.dataset.command;
    const nextCommand = commandKey ? commandExamples[commandKey] : undefined;

    if (!nextCommand || !commandOutput) {
      return;
    }

    tabButtons.forEach((entry) => {
      entry.classList.toggle('is-selected', entry === button);
      entry.setAttribute('aria-selected', String(entry === button));
    });

    commandOutput.textContent = nextCommand;
  });
});

let activeFlowIndex = 0;

if (flowSteps.length > 0) {
  window.setInterval(() => {
    flowSteps[activeFlowIndex]?.classList.remove('is-active');
    activeFlowIndex = (activeFlowIndex + 1) % flowSteps.length;
    flowSteps[activeFlowIndex]?.classList.add('is-active');
  }, 1800);
}
