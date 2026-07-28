import nodriver
print([m for m in dir(nodriver.Browser) if not m.startswith("_")])
print("---TAB---")
print([m for m in dir(nodriver.Tab) if not m.startswith("_")])
