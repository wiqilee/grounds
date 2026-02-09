import json
from pathlib import Path
from jinja2 import Template

HERE = Path(__file__).parent
TEMPLATE = HERE / "template.html.j2"

def main():
  import argparse
  ap = argparse.ArgumentParser()
  ap.add_argument("--in", dest="inp", required=True)
  ap.add_argument("--out", dest="out", required=True)
  args = ap.parse_args()

  data = json.loads(Path(args.inp).read_text(encoding="utf-8"))
  tpl = Template(TEMPLATE.read_text(encoding="utf-8"))
  html = tpl.render(title=data.get("title","Grounds Report"), data=data)
  Path(args.out).write_text(html, encoding="utf-8")
  print("Wrote:", args.out)

if __name__ == "__main__":
  main()
