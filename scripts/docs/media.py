import hashlib
import json
import mimetypes
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, str(Path(__file__).parent))
import seed  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"
DOCS = Path(__file__).parent
OUT = ROOT / "docs"
LETTERS = {"mail.google.com": "M", "calendar.google.com": "C", "maps.google.com": "M", "open.spotify.com": "S", "app.datadoghq.com": "D"}
BRAND = {"github.com": "#24292f", "linear.app": "#5e6ad2", "mail.google.com": "#ea4335", "calendar.google.com": "#4285f4", "maps.google.com": "#34a853",
         "open.spotify.com": "#1db954", "www.notion.so": "#2b2b2b", "app.datadoghq.com": "#632ca6", "vercel.com": "#000000", "www.figma.com": "#a259ff",
         "dribbble.com": "#ea4c89", "www.pinterest.com": "#e60023", "coolors.co": "#0065ff", "doc.rust-lang.org": "#b7410e", "crates.io": "#e6a23c",
         "exercism.org": "#604fcd", "www.alltrails.com": "#428a13", "react.dev": "#087ea4", "www.awwwards.com": "#222222", "northlight.travel": "#e0457b"}


def favicon_svg(page_url: str) -> bytes:
    host = urlparse(page_url).hostname or "?"
    if host.endswith(".invalid"):
        return b'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="none" stroke="#999" stroke-width="2"/></svg>'
    hue = int(hashlib.md5(host.encode()).hexdigest()[:4], 16) % 360
    fill = BRAND.get(host, f"hsl({hue} 55% 42%)")
    parts = host.split(".")
    letter = (LETTERS.get(host) or parts[-2][0]).upper()
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="7" fill="{fill}"/>'
            f'<text x="16" y="22.5" font-family="Inter,Helvetica,Arial,sans-serif" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">{letter}</text></svg>').encode()


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/_favicon"):
            body = favicon_svg(parse_qs(parsed.query).get("pageUrl", [""])[0])
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        path = unquote(parsed.path)
        file = DOCS / path.removeprefix("/docs/") if path.startswith("/docs/") else DIST / path.lstrip("/")
        if not file.is_file():
            self.send_error(404)
            return
        body = file.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(file))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def serve():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def new_context(browser, active_space="personal", **options):
    context = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5, **options)
    context.add_init_script(f"window.__ARC_SEED__ = {json.dumps(seed.build(active_space))};")
    context.add_init_script(path=str(DOCS / "chrome-mock.js"))
    return context


def open_window(context, base, cursor=False):
    page = context.new_page()
    page.goto(f"{base}/docs/browser.html" + ("" if cursor else "?still"))
    panel = page.frame_locator("#panel")
    panel.get_by_role("contentinfo").wait_for()
    page.wait_for_timeout(1400)
    return page, panel


def click(page, locator, pause=350):
    box = locator.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=18)
    page.wait_for_timeout(120)
    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
    page.wait_for_timeout(pause)


def to_gif(video: Path, target: Path, start=0.0, end=None, fps=14, width=960):
    trim = ["-ss", str(start)] + (["-to", str(end)] if end else [])
    filters = f"fps={fps},scale={width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *trim, "-i", str(video), "-vf", filters, "-loop", "0", str(target)], check=True)


def compose_row(panels: list[Path], labels: list[str], target: Path):
    from PIL import Image, ImageDraw, ImageFont
    images = [Image.open(path).convert("RGBA") for path in panels]
    gap, pad, caption = 36, 56, 64
    width = sum(image.width for image in images) + gap * (len(images) - 1) + pad * 2
    height = max(image.height for image in images) + pad + caption + 28
    canvas = Image.new("RGB", (width, height), "#14141b")
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 30)
    draw = ImageDraw.Draw(canvas)
    x = pad
    for image, label in zip(images, labels):
        mask = Image.new("L", image.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, *image.size), radius=28, fill=255)
        canvas.paste(image, (x, pad), mask)
        text_width = draw.textlength(label, font=font)
        draw.text((x + (image.width - text_width) / 2, pad + image.height + 18), label, font=font, fill="#b9b9cc")
        x += image.width + gap
    canvas.save(target, optimize=True)


def squeeze(path: Path, colors=256):
    from PIL import Image
    image = Image.open(path).convert("RGB")
    image.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(path, optimize=True)


def backup_file(directory: Path) -> Path:
    prefs = seed.build()["local"]["arcsidePreferences"]
    broken = {"id": "x", "title": "Broken", "url": 7, "spaceId": "work", "folderId": None}
    payload = {
        "app": "arcside", "version": 2, "exportedAt": seed.NOW - 26 * seed.HOUR, "scope": "all",
        "spaces": prefs["spaces"], "folders": prefs["folders"], "saved": [*prefs["saved"], broken],
        "favorites": {key: [{"title": item["title"], "url": item["url"]} for item in items] for key, items in prefs["favorites"].items()},
        "settings": {"ambient": True, "ambientIntensity": 100, "ambientMode": "vivid", "font": "inter"},
    }
    target = directory / "arcside-backup-2026-11-14.json"
    target.write_text(json.dumps(payload))
    return target


