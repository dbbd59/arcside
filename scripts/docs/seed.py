import time

NOW = int(time.time() * 1000)
HOUR = 3_600_000


def space(id, name, emoji, color, color2=None):
    return {"id": id, "name": name, "emoji": emoji, "color": color, **({"color2": color2} if color2 else {})}


SPACES = [
    space("personal", "Personal", "✦", "#ff2fb4", "#ff9f1c"),
    space("work", "Work", "💼", "#0ea5e9", "#14b8a6"),
    space("studio", "Studio", "🎨", "#d9468f", "#7c4dff"),
    space("learning", "Learning", "📚", "#22c55e", "#0ea5e9"),
]

FOLDERS = [
    {"id": "f-product", "name": "Product", "spaceId": "work", "parentId": None, "open": True, "color": "#4dabf7"},
    {"id": "f-roadmap", "name": "Roadmap", "spaceId": "work", "parentId": "f-product", "open": False, "color": None},
    {"id": "f-eng", "name": "Engineering", "spaceId": "work", "parentId": None, "open": True, "color": "#9775fa"},
    {"id": "f-trips", "name": "Trips", "spaceId": "personal", "parentId": None, "open": True, "color": "#ffa94d"},
    {"id": "f-home", "name": "Home", "spaceId": "personal", "parentId": None, "open": False, "color": None},
    {"id": "f-inspo", "name": "Inspiration", "spaceId": "studio", "parentId": None, "open": True, "color": "#f783ac"},
    {"id": "f-rust", "name": "Rust", "spaceId": "learning", "parentId": None, "open": True, "color": "#ff6b6b"},
]


def saved(id, title, url, space_id, folder_id=None):
    return {"id": id, "title": title, "url": url, "spaceId": space_id, "folderId": folder_id}


SAVED = [
    saved("w-cycle", "Cycle 18 · Mobile checkout", "https://linear.app/northwind/cycle/18", "work", "f-product"),
    saved("w-q4", "Q4 roadmap — Northwind", "https://www.notion.so/northwind/q4-roadmap", "work", "f-roadmap"),
    saved("w-pricing", "Pricing experiment brief", "https://www.notion.so/northwind/pricing-experiment", "work", "f-roadmap"),
    saved("w-api", "northwind/api · Pull requests", "https://github.com/northwind/api/pulls", "work", "f-eng"),
    saved("w-web", "northwind/web · Actions", "https://github.com/northwind/web/actions", "work", "f-eng"),
    saved("w-dd", "Latency overview · Datadog", "https://app.datadoghq.com/dashboard/lat-ovw", "work", "f-eng"),
    saved("w-vercel", "Deployments · Vercel", "https://vercel.com/northwind/web/deployments", "work", "f-eng"),
    saved("w-handbook", "Team handbook", "https://handbook.northwind.dev/", "work"),
    saved("p-mail", "Inbox (3) — Mail", "https://mail.google.com/mail/u/0/#inbox", "personal"),
    saved("p-cal", "Calendar — Week of Nov 16", "https://calendar.google.com/calendar/u/0/r/week", "personal"),
    saved("p-route", "Dolomites hut-to-hut route", "https://www.alltrails.com/trail/italy/dolomites-alta-via-1", "personal", "f-trips"),
    saved("p-rif", "Rifugio Lagazuoi — booking", "https://www.rifugio-lagazuoi.it/en/booking", "personal", "f-trips"),
    saved("p-bread", "Sourdough starter guide", "https://www.kingarthurbaking.com/recipes/sourdough-starter", "personal", "f-home"),
    saved("s-brand", "Brand refresh — Figma", "https://www.figma.com/file/brand-refresh", "studio", "f-inspo"),
    saved("s-motion", "Motion UI — Dribbble", "https://dribbble.com/shots/motion-ui", "studio", "f-inspo"),
    saved("s-awwwards", "Site of the Day — Awwwards", "https://www.awwwards.com/websites/sites_of_the_day", "studio", "f-inspo"),
    saved("s-palette", "Trending palettes — Coolors", "https://coolors.co/palettes/trending", "studio"),
    saved("l-book", "The Rust Programming Language", "https://doc.rust-lang.org/book/", "learning", "f-rust"),
    saved("l-rustlings", "rust-lang/rustlings", "https://github.com/rust-lang/rustlings", "learning", "f-rust"),
    saved("l-ddia", "DDIA — reading notes", "https://www.notion.so/notes/ddia", "learning"),
]


def fav(id, title, url):
    return {"id": id, "title": title, "url": url}


FAVORITES = {
    "personal": [fav("fp1", "Mail", "https://mail.google.com/"), fav("fp2", "Calendar", "https://calendar.google.com/"), fav("fp3", "Maps", "https://maps.google.com/"), fav("fp4", "Spotify", "https://open.spotify.com/")],
    "work": [fav("fw1", "Linear", "https://linear.app/"), fav("fw2", "GitHub", "https://github.com/"), fav("fw3", "Notion", "https://www.notion.so/"), fav("fw4", "Datadog", "https://app.datadoghq.com/"), fav("fw5", "Vercel", "https://vercel.com/")],
    "studio": [fav("fs1", "Figma", "https://www.figma.com/"), fav("fs2", "Dribbble", "https://dribbble.com/"), fav("fs3", "Pinterest", "https://www.pinterest.com/"), fav("fs4", "Coolors", "https://coolors.co/")],
    "learning": [fav("fl1", "Rust Book", "https://doc.rust-lang.org/book/"), fav("fl2", "crates.io", "https://crates.io/"), fav("fl3", "Exercism", "https://exercism.org/")],
}

