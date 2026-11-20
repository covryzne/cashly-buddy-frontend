export const passwordRules = [
  { label: "8-16 karakter", test: (value: string) => value.length >= 8 && value.length <= 16 },
  { label: "Ada huruf besar", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Ada huruf kecil", test: (value: string) => /[a-z]/.test(value) },
  { label: "Ada angka", test: (value: string) => /[0-9]/.test(value) },
  { label: "Ada simbol (! @ #)", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];
