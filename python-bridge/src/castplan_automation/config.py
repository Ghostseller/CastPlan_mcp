"""
Enhanced Configuration Manager with uv/uvx Support

Handles MCP server configuration generation and management across different environments
with comprehensive uv/uvx integration, modern Python package manager support, and
intelligent environment detection for optimal MCP client compatibility.
"""

import os
import json
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List, Union, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.tree import Tree
from pydantic import BaseModel, Field


class ConfigError(Exception):
    """Base exception for configuration errors"""
    pass


class EnvironmentType(Enum):
    """Supported MCP environment types"""
    CLAUDE_DESKTOP = "claude_desktop"
    STANDARD_MCP = "standard_mcp"
    CLINE = "cline"
    CURSOR = "cursor"
    CONTINUE = "continue"
    VSCODE_CLAUDE = "vscode_claude"
    CUSTOM = "custom"


class LaunchMethod(Enum):
    """Configuration generation methods"""
    UVX_EPHEMERAL = "uvx_ephemeral"
    UV_PROJECT = "uv_project"
    NODEJS_DIRECT = "nodejs_direct"
    PYTHON_BRIDGE = "python_bridge"


@dataclass
class EnvironmentDetection:
    """Environment detection result"""
    env_type: EnvironmentType
    detected: bool
    locations: List["ConfigLocation"]
    priority: int
    compatibility_score: float  # 0.0 to 1.0
    recommended_method: LaunchMethod
    notes: List[str] = field(default_factory=list)


class MCPServerConfig(BaseModel):
    """MCP Server configuration model"""
    command: str
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    cwd: Optional[str] = None


class ClaudeDesktopConfig(BaseModel):
    """Claude Desktop configuration model"""
    mcpServers: Dict[str, MCPServerConfig] = Field(default_factory=dict)


@dataclass
class ConfigLocation:
    """Configuration file location information"""
    name: str
    path: Path
    exists: bool
    writable: bool


