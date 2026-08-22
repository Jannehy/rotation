"""`python -m rotation` – the development server. Production runs gunicorn."""

from . import config
from .app import create_app

if __name__ == "__main__":
    cfg = config.load()
    create_app().run(host="0.0.0.0", port=cfg.port, threaded=True)
