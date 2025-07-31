"""
CastPlan Automation - Python Bridge

A Python bridge for the CastPlan Automation MCP Server.
This package provides a seamless interface to the Node.js-based MCP server
through Python, enabling installation and configuration via pip, uv, and uvx.
"""

__version__ = "2.0.0"
__author__ = "CastPlan Team"
__email__ = "team@castplan.dev"
__license__ = "MIT"

from .launcher import NodeJSLauncher, LaunchError, NodeJSNotFoundError
from .installer import NodeJSInstaller, InstallationError
from .config import ConfigurationManager, ConfigError

__all__ = [
    "__version__",
    "__author__", 
    "__email__",
    "__license__",
    "NodeJSLauncher",
    "LaunchError",
    "NodeJSNotFoundError", 
    "NodeJSInstaller",
    "InstallationError",
    "ConfigurationManager",
    "ConfigError"
]

# Package metadata
PACKAGE_NAME = "castplan-automation"
NODEJS_PACKAGE = "@castplan/automation-mcp"
MINIMUM_NODE_VERSION = "18.0.0"
SUPPORTED_PLATFORMS = ["win32", "darwin", "linux"]
SUPPORTED_MANAGERS = ["npm", "yarn", "pnpm"]

# Default configuration
DEFAULT_CONFIG = {
    "auto_install_nodejs": True,
    "auto_configure": True,
    "prefer_global_install": True,
    "fallback_managers": ["npm", "yarn", "pnpm"],
    "config_locations": {
        "claude_desktop": {
            "win32": "%APPDATA%/Claude/claude_desktop_config.json",
            "darwin": "~/Library/Application Support/Claude/claude_desktop_config.json", 
            "linux": "~/.config/claude/claude_desktop_config.json"
        }
    }
}