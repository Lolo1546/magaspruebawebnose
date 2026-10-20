export type AppSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

export function firstSearchParamValue(
  value: string | readonly string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export function isAllowedValue<T extends string>(
  value: string | undefined,
  options: readonly T[],
): value is T {
  return value !== undefined && options.includes(value as T);
}

export function createUpdatedSearchHref(
  pathname: string,
  currentSearch: string,
  updates: Readonly<Record<string, string | null>>,
  defaults: Readonly<Record<string, string>>,
) {
  const params = new URLSearchParams(currentSearch);

  for (const [key, value] of Object.entries(updates)) {
    if (!value || defaults[key] === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
