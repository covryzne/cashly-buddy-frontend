export const passwordRules = [
  { label: "8-16 karakter", test: (value: string) => value.length >= 8 && value.length <= 16 },
  { label: "Huruf besar", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Huruf kecil", test: (value: string) => /[a-z]/.test(value) },
  { label: "Angka", test: (value: string) => /[0-9]/.test(value) },
  { label: "Simbol (! @ #)", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];