class ConfigurationManager:
    """
    Enhanced MCP server configuration manager with comprehensive uv/uvx support.
    
    Provides intelligent environment detection, multiple launch method support,
    and cross-platform compatibility for modern Python workflows and MCP clients.
    """
    
    def __init__(self,
                 nodejs_package: str = "@castplan/ultimate-automation-mcp",
                 python_package: str = "castplan-ultimate-automation",
                 console: Optional[Console] = None):
        self.nodejs_package = nodejs_package
        self.python_package = python_package
        self.console = console or Console()
        self.platform = platform.system().lower()
        self.detected_environments: List[EnvironmentDetection] = []
        self.available_methods: List[LaunchMethod] = []
        self._detect_available_methods()
        
    def _detect_available_methods(self) -> None:
        """Detect available launch methods"""
        methods = []
        
        # Check for uvx
        if shutil.which("uvx") or (self.platform == "windows" and shutil.which("uvx.exe")):
            methods.append(LaunchMethod.UVX_EPHEMERAL)
            
        # Check for uv
        if shutil.which("uv") or (self.platform == "windows" and shutil.which("uv.exe")):
            methods.append(LaunchMethod.UV_PROJECT)
            
        # Check for Node.js
        if shutil.which("node") or (self.platform == "windows" and shutil.which("node.exe")):
            methods.append(LaunchMethod.NODEJS_DIRECT)
            
        # Python bridge is always available
        methods.append(LaunchMethod.PYTHON_BRIDGE)
        
        self.available_methods = methods
        
    def detect_comprehensive_environments(self) -> List[EnvironmentDetection]:
        """
        Perform comprehensive environment detection with scoring and recommendations.
        
        Returns:
            List[EnvironmentDetection]: Detected environments with metadata
        """
        detections = []
        
        # Claude Desktop detection
        claude_detection = self._detect_claude_desktop()
        if claude_detection:
            detections.append(claude_detection)
            
        # Standard MCP detection
        mcp_detection = self._detect_standard_mcp()
        if mcp_detection:
            detections.append(mcp_detection)
            
        # VS Code extensions detection
        cline_detection = self._detect_cline()
        if cline_detection:
            detections.append(cline_detection)
            
        cursor_detection = self._detect_cursor()
        if cursor_detection:
            detections.append(cursor_detection)
            
        continue_detection = self._detect_continue()
        if continue_detection:
            detections.append(continue_detection)
            
        # Sort by priority and compatibility score
        detections.sort(key=lambda d: (d.priority, d.compatibility_score), reverse=True)
        
        self.detected_environments = detections
        return detections
        
    def _detect_claude_desktop(self) -> Optional[EnvironmentDetection]:
        """Detect Claude Desktop environment"""
        locations = []
        
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                locations.append(
                    self._check_location("Claude Desktop (AppData)", 
                                       Path(appdata) / "Claude" / "claude_desktop_config.json")
                )
        elif self.platform == "darwin":
            home = Path.home()
            locations.append(
                self._check_location("Claude Desktop (macOS)",
                                   home / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json")
            )
        elif self.platform == "linux":
            home = Path.home()
            locations.extend([
                self._check_location("Claude Desktop (XDG)",
                                   home / ".config" / "claude" / "claude_desktop_config.json"),
                self._check_location("Claude Desktop (Local)",
                                   home / ".claude" / "claude_desktop_config.json")
            ])
            
        detected = any(loc.exists for loc in locations)
        compatibility_score = 1.0 if detected else 0.8  # High compatibility even if not detected
        
        # Recommend uvx for ephemeral usage or Node.js for direct execution
        recommended_method = (LaunchMethod.UVX_EPHEMERAL if LaunchMethod.UVX_EPHEMERAL in self.available_methods 
                            else LaunchMethod.NODEJS_DIRECT if LaunchMethod.NODEJS_DIRECT in self.available_methods
                            else LaunchMethod.PYTHON_BRIDGE)
        
        return EnvironmentDetection(
            env_type=EnvironmentType.CLAUDE_DESKTOP,
            detected=detected,
            locations=locations,
            priority=100,
            compatibility_score=compatibility_score,
            recommended_method=recommended_method,
            notes=["Primary MCP client", "Supports all launch methods"]
        )
        
    def _detect_standard_mcp(self) -> Optional[EnvironmentDetection]:
        """Detect standard MCP environment"""
        locations = []
        home = Path.home()
        
        locations.extend([
            self._check_location("MCP Config (Home)", home / ".mcp" / "config.json"),
            self._check_location("MCP Config (Local)", home / ".config" / "mcp" / "config.json")
        ])
        
        detected = any(loc.exists for loc in locations)
        
        return EnvironmentDetection(
            env_type=EnvironmentType.STANDARD_MCP,
            detected=detected,
            locations=locations,
            priority=90,
            compatibility_score=0.9,
            recommended_method=LaunchMethod.NODEJS_DIRECT,
            notes=["Standard MCP protocol", "Widely compatible"]
        )
        
    def _detect_cline(self) -> Optional[EnvironmentDetection]:
        """Detect Cline (Claude-dev) VS Code extension"""
        locations = []
        
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                locations.append(
                    self._check_location("Cline (VS Code)",
                                       Path(appdata) / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev" / "config.json")
                )
        else:
            home = Path.home()
            locations.extend([
                self._check_location("Cline (VS Code)",
                                   home / ".vscode" / "extensions" / "claude-dev" / "config.json"),
                self._check_location("Cline (User)",
                                   home / ".config" / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev" / "config.json")
            ])
            
        detected = any(loc.exists for loc in locations)
        
        return EnvironmentDetection(
            env_type=EnvironmentType.CLINE,
            detected=detected,
            locations=locations,
            priority=85,
            compatibility_score=0.85,
            recommended_method=LaunchMethod.UVX_EPHEMERAL,
            notes=["VS Code extension", "Prefers ephemeral execution"]
        )
        
    def _detect_cursor(self) -> Optional[EnvironmentDetection]:
        """Detect Cursor IDE"""
        locations = []
        
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                locations.append(
                    self._check_location("Cursor (AppData)",
                                       Path(appdata) / "Cursor" / "User" / "settings.json")
                )
        else:
            home = Path.home()
            locations.extend([
                self._check_location("Cursor (Config)",
                                   home / ".cursor" / "settings.json"),
                self._check_location("Cursor (Local)",
                                   home / ".config" / "Cursor" / "User" / "settings.json")
            ])
            
        detected = any(loc.exists for loc in locations)
        
        return EnvironmentDetection(
            env_type=EnvironmentType.CURSOR,
            detected=detected,
            locations=locations,
            priority=80,
            compatibility_score=0.8,
            recommended_method=LaunchMethod.UV_PROJECT,
            notes=["Modern IDE", "Good uv integration"]
        )
        
    def _detect_continue(self) -> Optional[EnvironmentDetection]:
        """Detect Continue VS Code extension"""
        locations = []
        home = Path.home()
        
        locations.extend([
            self._check_location("Continue (VS Code)",
                               home / ".continue" / "config.json"),
            self._check_location("Continue (Config)",
                               home / ".config" / "continue" / "config.json")
        ])
        
        detected = any(loc.exists for loc in locations)
        
        return EnvironmentDetection(
            env_type=EnvironmentType.CONTINUE,
            detected=detected,
            locations=locations,
            priority=75,
            compatibility_score=0.75,
            recommended_method=LaunchMethod.PYTHON_BRIDGE,
            notes=["VS Code extension", "Basic MCP support"]
        )
        
    def detect_config_locations(self) -> Dict[str, List[ConfigLocation]]:
        """
        Detect configuration file locations for different MCP environments.
        
        Returns:
            Dict[str, List[ConfigLocation]]: Mapping of environment names to config locations
        """
        locations = {}
        
        # Claude Desktop configurations
        claude_locations = []
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                claude_locations.append(
                    self._check_location("Claude Desktop (AppData)", 
                                       Path(appdata) / "Claude" / "claude_desktop_config.json")
                )
        elif self.platform == "darwin":
            home = Path.home()
            claude_locations.append(
                self._check_location("Claude Desktop (macOS)",
                                   home / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json")
            )
        elif self.platform == "linux":
            home = Path.home()
            claude_locations.extend([
                self._check_location("Claude Desktop (XDG)",
                                   home / ".config" / "claude" / "claude_desktop_config.json"),
                self._check_location("Claude Desktop (Local)",
                                   home / ".claude" / "claude_desktop_config.json")
            ])
            
        locations["claude_desktop"] = claude_locations
        
        # Standard MCP configurations
        mcp_locations = []
        home = Path.home()
        mcp_locations.extend([
            self._check_location("MCP Config (Home)", home / ".mcp" / "config.json"),
            self._check_location("MCP Config (Local)", home / ".config" / "mcp" / "config.json")
        ])
        
        locations["standard_mcp"] = mcp_locations
        
        # Cline configurations
        cline_locations = []
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                cline_locations.append(
                    self._check_location("Cline (AppData)",
                                       Path(appdata) / "Code" / "User" / "globalStorage" / "saoudrizwan.claude-dev" / "config.json")
                )
        else:
            home = Path.home()
            cline_locations.append(
                self._check_location("Cline (VS Code)",
                                   home / ".vscode" / "extensions" / "claude-dev" / "config.json")
            )
            
        locations["cline"] = cline_locations
        
        # Cursor configurations  
        cursor_locations = []
        if self.platform == "windows":
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                cursor_locations.append(
                    self._check_location("Cursor (AppData)",
                                       Path(appdata) / "Cursor" / "User" / "settings.json")
                )
        else:
            home = Path.home()
            cursor_locations.append(
                self._check_location("Cursor (Config)",
                                   home / ".cursor" / "settings.json")
            )
            
        locations["cursor"] = cursor_locations
        
        return locations
        
    def _check_location(self, name: str, path: Path) -> ConfigLocation:
        """Check if a configuration location exists and is writable"""
        exists = path.exists()
        writable = False
        
        if exists:
            try:
                # Test write access
                with open(path, 'a'):
                    pass
                writable = True
            except (PermissionError, OSError):
                writable = False
        else:
            # Check if parent directory is writable
            parent = path.parent
            try:
                parent.mkdir(parents=True, exist_ok=True)
                writable = parent.exists()
            except (PermissionError, OSError):
                writable = False
                
        return ConfigLocation(
            name=name,
            path=path,
            exists=exists,
            writable=writable
        )
        
    def generate_claude_desktop_config(self,
                                     server_name: str = "castplan-ultimate",
                                     custom_args: Optional[List[str]] = None) -> ClaudeDesktopConfig:
        """
        Generate Claude Desktop configuration.
        
        Args:
            server_name: Name for the MCP server
            custom_args: Custom arguments to pass to the server
            
        Returns:
            ClaudeDesktopConfig: Generated configuration
        """
        # Detect Node.js installation
        from .launcher import NodeJSLauncher
        
        try:
            launcher = NodeJSLauncher(self.nodejs_package)
            node_info = launcher.detect_nodejs()
            package_path = launcher.find_package_installation()
            
            if not package_path:
                raise ConfigError(f"Package {self.nodejs_package} not found")
                
            # Build server configuration
            main_script = Path(package_path) / "dist" / "index.js"
            if not main_script.exists():
                raise ConfigError(f"Main script not found: {main_script}")
                
            args = [str(main_script)]
            if custom_args:
                args.extend(custom_args)
                
            server_config = MCPServerConfig(
                command=node_info.path,
                args=args,
                env={
                    "NODE_ENV": "production",
                    "CASTPLAN_LOG_LEVEL": "info"
                }
            )
            
            config = ClaudeDesktopConfig()
            config.mcpServers[server_name] = server_config
            
            return config
            
        except Exception as e:
            raise ConfigError(f"Failed to generate Claude Desktop config: {e}")
            
    def generate_standard_mcp_config(self,
                                   server_name: str = "castplan-ultimate",
                                   custom_args: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate standard MCP configuration.
        
        Args:
            server_name: Name for the MCP server
            custom_args: Custom arguments to pass to the server
            
        Returns:
            Dict[str, Any]: Generated configuration
        """
        try:
            # Similar to Claude Desktop but with different structure
            claude_config = self.generate_claude_desktop_config(server_name, custom_args)
            server_config = claude_config.mcpServers[server_name]
            
            return {
                "servers": {
                    server_name: {
                        "command": server_config.command,
                        "args": server_config.args or [],
                        "env": server_config.env or {},
                        "cwd": server_config.cwd
                    }
                },
                "logging": {
                    "level": "info",
                    "file": str(Path.home() / ".mcp" / "logs" / f"{server_name}.log")
                }
            }
            
        except Exception as e:
            raise ConfigError(f"Failed to generate standard MCP config: {e}")
            
    def generate_enhanced_config(self,
                               env_type: EnvironmentType,
                               launch_method: LaunchMethod,
                               server_name: str = "castplan-ultimate",
                               custom_args: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Generate enhanced configuration with support for multiple launch methods.
        
        Args:
            env_type: Target environment type
            launch_method: Launch method to use
            server_name: Name for the MCP server
            custom_args: Custom arguments to pass to the server
            
        Returns:
            Dict[str, Any]: Generated configuration
        """
        if launch_method == LaunchMethod.UVX_EPHEMERAL:
            return self._generate_uvx_config(env_type, server_name, custom_args)
        elif launch_method == LaunchMethod.UV_PROJECT:
            return self._generate_uv_config(env_type, server_name, custom_args)
        elif launch_method == LaunchMethod.NODEJS_DIRECT:
            return self._generate_nodejs_config(env_type, server_name, custom_args)
        elif launch_method == LaunchMethod.PYTHON_BRIDGE:
            return self._generate_python_config(env_type, server_name, custom_args)
        else:
            raise ConfigError(f"Unsupported launch method: {launch_method}")
            
    def _generate_uvx_config(self,
                           env_type: EnvironmentType,
                           server_name: str,
                           custom_args: Optional[List[str]]) -> Dict[str, Any]:
        """Generate configuration for uvx ephemeral execution"""
        uvx_path = shutil.which("uvx")
        if not uvx_path and self.platform == "windows":
            uvx_path = shutil.which("uvx.exe")
            
        if not uvx_path:
            raise ConfigError("uvx not found for ephemeral configuration")
            
        # Build uvx command
        args = ["--from", self.python_package, "castplan-ultimate"]
        if custom_args:
            args.extend(custom_args)
            
        if env_type == EnvironmentType.CLAUDE_DESKTOP:
            return {
                "mcpServers": {
                    server_name: {
                        "command": uvx_path,
                        "args": args,
                        "env": {
                            "UV_CACHE_DIR": str(Path.home() / ".cache" / "uv"),
                            "CASTPLAN_LOG_LEVEL": "info"
                        }
                    }
                }
            }
        else:
            return {
                "servers": {
                    server_name: {
                        "command": uvx_path,
                        "args": args,
                        "env": {
                            "UV_CACHE_DIR": str(Path.home() / ".cache" / "uv"),
                            "CASTPLAN_LOG_LEVEL": "info"
                        }
                    }
                }
            }
            
    def _generate_uv_config(self,
                          env_type: EnvironmentType,
                          server_name: str,
                          custom_args: Optional[List[str]]) -> Dict[str, Any]:
        """Generate configuration for uv project execution"""
        uv_path = shutil.which("uv")
        if not uv_path and self.platform == "windows":
            uv_path = shutil.which("uv.exe")
            
        if not uv_path:
            raise ConfigError("uv not found for project configuration")
            
        # Build uv command
        args = ["run", "castplan-ultimate"]
        if custom_args:
            args.extend(custom_args)
            
        config_base = {
            "command": uv_path,
            "args": args,
            "env": {
                "UV_PROJECT_ENVIRONMENT": str(Path.cwd() / ".venv"),
                "CASTPLAN_LOG_LEVEL": "info"
            }
        }
        
        if env_type == EnvironmentType.CLAUDE_DESKTOP:
            return {"mcpServers": {server_name: config_base}}
        else:
            return {"servers": {server_name: config_base}}
            
    def _generate_nodejs_config(self,
                              env_type: EnvironmentType,
                              server_name: str,
                              custom_args: Optional[List[str]]) -> Dict[str, Any]:
        """Generate configuration for Node.js direct execution"""
        # Use existing Node.js generation logic
        if env_type == EnvironmentType.CLAUDE_DESKTOP:
            config = self.generate_claude_desktop_config(server_name, custom_args)
            return config.model_dump()
        else:
            return self.generate_standard_mcp_config(server_name, custom_args)
            
    def _generate_python_config(self,
                              env_type: EnvironmentType,
                              server_name: str,
                              custom_args: Optional[List[str]]) -> Dict[str, Any]:
        """Generate configuration for Python bridge execution"""
        python_path = shutil.which("python")
        if not python_path:
            python_path = shutil.which("python3")
        if not python_path and self.platform == "windows":
            python_path = shutil.which("python.exe")
            
        if not python_path:
            raise ConfigError("Python not found for bridge configuration")
            
        # Build Python command
        args = ["-m", "castplan_ultimate_automation.cli", "run"]
        if custom_args:
            args.extend(custom_args)
            
        config_base = {
            "command": python_path,
            "args": args,
            "env": {
                "PYTHONPATH": str(Path.cwd()),
                "CASTPLAN_LOG_LEVEL": "info"
            }
        }
        
        if env_type == EnvironmentType.CLAUDE_DESKTOP:
            return {"mcpServers": {server_name: config_base}}
        else:
            return {"servers": {server_name: config_base}}
            
    def smart_configure(self,
                       auto_detect: bool = True,
                       preferred_method: Optional[LaunchMethod] = None,
                       server_name: str = "castplan-ultimate") -> Dict[str, Any]:
        """
        Intelligent configuration with automatic environment and method selection.
        
        Args:
            auto_detect: Automatically detect and configure environments
            preferred_method: Preferred launch method
            server_name: Name for the MCP server
            
        Returns:
            Dict[str, Any]: Configuration results
        """
        # Detect environments
        if not self.detected_environments:
            self.detect_comprehensive_environments()
            
        results = {
            "environments_detected": len(self.detected_environments),
            "environments_configured": 0,
            "configurations": {},
            "errors": [],
            "recommendations": []
        }
        
        for env_detection in self.detected_environments:
            if not env_detection.detected and not auto_detect:
                continue
                
            try:
                # Select launch method
                method = preferred_method or env_detection.recommended_method
                
                # Generate configuration
                config = self.generate_enhanced_config(
                    env_detection.env_type,
                    method,
                    server_name
                )
                
                # Install configuration if possible
                writable_location = None
                for location in env_detection.locations:
                    if location.writable:
                        writable_location = location
                        break
                        
                if writable_location:
                    success = self._install_enhanced_config(
                        config,
                        writable_location,
                        env_detection.env_type
                    )
                    
                    if success:
                        results["environments_configured"] += 1
                        results["configurations"][env_detection.env_type.value] = {
                            "method": method.value,
                            "location": str(writable_location.path),
                            "compatibility_score": env_detection.compatibility_score
                        }
                    else:
                        results["errors"].append(f"Failed to install {env_detection.env_type.value} config")
                else:
                    results["errors"].append(f"No writable location for {env_detection.env_type.value}")
                    
            except Exception as e:
                results["errors"].append(f"Error configuring {env_detection.env_type.value}: {e}")
                
        # Add recommendations
        if results["environments_configured"] == 0:
            results["recommendations"].extend([
                "Consider installing uv/uvx for modern Python workflows",
                "Ensure Claude Desktop or MCP client is installed",
                "Check file permissions for configuration directories"
            ])
        elif results["environments_configured"] < len(self.detected_environments):
            results["recommendations"].append("Some environments could not be configured - check permissions")
            
        return results
        
    def _install_enhanced_config(self,
                               config: Dict[str, Any],
                               location: ConfigLocation,
                               env_type: EnvironmentType) -> bool:
        """Install enhanced configuration to target location"""
        try:
            # Ensure parent directory exists
            location.path.parent.mkdir(parents=True, exist_ok=True)
            
            # Handle existing configuration
            existing_config = {}
            if location.exists:
                try:
                    with open(location.path, 'r') as f:
                        existing_config = json.load(f)
                except (json.JSONDecodeError, IOError):
                    pass  # Ignore invalid existing config
                    
            # Merge configurations
            if env_type == EnvironmentType.CLAUDE_DESKTOP and "mcpServers" in existing_config:
                existing_servers = existing_config.get("mcpServers", {})
                existing_servers.update(config["mcpServers"])
                config["mcpServers"] = existing_servers
            elif "servers" in existing_config:
                existing_servers = existing_config.get("servers", {})
                existing_servers.update(config["servers"])
                config["servers"] = existing_servers
                
            # Write configuration
            with open(location.path, 'w') as f:
                json.dump(config, f, indent=2)
                
            self.console.print(f"✅ Configured {env_type.value} at {location.path}")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Failed to configure {env_type.value}: {e}")
            return False
            
    def display_environment_summary(self) -> None:
        """Display a comprehensive summary of detected environments"""
        if not self.detected_environments:
            self.detect_comprehensive_environments()
            
        # Create summary table
        table = Table(title="MCP Environment Detection Summary")
        table.add_column("Environment", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Compatibility", style="yellow")
        table.add_column("Recommended Method", style="blue")
        table.add_column("Notes", style="dim")
        
        for env in self.detected_environments:
            status = "✅ Detected" if env.detected else "⚪ Available"
            compatibility = f"{env.compatibility_score:.1%}"
            method = env.recommended_method.value.replace("_", " ").title()
            notes = ", ".join(env.notes[:2])  # Limit notes for table display
            
            table.add_row(
                env.env_type.value.replace("_", " ").title(),
                status,
                compatibility,
                method,
                notes
            )
            
        self.console.print(table)
        
        # Display available methods
        methods_panel = Panel(
            "\n".join([f"• {method.value.replace('_', ' ').title()}" for method in self.available_methods]),
            title="Available Launch Methods",
            border_style="blue"
        )
        self.console.print(methods_panel)
        
    def install_config(self,
                      environment: str = "claude_desktop",
                      server_name: str = "castplan-ultimate",
                      backup_existing: bool = True,
                      force: bool = False) -> bool:
        """
        Install configuration to detected location.
        
        Args:
            environment: Target environment (claude_desktop, standard_mcp, etc.)
            server_name: Name for the MCP server
            backup_existing: Create backup of existing config
            force: Force installation even if location not writable
            
        Returns:
            bool: True if installation succeeded
        """
        locations = self.detect_config_locations()
        
        if environment not in locations:
            raise ConfigError(f"Environment '{environment}' not supported")
            
        # Find best location
        target_location = None
        for location in locations[environment]:
            if location.writable or force:
                target_location = location
                break
                
        if not target_location:
            raise ConfigError(f"No writable location found for {environment}")
            
        self.console.print(f"🔧 Installing {environment} configuration to {target_location.path}")
        
        try:
            # Generate configuration
            if environment == "claude_desktop":
                new_config = self.generate_claude_desktop_config(server_name)
                config_dict = new_config.model_dump()
            elif environment == "standard_mcp":
                config_dict = self.generate_standard_mcp_config(server_name)
            else:
                raise ConfigError(f"Configuration generation not implemented for {environment}")
                
            # Handle existing configuration
            existing_config = {}
            if target_location.exists:
                try:
                    with open(target_location.path, 'r') as f:
                        existing_config = json.load(f)
                        
                    # Create backup
                    if backup_existing:
                        backup_path = target_location.path.with_suffix('.json.backup')
                        with open(backup_path, 'w') as f:
                            json.dump(existing_config, f, indent=2)
                        self.console.print(f"💾 Backup created: {backup_path}")
                        
                except (json.JSONDecodeError, IOError) as e:
                    self.console.print(f"⚠️  Warning: Could not read existing config: {e}")
                    
            # Merge configurations
            if environment == "claude_desktop" and "mcpServers" in existing_config:
                # Merge MCP servers
                existing_servers = existing_config.get("mcpServers", {})
                existing_servers.update(config_dict["mcpServers"])
                config_dict["mcpServers"] = existing_servers
            elif environment == "standard_mcp" and "servers" in existing_config:
                # Merge standard MCP servers
                existing_servers = existing_config.get("servers", {})
                existing_servers.update(config_dict["servers"])
                config_dict["servers"] = existing_servers
                
            # Ensure parent directory exists
            target_location.path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write configuration
            with open(target_location.path, 'w') as f:
                json.dump(config_dict, f, indent=2)
                
            self.console.print(f"✅ Configuration installed successfully")
            return True
            
        except Exception as e:
            raise ConfigError(f"Failed to install configuration: {e}")
            
    def verify_config(self, environment: str = "claude_desktop") -> Dict[str, Any]:
        """
        Verify installed configuration.
        
        Args:
            environment: Environment to verify
            
        Returns:
            Dict[str, Any]: Verification results
        """
        results = {
            "environment": environment,
            "config_found": False,
            "config_path": None,
            "server_configured": False,
            "server_name": None,
            "errors": []
        }
        
        try:
            locations = self.detect_config_locations()
            
            if environment not in locations:
                results["errors"].append(f"Environment '{environment}' not supported")
                return results
                
            # Find existing configuration
            for location in locations[environment]:
                if location.exists:
                    results["config_found"] = True
                    results["config_path"] = str(location.path)
                    
                    try:
                        with open(location.path, 'r') as f:
                            config = json.load(f)
                            
                        # Check for our server
                        if environment == "claude_desktop":
                            servers = config.get("mcpServers", {})
                        elif environment == "standard_mcp":
                            servers = config.get("servers", {})
                        else:
                            servers = {}
                            
                        for server_name, server_config in servers.items():
                            if "castplan" in server_name.lower():
                                results["server_configured"] = True
                                results["server_name"] = server_name
                                break
                                
                    except (json.JSONDecodeError, IOError) as e:
                        results["errors"].append(f"Could not read config: {e}")
                        
                    break  # Found a config file
                    
        except Exception as e:
            results["errors"].append(f"Verification error: {e}")
            
        return results
        
    def list_environments(self) -> Dict[str, Any]:
        """
        List all supported environments and their status.
        
        Returns:
            Dict[str, Any]: Environment information
        """
        locations = self.detect_config_locations()
        
        environment_info = {}
        for env_name, env_locations in locations.items():
            environment_info[env_name] = {
                "supported": True,
                "locations": [
                    {
                        "name": loc.name,
                        "path": str(loc.path),
                        "exists": loc.exists,
                        "writable": loc.writable
                    }
                    for loc in env_locations
                ],
                "available_locations": len([loc for loc in env_locations if loc.writable])
            }
            
        return environment_info