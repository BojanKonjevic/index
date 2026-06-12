export type Locale = "sr" | "en"

const translations: Record<Locale, Record<string, string>> = {
  sr: {
    // Nav
    "nav.home": "Početna",
    "nav.subjects": "Predmeti",
    "nav.bookmarks": "Obeleženo",
    "nav.navigation": "Navigacija",
    "nav.personal": "Lično",
    "nav.login_register": "Prijavi se / Registruj se",
    "nav.logout": "Odjavi se",
    "nav.login": "Prijavi se",

    // Sidebar
    "sidebar.settings": "Podešavanja",
    "sidebar.collapse": "Sakrij meni",
    "sidebar.expand": "Prikaži meni",
    "sidebar.group_label": "Trenutna grupa",
    "sidebar.group_placeholder": "Nije odabrana",
    "sidebar.group_fmt": "Grupa {g}",

    // Top bar
    "topbar.group_fmt": "Grupa {group}",

    // Welcome
    "welcome.description":
      "Materijali za učenje iz treće godine Računarstva i Automatike na FTN-u.",
    "welcome.login": "Prijavi se",
    "welcome.register": "Registruj se",
    "welcome.or": "ili",
    "welcome.continue_as_guest": "Nastavi kao gost",
    "welcome.guest_note":
      "Gosti mogu da pregledaju materijale. Nalog omogućava pristup svim funkcijama.",

    // Auth
    "auth.login_tab": "Prijavi se",
    "auth.register_tab": "Registruj se",
    "auth.username": "Korisničko ime",
    "auth.password": "Lozinka",
    "auth.submit_login": "Prijavi se",
    "auth.submit_register": "Napravi nalog",
    "auth.no_account": "Nemaš nalog?",
    "auth.register_link": "Registruj se",
    "auth.has_account": "Već imaš nalog?",
    "auth.login_link": "Prijavi se",
    "auth.fill_fields": "Popuni sva polja.",
    "auth.confirm_password": "Potvrdi lozinku",
    "auth.passwords_mismatch": "Lozinke se ne poklapaju.",
    "auth.error": "Greška.",

    // Home
    "home.greeting": "Dobar dan.",
    "home.semester_fmt": "4. semestar · {count} predmet",
    "home.search_placeholder": "Pretraži predmete, materijale, ispite…",
    "home.search_hint": "Pritisni / za brzu pretragu",
    "home.upcoming_exams": "Predstojeći ispiti",
    "home.all_link": "Svi →",
    "home.no_exams": "Ništa zakazano.",
    "home.recently_opened": "Nedavno otvoreno",
    "home.nothing_opened": "Još uvek ništa niste otvorili.",
    "home.exam_today": "danas",
    "home.exam_tomorrow": "sutra",
    "home.exam_days": "za {days} dana",
    "home.group_suffix": "Grupa {group}",

    // Subjects list
    "subjects.title": "Predmeti",
    "subjects.count_fmt": "{n} predmet",
    "subjects.count_plural_fmt": "{n} predmeta",
    "subjects.semesters_joiner": " i ",
    "subjects.search_placeholder": "Pretraži predmete…",
    "subjects.all": "Svi",
    "subjects.sem_fmt": "{s}. sem",
    "subjects.elective": "Izborni",
    "subjects.empty": "Nema predmeta koji odgovaraju filteru.",
    "subjects.materials": "materijala",
    "subjects.more": "još",
    "subjects.elective_badge": "IZBORNI",
    "subjects.semester_label_fmt": "{n}. semestar",

    // Subject detail
    "subject.breadcrumb": "Predmeti",
    "subject.semester_fmt": "{n}. semestar",
    "subject.bookmarked": "Obeleženo",
    "subject.bookmark": "Obeleži",
    "subject.days": "dana",
    "subject.filter_file_type": "Tip fajla",
    "subject.filter_all": "Svi",
    "subject.filter_all_cat": "Sve",
    "subject.filter_category": "Kategorija",
    "subject.filter_exams": "Ispiti",
    "subject.filter_solved": "Rešeni",
    "subject.filter_unsolved": "Nerešeni",
    "subject.search_placeholder": "Pretraži materijale…",
    "subject.empty": "Nema materijala koji odgovaraju filteru 🔍",
    "subject.solved_label_fmt": "✓ Rešeni ({n})",
    "subject.unsolved_label_fmt": "○ Nerešeni ({n})",
    "subject.other_label_fmt": "Ostali ispitni materijali ({n})",
    "subject.solved_badge": "Rešeni",
    "subject.unsolved_badge": "Nerešeni",
    "subject.exam_count_fmt": "{n} dana",
    "subject.today": "Danas",

    // Categories
    "category.theory": "Teorija",
    "category.problems": "Zadaci",
    "category.exam": "Ispiti",
    "category.k1": "Kolokvijum 1",
    "category.k2": "Kolokvijum 2",
    "category.misc": "Ostalo",
    "category.lectures": "Predavanja",
    "category.exercises": "Vežbe",
    "category.exams": "Ispiti",
    "category.other": "Ostalo",

    // Viewer
    "viewer.back": "Nazad",
    "viewer.breadcrumb_subjects": "Predmeti",
    "viewer.zoom_out": "Umanji",
    "viewer.zoom_in": "Uvećaj",
    "viewer.fit_width": "Podesi širinu",
    "viewer.invert": "Invertuj boje",
    "viewer.no_url": "URL nije postavljen.",
    "viewer.load_error_fmt": "Neuspešno učitavanje {type}.",
    "viewer.loading": "Učitavanje PDF-a…",
    "viewer.not_found": "Materijal nije pronađen.",
    "viewer.sidebar_all": "Svi materijali",
    "viewer.sidebar_this": "Ovaj materijal",
    "viewer.shortcut_bookmark": "obeleži",
    "viewer.shortcut_scroll": "pomeranje",
    "viewer.shortcut_page": "stranica",
    "viewer.current": "trenutno",
    "viewer.tab_material": "Materijal",
    "viewer.tab_assets": "Prilozi",
    "viewer.gallery_prev": "Prethodno",
    "viewer.gallery_next": "Sledeće",
    "viewer.gallery_thumbnail_fmt": "Slika {n} od {total}",
    "viewer.bookmark_add": "Obeleži",
    "viewer.bookmark_remove": "Ukloni obeleživač",

    // Assets
    "asset.count": "{n} prilog",
    "asset.count_plural": "{n} priloga",
    "asset.loading": "Učitavanje...",

    // Material types
    "materialType.subject": "Predmet",
    "materialType.material": "Materijal",
    "materialType.exam": "Ispit",
    "materialType.pdf": "PDF",
    "materialType.video": "Video",
    "materialType.image": "Slika",
    "materialType.sem": "sem",
    "materialType.semestar": "semestar",

    // Bookmarks
    "bookmarks.title": "Obeleženi materijali",
    "bookmarks.count_fmt": "{n} materijal",
    "bookmarks.count_plural_fmt": "{n} materijala",
    "bookmarks.empty": "Još uvek nemate obeleženih materijala.",
    "bookmarks.browse": "Pregledaj predmete",

    // Error
    "error.title": "Nešto je pošlo naopako",
    "error.description": "Došlo je do greške prilikom učitavanja.",
    "error.retry": "Pokušaj ponovo",

    // Months
    "month.0": "januar",
    "month.1": "februar",
    "month.2": "mart",
    "month.3": "april",
    "month.4": "maj",
    "month.5": "jun",
    "month.6": "jul",
    "month.7": "avgust",
    "month.8": "septembar",
    "month.9": "oktobar",
    "month.10": "novembar",
    "month.11": "decembar",

    // Relative time
    "time.just_now": "upravo",
    "time.min_ago": "pre {n} min",
    "time.hour_ago": "pre {n} h",
    "time.yesterday": "juče",
    "time.days_ago": "pre {n} dana",
  },

  en: {
    "nav.home": "Home",
    "nav.subjects": "Subjects",
    "nav.bookmarks": "Bookmarks",
    "nav.navigation": "Navigation",
    "nav.personal": "Personal",
    "nav.login_register": "Log in / Register",
    "nav.logout": "Log out",
    "nav.login": "Log in",

    "sidebar.settings": "Settings",
    "sidebar.collapse": "Collapse menu",
    "sidebar.expand": "Expand menu",
    "sidebar.group_label": "Current group",
    "sidebar.group_placeholder": "Not selected",
    "sidebar.group_fmt": "Group {g}",

    "topbar.group_fmt": "Group {group}",

    "welcome.description":
      "Study material aggregator for 3rd year Applied Computer Science at FTN.",
    "welcome.login": "Log in",
    "welcome.register": "Register",
    "welcome.or": "or",
    "welcome.continue_as_guest": "Continue as guest",
    "welcome.guest_note": "Guests can browse materials. An account unlocks all features.",

    "auth.login_tab": "Log in",
    "auth.register_tab": "Register",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.submit_login": "Log in",
    "auth.submit_register": "Create account",
    "auth.no_account": "Don't have an account?",
    "auth.register_link": "Register",
    "auth.has_account": "Already have an account?",
    "auth.login_link": "Log in",
    "auth.fill_fields": "Fill all fields.",
    "auth.confirm_password": "Confirm password",
    "auth.passwords_mismatch": "Passwords do not match.",
    "auth.error": "Error.",

    "home.greeting": "Good day.",
    "home.semester_fmt": "Semester 4 · {count} subject",
    "home.search_placeholder": "Search subjects, materials, exams…",
    "home.search_hint": "Press / for quick search",
    "home.upcoming_exams": "Upcoming exams",
    "home.all_link": "All →",
    "home.no_exams": "Nothing scheduled.",
    "home.recently_opened": "Recently opened",
    "home.nothing_opened": "Nothing opened yet.",
    "home.exam_today": "today",
    "home.exam_tomorrow": "tomorrow",
    "home.exam_days": "in {days} days",
    "home.group_suffix": "Group {group}",

    "subjects.title": "Subjects",
    "subjects.count_fmt": "{n} subject",
    "subjects.count_plural_fmt": "{n} subjects",
    "subjects.semesters_joiner": " & ",
    "subjects.search_placeholder": "Search subjects…",
    "subjects.all": "All",
    "subjects.sem_fmt": "Sem {s}",
    "subjects.elective": "Elective",
    "subjects.empty": "No subjects match the filter.",
    "subjects.materials": "materials",
    "subjects.more": "more",
    "subjects.elective_badge": "ELECTIVE",
    "subjects.semester_label_fmt": "Semester {n}",

    "subject.breadcrumb": "Subjects",
    "subject.semester_fmt": "Semester {n}",
    "subject.bookmarked": "Bookmarked",
    "subject.bookmark": "Bookmark",
    "subject.days": "days",
    "subject.filter_file_type": "File type",
    "subject.filter_all": "All",
    "subject.filter_all_cat": "All",
    "subject.filter_category": "Category",
    "subject.filter_exams": "Exams",
    "subject.filter_solved": "Solved",
    "subject.filter_unsolved": "Unsolved",
    "subject.search_placeholder": "Search materials…",
    "subject.empty": "No materials match the filter 🔍",
    "subject.solved_label_fmt": "✓ Solved ({n})",
    "subject.unsolved_label_fmt": "○ Unsolved ({n})",
    "subject.other_label_fmt": "Other exam materials ({n})",
    "subject.solved_badge": "Solved",
    "subject.unsolved_badge": "Unsolved",
    "subject.exam_count_fmt": "{n} days",
    "subject.today": "Today",

    "category.theory": "Theory",
    "category.problems": "Problems",
    "category.exam": "Exams",
    "category.k1": "Midterm 1",
    "category.k2": "Midterm 2",
    "category.misc": "Other",
    "category.lectures": "Lectures",
    "category.exercises": "Exercises",
    "category.exams": "Exams",
    "category.other": "Other",

    "viewer.back": "Back",
    "viewer.breadcrumb_subjects": "Subjects",
    "viewer.zoom_out": "Zoom out",
    "viewer.zoom_in": "Zoom in",
    "viewer.fit_width": "Fit width",
    "viewer.invert": "Invert colors",
    "viewer.no_url": "URL not set.",
    "viewer.load_error_fmt": "Failed to load {type}.",
    "viewer.loading": "Loading PDF…",
    "viewer.not_found": "Material not found.",
    "viewer.sidebar_all": "All materials",
    "viewer.sidebar_this": "This material",
    "viewer.shortcut_bookmark": "bookmark",
    "viewer.shortcut_scroll": "scroll",
    "viewer.shortcut_page": "page",
    "viewer.current": "current",
    "viewer.tab_material": "Material",
    "viewer.tab_assets": "Assets",
    "viewer.gallery_prev": "Previous",
    "viewer.gallery_next": "Next",
    "viewer.gallery_thumbnail_fmt": "Image {n} of {total}",
    "viewer.bookmark_add": "Bookmark",
    "viewer.bookmark_remove": "Remove bookmark",

    // Assets
    "asset.count": "{n} asset",
    "asset.count_plural": "{n} assets",
    "asset.loading": "Loading...",

    "materialType.subject": "Subject",
    "materialType.material": "Material",
    "materialType.exam": "Exam",
    "materialType.pdf": "PDF",
    "materialType.video": "Video",
    "materialType.image": "Image",
    "materialType.sem": "sem",
    "materialType.semestar": "semester",

    "bookmarks.title": "Bookmarked materials",
    "bookmarks.count_fmt": "{n} material",
    "bookmarks.count_plural_fmt": "{n} materials",
    "bookmarks.empty": "No bookmarked materials yet.",
    "bookmarks.browse": "Browse subjects",

    "error.title": "Something went wrong",
    "error.description": "An error occurred while loading.",
    "error.retry": "Try again",

    "month.0": "January",
    "month.1": "February",
    "month.2": "March",
    "month.3": "April",
    "month.4": "May",
    "month.5": "June",
    "month.6": "July",
    "month.7": "August",
    "month.8": "September",
    "month.9": "October",
    "month.10": "November",
    "month.11": "December",

    "time.just_now": "just now",
    "time.min_ago": "{n} min ago",
    "time.hour_ago": "{n} h ago",
    "time.yesterday": "yesterday",
    "time.days_ago": "{n} days ago",
  },
}

export function getMonthName(locale: Locale, monthIndex: number): string {
  return translations[locale][`month.${monthIndex}`] || translations.sr[`month.${monthIndex}`] || ""
}

export function formatDate(locale: Locale, iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return `${date.getDate()}. ${getMonthName(locale, date.getMonth())}`
}

export function getRelativeTime(locale: Locale, timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return translations[locale]["time.just_now"]
  if (mins < 60) return t(locale, "time.min_ago", { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t(locale, "time.hour_ago", { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return translations[locale]["time.yesterday"]
  return t(locale, "time.days_ago", { n: days })
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let str = translations[locale]?.[key] ?? translations.sr[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}
