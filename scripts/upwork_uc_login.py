#!/usr/bin/env python3
"""
Login to Upwork via undetected-chromedriver to bypass Cloudflare.
Uses Playwright's Chromium binary.
"""
import json
import sys
import time

COOKIE_FILE = "/tmp/upwork_cookies.json"
DOCKER_COOKIE_FILE = "/home/ubuntu/upwork-api/upwork_cookies.json"
CHROME_PATH = "/home/ubuntu/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"

EMAIL = "usama@thrilledge.com"
PASSWORD = "@Usama#Adeel183"


def login():
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    options = uc.ChromeOptions()
    options.binary_location = CHROME_PATH
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--headless=new")

    print("Starting Chrome...")
    driver = uc.Chrome(options=options, headless=True, use_subprocess=True)

    try:
        # 1. Go to login page
        print("Step 1: Loading login page...")
        driver.get("https://www.upwork.com/ab/account-security/login")
        time.sleep(12)
        print(f"  URL: {driver.current_url}")

        # Debug: find inputs
        inputs = driver.find_elements(By.TAG_NAME, "input")
        print(f"  Found {len(inputs)} input elements:")
        for inp in inputs:
            name = inp.get_attribute("name")
            iid = inp.get_attribute("id")
            itype = inp.get_attribute("type")
            print(f"    name={name} id={iid} type={itype}")

        # 2. Fill username
        print("Step 2: Filling username...")
        try:
            username_el = WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 
                    'input[name="login_username"], input[id="login_username"], input[aria-label="Email or username"]'))
            )
            username_el.clear()
            username_el.send_keys(EMAIL)
            time.sleep(1)
        except Exception as e:
            print(f"  Username field error: {e}")
            # Take screenshot for debugging
            driver.save_screenshot("/tmp/login_debug.png")
            print("  Screenshot saved to /tmp/login_debug.png")
            return False

        # 3. Fill password
        print("Step 3: Filling password...")
        try:
            password_el = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR,
                    'input[name="login_password"], input[id="login_password"], input[aria-label="Password"]'))
            )
            password_el.clear()
            password_el.send_keys(PASSWORD)
            time.sleep(1)
        except Exception as e:
            print(f"  Password field error: {e}")
            return False

        # 4. Click submit
        print("Step 4: Submitting login...")
        try:
            submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
            submit_btn.click()
        except Exception:
            password_el.send_keys("\n")

        time.sleep(12)
        print(f"  URL after login: {driver.current_url}")

        # 5. Navigate to jobs page
        print("Step 5: Navigating to jobs page...")
        driver.get("https://www.upwork.com/nx/search/jobs/")
        time.sleep(8)

        # 6. Extract cookies
        print("Step 6: Extracting cookies...")
        cookies = driver.get_cookies()

        upwork_cookies = {}
        for c in cookies:
            if ".upwork.com" in c.get("domain", ""):
                upwork_cookies[c["name"]] = c["value"]

        print(f"  Got {len(upwork_cookies)} Upwork cookies")
        important = ["JobDetailsNuxt_vt", "visitor_gql_token", "XSRF-TOKEN"]
        for name in important:
            val = upwork_cookies.get(name)
            if val:
                print(f"  ✓ {name}: {val[:50]}...")
            else:
                print(f"  ✗ {name}: NOT FOUND")

        if upwork_cookies:
            with open(COOKIE_FILE, "w") as f:
                json.dump(upwork_cookies, f, indent=2)
            print(f"\nSaved to {COOKIE_FILE}")

            with open(DOCKER_COOKIE_FILE, "w") as f:
                json.dump(upwork_cookies, f, indent=2)
            print(f"Saved to {DOCKER_COOKIE_FILE}")

        return bool(upwork_cookies.get("JobDetailsNuxt_vt"))

    finally:
        driver.quit()
        print("Browser closed")


if __name__ == "__main__":
    success = login()
    print(f"\nLogin {'SUCCESS' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
