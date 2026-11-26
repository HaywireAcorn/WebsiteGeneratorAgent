from pathlib import Path
p = Path("workspace") / "test.txt"
p.parent.mkdir(parents=True, exist_ok=True)
p.write_text("hi", encoding="utf-8")
print("ok", p.resolve())