export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 12;

export interface PasswordRule {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  label: string;
  test: (value: string) => boolean;
}

/** Reglas únicas para registro, creación de usuarios y cambio de contraseña. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'uppercase', label: 'Al menos una mayúscula', test: (value) => /[A-Z]/.test(value) },
  { id: 'lowercase', label: 'Al menos una minúscula', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'Al menos un número', test: (value) => /\d/.test(value) },
  {
    id: 'special',
    label: 'Al menos un carácter especial',
    test: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
];

export interface PasswordEvaluation {
  rules: { rule: PasswordRule; ok: boolean }[];
  met: number;
  total: number;
  percent: number;
  valid: boolean;
  label: 'Débil' | 'Media' | 'Fuerte';
  tone: 'rose' | 'amber' | 'emerald';
}

export function evaluatePassword(value: string): PasswordEvaluation {
  const rules = PASSWORD_RULES.map((rule) => ({ rule, ok: rule.test(value) }));
  const met = rules.filter((item) => item.ok).length;
  const total = rules.length;
  const percent = Math.round((met / total) * 100);
  const valid = met === total;
  const label = valid ? 'Fuerte' : met >= 3 ? 'Media' : 'Débil';
  const tone = valid ? 'emerald' : met >= 3 ? 'amber' : 'rose';
  return { rules, met, total, percent, valid, label, tone };
}

export function isPasswordValid(value: string): boolean {
  return evaluatePassword(value).valid;
}

/** Mensaje de error para formularios; devuelve '' si cumple la política. */
export function passwordError(value: string): string {
  if (!value) return 'La contraseña es requerida';
  if (value.length < PASSWORD_MIN_LENGTH) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Máximo ${PASSWORD_MAX_LENGTH} caracteres`;
  if (!/[A-Z]/.test(value)) return 'Debe incluir al menos una mayúscula';
  if (!/[a-z]/.test(value)) return 'Debe incluir al menos una minúscula';
  if (!/\d/.test(value)) return 'Debe incluir al menos un número';
  if (!/[^A-Za-z0-9\s]/.test(value)) return 'Debe incluir al menos un carácter especial';
  return '';
}
