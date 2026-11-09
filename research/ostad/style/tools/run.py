"""Launcher: python -I tools/run.py <tool> [args]. Isolated mode (-I) keeps the tools from importing anything planted next to the
downloaded media; this puts tools/ (and only tools/) back on sys.path and runs tools/<tool>.py as __main__."""
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
tool = sys.argv[1]
sys.argv = [os.path.join(HERE, tool + ".py")] + sys.argv[2:]
runpy.run_path(sys.argv[0], run_name="__main__")