def scene_stills(browser, base, tmp: Path):
    context = new_context(browser, "work")
    page, panel = open_window(context, base)
    page.screenshot(path=str(OUT / "hero.png"))
    shots = []
    for name in ["Personal", "Work", "Studio", "Learning"]:
        click(page, panel.get_by_role("contentinfo").get_by_label(name, exact=True), pause=1700)
        path = tmp / f"panel-{name}.png"
        page.locator("#panel").screenshot(path=str(path))
        shots.append(path)
    compose_row(shots, ["Personal", "Work", "Studio", "Learning"], OUT / "spaces.png")
    squeeze(OUT / "spaces.png")
    context.close()

    context = new_context(browser, "learning")
    page, panel = open_window(context, base)
    panel.locator("body").click(position={"x": 200, "y": 700})
    page.keyboard.press("Meta+k")
    page.wait_for_timeout(500)
    page.keyboard.type("ru", delay=120)
    page.wait_for_timeout(700)
    page.locator("#panel").screenshot(path=str(OUT / "palette.png"))
    squeeze(OUT / "palette.png")
    context.close()

    context = browser.new_context(viewport={"width": 1440, "height": 1200}, device_scale_factor=1.5)
    context.add_init_script(f"window.__ARC_SEED__ = {json.dumps(seed.build('studio'))};")
    context.add_init_script(path=str(DOCS / "chrome-mock.js"))
    page, panel = open_window(context, base)
    click(page, panel.get_by_label("Edit Studio"), pause=900)
    page.locator("#panel").screenshot(path=str(OUT / "space-editor.png"))
    context.close()

    context = new_context(browser, "work")
    page, panel = open_window(context, base)
    click(page, panel.get_by_label("Settings", exact=True), pause=900)
    page.locator("#panel").screenshot(path=str(OUT / "settings.png"))
    squeeze(OUT / "settings.png")
    panel.locator("input[type=file]").set_input_files(str(backup_file(tmp)))
    page.wait_for_timeout(1000)
    page.locator("#panel").screenshot(path=str(OUT / "backup-import.png"))
    squeeze(OUT / "backup-import.png")
    context.close()

    context = new_context(browser, "work")
    page = context.new_page()
    page.clock.set_fixed_time("2026-11-17T09:41:00")
    page.goto(f"{base}/newtab.html")
    page.wait_for_timeout(1800)
    page.screenshot(path=str(OUT / "newtab.png"))
    squeeze(OUT / "newtab.png")
    context.close()


class Recorder:
    def __init__(self, page, directory: Path):
        self.page, self.directory, self.frames = page, directory, []
        directory.mkdir(parents=True, exist_ok=True)

    def snap(self):
        path = self.directory / f"{len(self.frames):05d}.jpg"
        self.page.screenshot(path=str(path), type="jpeg", quality=88)
        self.frames.append((path, time.time()))

    def wait(self, ms):
        end = time.time() + ms / 1000
        while time.time() < end:
            self.snap()

    def click(self, locator, pause=350):
        box = locator.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        for step in range(1, 13):
            self.page.mouse.move(self.last[0] + (x - self.last[0]) * step / 12, self.last[1] + (y - self.last[1]) * step / 12)
            self.snap()
        self.last = (x, y)
        self.wait(120)
        self.page.mouse.click(x, y)
        self.wait(pause)

    last = (640, 400)

    def render(self, target: Path, start=0.0, fps=12, width=840, colors=200):
        listing = self.directory / "frames.txt"
        lines = []
        for index, (path, stamp) in enumerate(self.frames):
            following = self.frames[index + 1][1] if index + 1 < len(self.frames) else stamp + 0.1
            lines += [f"file '{path}'", f"duration {following - stamp:.4f}"]
        lines.append(f"file '{self.frames[-1][0]}'")
        listing.write_text("\n".join(lines))
        filters = f"fps={fps},scale={width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-f", "concat", "-safe", "0", "-i", str(listing), "-vf", filters, "-loop", "0", str(target)], check=True)


def scene_videos(browser, base, tmp: Path):
    def record(name, steps, active="personal"):
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        context.add_init_script(f"window.__ARC_SEED__ = {json.dumps(seed.build(active))};")
        context.add_init_script(path=str(DOCS / "chrome-mock.js"))
        page, panel = open_window(context, base, cursor=True)
        recorder = Recorder(page, tmp / name)
        recorder.wait(900)
        steps(recorder, page, panel)
        recorder.render(OUT / f"{name}.gif")
        context.close()

    def tour(rec, page, panel):
        footer = panel.get_by_role("contentinfo")
        rec.wait(900)
        for name in ["Work", "Studio", "Learning", "Personal"]:
            rec.click(footer.get_by_label(name, exact=True), pause=1500)

    def palette(rec, page, panel):
        panel.locator("body").click(position={"x": 200, "y": 700})
        rec.wait(700)
        page.keyboard.press("Meta+k")
        rec.wait(700)
        for char in "rust":
            page.keyboard.type(char)
            rec.wait(170)
        rec.wait(900)
        page.keyboard.press("ArrowDown")
        rec.wait(500)
        page.keyboard.press("Enter")
        rec.wait(2300)

    record("hero", tour)
    record("palette", palette)


def main():
    from playwright.sync_api import sync_playwright
    import tempfile
    OUT.mkdir(exist_ok=True)
    server, base = serve()
    with sync_playwright() as playwright, tempfile.TemporaryDirectory() as directory:
        browser = playwright.chromium.launch(channel="chrome")
        tmp = Path(directory)
        scene_stills(browser, base, tmp)
        scene_videos(browser, base, tmp)
        browser.close()
    server.shutdown()


if __name__ == "__main__":
    main()
