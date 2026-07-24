from curl_cffi import requests

session = requests.Session(impersonate="chrome")

response = session.get("https://www.upwork.com/")

with open("upwork.html", "w", encoding="utf-8") as f:
    f.write(response.text)


print("Saved!")