ARCHIVED = [
    {"id": "a1", "title": "How to center a div (finally) — CSS-Tricks", "url": "https://css-tricks.com/centering-css-complete-guide/", "spaceId": "studio", "closedAt": NOW - 6 * HOUR},
    {"id": "a2", "title": "Flights to Bolzano — Skyscanner", "url": "https://www.skyscanner.net/flights/bzo", "spaceId": "personal", "closedAt": NOW - 20 * HOUR},
]

CLOSED = [
    ("Fix flaky checkout test · Pull Request #479", "https://github.com/northwind/web/pull/479"),
    ("Tokio tutorial — Hello Tokio", "https://tokio.rs/tokio/tutorial/hello-tokio"),
    ("Aperol spritz recipe — Serious Eats", "https://www.seriouseats.com/aperol-spritz"),
]

BOOKMARKS = [
    ["Northwind status", "https://status.northwind.dev/"],
    {"title": "Reading", "children": [["Hacker News", "https://news.ycombinator.com/"], ["The Verge", "https://www.theverge.com/"], ["Stratechery", "https://stratechery.com/"]]},
    ["Excalidraw", "https://excalidraw.com/"],
]

TABS = [
    (101, "Cycle 18 · Mobile checkout", "https://linear.app/northwind/cycle/18", "violet", "work"),
    (102, "northwind/api · Pull requests", "https://github.com/northwind/api/pulls", "paper", "work"),
    (103, "fix: retry idempotent POSTs · Pull Request #482", "https://github.com/northwind/api/pull/482", "paper", "work"),
    (104, "Escape Hatches — React", "https://react.dev/learn/escape-hatches", "paper", "work"),
    (105, "Latency overview · Datadog", "https://app.datadoghq.com/dashboard/lat-ovw", "ocean", "work"),
    (201, "Inbox (3) — Mail", "https://mail.google.com/mail/u/0/#inbox", "paper", "personal"),
    (202, "Dolomites hut-to-hut route", "https://www.alltrails.com/trail/italy/dolomites-alta-via-1", "sunset", "personal"),
    (203, "Golden hour in the Dolomites — Northlight Journal", "https://northlight.travel/journal/golden-hour-dolomites", "sunset", "personal"),
    (301, "Brand refresh — Figma", "https://www.figma.com/file/brand-refresh", "violet", "studio"),
    (302, "Motion UI — Dribbble", "https://dribbble.com/shots/motion-ui", "violet", "studio"),
    (303, "Site of the Day — Awwwards", "https://www.awwwards.com/websites/sites_of_the_day", "violet", "studio"),
    (401, "The Rust Programming Language", "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html", "forest", "learning"),
    (402, "rust-lang/rustlings", "https://github.com/rust-lang/rustlings", "forest", "learning"),
    (403, "Ownership and borrowing — Rust by Example", "https://doc.rust-lang.org/rust-by-example/scope/move.html", "forest", "learning"),
]

BOUND = {"w-cycle": 101, "w-api": 102, "w-dd": 105, "p-mail": 201, "p-route": 202, "s-brand": 301, "s-motion": 302, "l-book": 401, "l-rustlings": 402}
LAST_TAB = {"personal": 203, "work": 105, "studio": 301, "learning": 401}


def build(active_space="personal", active_tab=None):
    active_tab = active_tab or LAST_TAB[active_space]
    tabs = [{"id": i, "title": title, "url": url, "theme": theme, "active": i == active_tab, "favIconUrl": ""} for i, title, url, theme, _ in TABS]
    preferences = {
        "spaces": SPACES, "folders": FOLDERS, "saved": SAVED, "favorites": FAVORITES, "archived": ARCHIVED,
        "archiveAfterHours": 12, "ambient": True, "ambientIntensity": 100, "ambientMode": "vivid", "ambientSpaceColor": False,
        "swipeThreshold": 90, "font": "inter", "fetchFavicons": False, "dailyBackup": True, "lastBackupAt": NOW - 3 * HOUR,
    }
    session = {
        "tabSpaces": {str(i): space_id for i, _, _, _, space_id in TABS if space_id != "personal"},
        "activeSpaceByWindow": {"1": active_space},
        "boundTabs": {f"1:{item}": tab for item, tab in BOUND.items()},
        "lastActive": {str(i): NOW - n * 60_000 for n, (i, *_rest) in enumerate(TABS)},
        "lastTabBySpace": {f"1:{space_id}": tab for space_id, tab in LAST_TAB.items()},
    }
    return {"local": {"arcsidePreferences": preferences}, "session": {"arcsideSession": session}, "tabs": tabs, "closed": CLOSED, "bookmarks": BOOKMARKS}
