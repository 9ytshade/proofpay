"""Windows compatibility for genlayer-test direct mode."""

import atexit
import os
from pathlib import Path
import tempfile


if os.name == "nt":
    _unlink = os.unlink
    _deferred_paths: list[str] = []
    _temp_dir = Path(tempfile.gettempdir()).resolve()

    def _defer_locked_temp_file(path, *args, **kwargs):
        try:
            _unlink(path, *args, **kwargs)
        except PermissionError:
            resolved = Path(path).resolve()
            if resolved.parent != _temp_dir or not resolved.name.startswith("tmp"):
                raise
            _deferred_paths.append(str(resolved))

    os.unlink = _defer_locked_temp_file

    @atexit.register
    def _remove_deferred_temp_files() -> None:
        for path in _deferred_paths:
            try:
                _unlink(path)
            except (FileNotFoundError, PermissionError):
                pass

