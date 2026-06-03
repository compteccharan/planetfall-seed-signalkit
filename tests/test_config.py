import os
import unittest

import signalkit.config as config_module
from signalkit.config import default_timeout


class TestDefaultTimeout(unittest.TestCase):
    def _set_env(self, value):
        os.environ["SIGNALKIT_TIMEOUT"] = value

    def _clear_env(self):
        os.environ.pop("SIGNALKIT_TIMEOUT", None)

    def tearDown(self):
        self._clear_env()

    def test_env_var_unset_returns_default(self):
        self._clear_env()
        self.assertEqual(default_timeout(), 10.0)

    def test_env_var_set_valid_float(self):
        self._set_env("30.5")
        self.assertEqual(default_timeout(), 30.5)

    def test_env_var_set_invalid_returns_default(self):
        self._set_env("not-a-number")
        self.assertEqual(default_timeout(), 10.0)


if __name__ == "__main__":
    unittest.main()
