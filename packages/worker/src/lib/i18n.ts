type Locale = "sr" | "en"

const messages: Record<string, Record<Locale, string>> = {
  "auth.required": {
    sr: "Ime i lozinka su obavezni.",
    en: "Name and password are required.",
  },
  "auth.name_length": {
    sr: "Ime mora imati između 3 i 50 karaktera.",
    en: "Name must be between 3 and 50 characters.",
  },
  "auth.password_length": {
    sr: "Lozinka mora imati najmanje 4 karaktera.",
    en: "Password must be at least 4 characters.",
  },
  "auth.username_taken": {
    sr: "Korisničko ime je zauzeto.",
    en: "Username is already taken.",
  },
  "auth.invalid_credentials": {
    sr: "Pogrešno korisničko ime ili lozinka.",
    en: "Invalid username or password.",
  },
  "auth.not_logged_in": {
    sr: "Niste prijavljeni.",
    en: "Not logged in.",
  },
  "auth.material_id_required": {
    sr: "ID materijala je obavezan.",
    en: "Material ID is required.",
  },
}

export function getLocale(c: { req: { header: (name: string) => string | undefined } }): Locale {
  const header = c.req.header("x-locale") || c.req.header("Accept-Language") || ""
  if (header.startsWith("en")) return "en"
  return "sr"
}

export function msg(
  c: { req: { header: (name: string) => string | undefined } },
  key: string,
): string {
  const locale = getLocale(c)
  return messages[key]?.[locale] || messages[key]?.sr || key
}
