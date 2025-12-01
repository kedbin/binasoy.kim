from playwright.sync_api import sync_playwright
import time

def verify_vertical_layout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1080, "height": 1920})

        page.goto("http://localhost:8080")

        try:
            page.wait_for_selector("body.loaded", timeout=15000)
        except:
            print("Loader timeout?")
            return

        time.sleep(2)

        # Hide webpack overlay
        page.evaluate("""
            const overlay = document.getElementById('webpack-dev-server-client-overlay');
            if (overlay) overlay.style.display = 'none';
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(f => f.style.display = 'none');
        """)

        page.screenshot(path="/home/jules/verification/vertical_layout_clean.png")
        print("Screenshot taken.")

        browser.close()

verify_vertical_layout()
