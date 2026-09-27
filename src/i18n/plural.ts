/** The form for `n` by the locale's plural rules, with `{n}` filled in (formatted for the locale). */
export function pluralize(locale: string, n: number, forms: { one: string; other: string }): string {
  const form = new Intl.PluralRules(locale).select(n) === 'one' ? forms.one : forms.other
  return form.replace('{n}', new Intl.NumberFormat(locale).format(n))
}
