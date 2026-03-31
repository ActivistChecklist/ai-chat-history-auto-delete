const CHOICES = [
  { value: 'manual', title: 'Manual only', recommended: false },
  { value: 'daily', title: 'Daily', recommended: true },
  { value: 'weekly', title: 'Weekly', recommended: false },
  { value: 'monthly', title: 'Monthly', recommended: false }
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const LABEL_CLASS_BASE =
  'group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer transition ' +
  'hover:border-slate-300 dark:hover:border-slate-500 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50/40 dark:has-[:checked]:border-teal-500 dark:has-[:checked]:bg-teal-900/30';

export function mountRunFrequencyFieldset(container, {
  inputName,
  selectedValue,
  fieldsetClass = 'space-y-2 border-0 p-0 m-0',
  labelExtraClass = ''
} = {}) {
  if (!container || !inputName) return;

  const validValues = new Set(CHOICES.map((c) => c.value));
  const sel = validValues.has(selectedValue) ? selectedValue : 'manual';

  const labelExtra = labelExtraClass.trim();
  const labelClass = labelExtra ? `${LABEL_CLASS_BASE} ${labelExtra}` : LABEL_CLASS_BASE;

  const safeName = escapeHtml(inputName);

  const radios = CHOICES.map((opt) => {
    const checked = opt.value === sel ? ' checked' : '';
    const titleRow = opt.recommended
      ? `<span class="font-medium text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-2">${escapeHtml(opt.title)}` +
        '<span class="text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded-full">Recommended</span></span>'
      : `<span class="font-medium text-slate-800 dark:text-slate-200 block">${escapeHtml(opt.title)}</span>`;
    return `
      <label class="${labelClass}">
        <input type="radio" name="${safeName}" value="${escapeHtml(opt.value)}" class="w-4 h-4 shrink-0 border-slate-300 dark:border-slate-500 text-teal-500 focus:ring-teal-500"${checked}>
        <span class="text-sm">${titleRow}</span>
      </label>`;
  }).join('');

  container.innerHTML =
    `<fieldset class="${fieldsetClass}"><legend class="sr-only">Run frequency</legend>${radios}</fieldset>`;
}

export function getSelectedRunFrequency(inputName) {
  const el = document.querySelector(`input[name="${inputName}"]:checked`);
  return el?.value ?? 'manual';
}
