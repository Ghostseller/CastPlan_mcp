"""
Node.js Process Launcher with uv/uvx Support

Handles launching and managing the Node.js MCP server process from Python with
comprehensive uv/uvx integration, ephemeral execution capabilities, and 
enhanced cross-platform compatibility for modern Python workflows.
"""

import os
import sys
import subprocess
import shutil
import json
import platform
import tempfile
import time
import signal
from pathlib import Path
from typing import Optional, Dict, Any, List, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from contextlib import contextmanager

import psutil
from packaging import version
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel


class LaunchError(Exception):
    """Base exception for launcher errors"""
    pass


class NodeJSNotFoundError(LaunchError):
    """Raised when Node.js is not found or version is incompatible"""
    pass


class UvxNotFoundError(LaunchError):
    """Raised when uvx is not found or not available"""
    pass


class EphemeralExecutionError(LaunchError):
    """Raised when ephemeral execution fails"""
    pass


class LaunchMethod(Enum):
    """Available launch methods"""
    NODEJS_DIRECT = "nodejs_direct"
    UVX_EPHEMERAL = "uvx_ephemeral"
    UV_PROJECT = "uv_project"
    PYTHON_BRIDGE = "python_bridge"


@dataclass
class LaunchConfiguration:
    """Configuration for launching the MCP server"""
    method: LaunchMethod
    nodejs_package: str
    python_package: str = "castplan-ultimate-automation"
    args: List[str] = field(default_factory=list)
    env: Dict[str, str] = field(default_factory=dict)
    cwd: Optional[str] = None
    timeout: int = 300
    ephemeral: bool = False
    auto_install: bool = True
    fallback_enabled: bool = True


@dataclass
class NodeInfo:
    """Information about detected Node.js installation"""
    path: str
    version: str
    npm_path: Optional[str] = None
    global_path: Optional[str] = None


class NodeJSLauncher:
    """
    Enhanced Node.js MCP server launcher with comprehensive uv/uvx support.
    
    Provides cross-platform process management with automatic detection,
    intelligent method selection, ephemeral execution, and error recovery.
    """
    
    def __init__(self, 
                 nodejs_package: str = "@castplan/ultimate-automation-mcp",
                 python_package: str = "castplan-ultimate-automation",
                 min_version: str = "18.0.0",
                 console: Optional[Console] = None):
        self.nodejs_package = nodejs_package
        self.python_package = python_package
        self.min_version = min_version
        self.console = console or Console()
        self.process: Optional[subprocess.Popen] = None
        self.node_info: Optional[NodeInfo] = None
        self.launch_config: Optional[LaunchConfiguration] = None
        self.available_methods: List[LaunchMethod] = []
        self.platform = platform.system().lower()
        self.temp_dirs: List[str] = []
        
    def detect_nodejs(self) -> NodeInfo:
        """
        Detect Node.js installation and validate version.
        
        Returns:
            NodeInfo: Information about detected Node.js installation
            
        Raises:
            NodeJSNotFoundError: If Node.js not found or incompatible
        """
        # Try common Node.js executables
        node_names = ["node", "nodejs"]
        if platform.system() == "Windows":
            node_names = ["node.exe", "nodejs.exe"]
            
        node_path = None
        for name in node_names:
            path = shutil.which(name)
            if path:
                node_path = path
                break
                
        if not node_path:
            raise NodeJSNotFoundError("Node.js not found in PATH")
            
        # Check version
        try:
            result = subprocess.run(
                [node_path, "--version"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            if result.returncode != 0:
                raise NodeJSNotFoundError(f"Failed to get Node.js version: {result.stderr}")
                
            version_str = result.stdout.strip().lstrip('v')
            if version.parse(version_str) < version.parse(self.min_version):
                raise NodeJSNotFoundError(
                    f"Node.js version {version_str} is below minimum {self.min_version}"
                )
                
        except subprocess.TimeoutExpired:
            raise NodeJSNotFoundError("Timeout checking Node.js version")
        except Exception as e:
            raise NodeJSNotFoundError(f"Error checking Node.js version: {e}")
            
        # Detect npm
        npm_path = shutil.which("npm")
        if platform.system() == "Windows" and not npm_path:
            npm_path = shutil.which("npm.exe")
            
        # Get global installation path
        global_path = None
        if npm_path:
            try:
                result = subprocess.run(
                    [npm_path, "root", "-g"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    global_path = result.stdout.strip()
            except:
                pass  # Not critical
                
        self.node_info = NodeInfo(
            path=node_path,
            version=version_str,
            npm_path=npm_path,
            global_path=global_path
        )
        
        return self.node_info
        
    def find_package_installation(self) -> Optional[str]:
        """
        Find the installed Node.js package.
        
        Returns:
            Optional[str]: Path to package installation or None if not found
        """
        if not self.node_info:
            self.detect_nodejs()
            
        # Search locations in order of preference
        search_paths = []
        
        # Global installation
        if self.node_info.global_path:
            search_paths.append(Path(self.node_info.global_path) / self.nodejs_package)
            
        # Platform-specific global locations
        system = platform.system()
        if system == "Windows":
            # Windows npm global locations
            appdata = os.environ.get("APPDATA", "")
            if appdata:
                search_paths.append(Path(appdata) / "npm" / "node_modules" / self.nodejs_package)
            
            # Alternative Windows locations
            program_files = os.environ.get("ProgramFiles", "")
            if program_files:
                search_paths.append(Path(program_files) / "nodejs" / "node_modules" / self.nodejs_package)
                
        elif system == "Darwin":
            # macOS locations
            search_paths.extend([
                Path("/usr/local/lib/node_modules") / self.nodejs_package,
                Path.home() / ".npm-global" / "lib" / "node_modules" / self.nodejs_package,
                Path("/opt/homebrew/lib/node_modules") / self.nodejs_package
            ])
            
        elif system == "Linux":
            # Linux locations
            search_paths.extend([
                Path("/usr/lib/node_modules") / self.nodejs_package,
                Path("/usr/local/lib/node_modules") / self.nodejs_package,
                Path.home() / ".npm-global" / "lib" / "node_modules" / self.nodejs_package,
                Path.home() / ".local" / "lib" / "node_modules" / self.nodejs_package
            ])
            
        # Check each path
        for path in search_paths:
            if path.exists() and (path / "package.json").exists():
                return str(path)
                
        return None
        
    def detect_available_launch_methods(self) -> List[LaunchMethod]:
        """
        Detect all available launch methods in priority order.
        
        Returns:
            List[LaunchMethod]: Available launch methods sorted by preference
        """
        methods = []
        
        # Check for uvx (highest priority for ephemeral execution)
        if self._check_uvx_available():
            methods.append(LaunchMethod.UVX_EPHEMERAL)
            
        # Check for uv (modern Python package manager)
        if self._check_uv_available():
            methods.append(LaunchMethod.UV_PROJECT)
            
        # Check for Node.js direct execution
        try:
            self.detect_nodejs()
            if self.find_package_installation():
                methods.append(LaunchMethod.NODEJS_DIRECT)
        except NodeJSNotFoundError:
            pass
            
        # Python bridge method (pip-based) is always available
        methods.append(LaunchMethod.PYTHON_BRIDGE)
        
        self.available_methods = methods
        return methods
        
    def _check_uvx_available(self) -> bool:
        """Check if uvx is available"""
        uvx_path = shutil.which("uvx")
        if not uvx_path and self.platform == "windows":
            uvx_path = shutil.which("uvx.exe")
        return uvx_path is not None
        
    def _check_uv_available(self) -> bool:
        """Check if uv is available"""
        uv_path = shutil.which("uv")
        if not uv_path and self.platform == "windows":
            uv_path = shutil.which("uv.exe")
        return uv_path is not None
        
    def create_launch_configuration(self,
                                  preferred_method: Optional[LaunchMethod] = None,
                                  ephemeral: bool = False,
                                  args: Optional[List[str]] = None,
                                  env: Optional[Dict[str, str]] = None) -> LaunchConfiguration:
        """
        Create an intelligent launch configuration.
        
        Args:
            preferred_method: Preferred launch method
            ephemeral: Use ephemeral execution (no persistent installation)
            args: Additional arguments
            env: Environment variables
            
        Returns:
            LaunchConfiguration: Optimized launch configuration
        """
        # Detect available methods if not already done
        if not self.available_methods:
            self.detect_available_launch_methods()
            
        # Select launch method
        selected_method = None
        
        if ephemeral and LaunchMethod.UVX_EPHEMERAL in self.available_methods:
            selected_method = LaunchMethod.UVX_EPHEMERAL
        elif preferred_method and preferred_method in self.available_methods:
            selected_method = preferred_method
        elif self.available_methods:
            selected_method = self.available_methods[0]  # Use highest priority
        else:
            raise LaunchError("No launch methods available")
            
        config = LaunchConfiguration(
            method=selected_method,
            nodejs_package=self.nodejs_package,
            python_package=self.python_package,
            args=args or [],
            env=env or {},
            ephemeral=ephemeral
        )
        
        self.launch_config = config
        return config
        
    def launch_with_uvx(self, 
                       args: Optional[List[str]] = None,
                       env: Optional[Dict[str, str]] = None,
                       timeout: int = 300) -> subprocess.Popen:
        """
        Launch using uvx for ephemeral execution.
        
        Args:
            args: Additional arguments
            env: Environment variables
            timeout: Execution timeout
            
        Returns:
            subprocess.Popen: The launched process
        """
        uvx_path = shutil.which("uvx")
        if not uvx_path and self.platform == "windows":
            uvx_path = shutil.which("uvx.exe")
            
        if not uvx_path:
            raise UvxNotFoundError("uvx not found in PATH")
            
        self.console.print("🚀 Launching with uvx (ephemeral mode)")
        
        # Build uvx command
        cmd = [uvx_path, "--from", self.python_package, "castplan-ultimate"]
        
        if args:
            cmd.extend(args)
            
        # Setup environment
        launch_env = os.environ.copy()
        if env:
            launch_env.update(env)
            
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console
            ) as progress:
                task = progress.add_task("Starting uvx execution...", total=None)
                
                process = subprocess.Popen(
                    cmd,
                    env=launch_env,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Give it a moment to start
                time.sleep(1)
                progress.update(task, completed=True)
                
            self.process = process
            self.console.print("✅ uvx execution started successfully")
            return process
            
        except Exception as e:
            raise EphemeralExecutionError(f"Failed to launch with uvx: {e}")
            
    def launch_with_uv(self,
                      args: Optional[List[str]] = None,
                      env: Optional[Dict[str, str]] = None,
                      project_mode: bool = True) -> subprocess.Popen:
        """
        Launch using uv for project-based execution.
        
        Args:
            args: Additional arguments
            env: Environment variables
            project_mode: Use project mode vs global tool
            
        Returns:
            subprocess.Popen: The launched process
        """
        uv_path = shutil.which("uv")
        if not uv_path and self.platform == "windows":
            uv_path = shutil.which("uv.exe")
            
        if not uv_path:
            raise LaunchError("uv not found in PATH")
            
        self.console.print("📦 Launching with uv")
        
        # Build uv command
        if project_mode:
            cmd = [uv_path, "run", "castplan-ultimate"]
        else:
            cmd = [uv_path, "tool", "run", "castplan-ultimate"]
            
        if args:
            cmd.extend(args)
            
        # Setup environment
        launch_env = os.environ.copy()
        if env:
            launch_env.update(env)
            
        try:
            process = subprocess.Popen(
                cmd,
                env=launch_env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.process = process
            self.console.print("✅ uv execution started successfully")
            return process
            
        except Exception as e:
            raise LaunchError(f"Failed to launch with uv: {e}")
            
    def smart_launch(self,
                    preferred_method: Optional[LaunchMethod] = None,
                    ephemeral: bool = False,
                    args: Optional[List[str]] = None,
                    env: Optional[Dict[str, str]] = None,
                    auto_install: bool = True) -> subprocess.Popen:
        """
        Intelligent launch with automatic method selection and fallback.
        
        Args:
            preferred_method: Preferred launch method
            ephemeral: Use ephemeral execution
            args: Additional arguments
            env: Environment variables
            auto_install: Automatically install if needed
            
        Returns:
            subprocess.Popen: The launched process
        """
        # Create launch configuration
        config = self.create_launch_configuration(
            preferred_method=preferred_method,
            ephemeral=ephemeral,
            args=args,
            env=env
        )
        
        # Display launch plan
        self._display_launch_plan(config)
        
        # Execute launch with fallback
        return self._execute_launch_plan(config, auto_install)
        
    def _display_launch_plan(self, config: LaunchConfiguration) -> None:
        """Display the launch plan to user"""
        method_descriptions = {
            LaunchMethod.UVX_EPHEMERAL: "uvx (ephemeral, no installation)",
            LaunchMethod.UV_PROJECT: "uv (modern Python package manager)",
            LaunchMethod.NODEJS_DIRECT: "Node.js (direct execution)",
            LaunchMethod.PYTHON_BRIDGE: "pip (traditional Python package manager)"
        }
        
        panel_content = [
            f"[bold cyan]Launch Method:[/bold cyan] {method_descriptions.get(config.method, config.method.value)}",
            f"[dim]Ephemeral:[/dim] {'Yes' if config.ephemeral else 'No'}",
            f"[dim]Package:[/dim] {config.python_package if config.method != LaunchMethod.NODEJS_DIRECT else config.nodejs_package}",
        ]
        
        if config.args:
            panel_content.append(f"[dim]Arguments:[/dim] {' '.join(config.args)}")
            
        self.console.print(Panel(
            "\n".join(panel_content),
            title="[bold blue]Launch Plan[/bold blue]",
            border_style="blue"
        ))
        
    def _execute_launch_plan(self, config: LaunchConfiguration, auto_install: bool) -> subprocess.Popen:
        """Execute the launch plan with fallback handling"""
        try:
            # Try primary method
            if config.method == LaunchMethod.UVX_EPHEMERAL:
                return self.launch_with_uvx(config.args, config.env)
            elif config.method == LaunchMethod.UV_PROJECT:
                return self.launch_with_uv(config.args, config.env)
            elif config.method == LaunchMethod.NODEJS_DIRECT:
                return self.launch_server(config.args, config.env, config.cwd)
            elif config.method == LaunchMethod.PYTHON_BRIDGE:
                # Use traditional pip-based approach
                return self._launch_with_pip(config.args, config.env)
            else:
                raise LaunchError(f"Unsupported launch method: {config.method}")
                
        except (LaunchError, UvxNotFoundError, EphemeralExecutionError) as e:
            self.console.print(f"⚠️  Primary launch method failed: {e}")
            
            if not config.fallback_enabled:
                raise
                
            # Try fallback methods
            for fallback_method in self.available_methods:
                if fallback_method == config.method:
                    continue  # Skip the method that just failed
                    
                try:
                    self.console.print(f"🔄 Trying fallback: {fallback_method.value}")
                    
                    if fallback_method == LaunchMethod.NODEJS_DIRECT:
                        return self.launch_server(config.args, config.env, config.cwd)
                    elif fallback_method == LaunchMethod.PYTHON_BRIDGE:
                        return self._launch_with_pip(config.args, config.env)
                    # Add other fallback methods as needed
                        
                except Exception as fallback_error:
                    self.console.print(f"❌ Fallback {fallback_method.value} failed: {fallback_error}")
                    continue
                    
            # All methods failed
            raise LaunchError("All launch methods failed")
            
    def _launch_with_pip(self, args: Optional[List[str]], env: Optional[Dict[str, str]]) -> subprocess.Popen:
        """Launch using pip-installed package (fallback method)"""
        # This would use the traditional pip-based installation
        # and then launch the CLI command directly
        cmd = ["castplan-ultimate"]
        if args:
            cmd.extend(args)
            
        launch_env = os.environ.copy()
        if env:
            launch_env.update(env)
            
        try:
            process = subprocess.Popen(
                cmd,
                env=launch_env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.process = process
            return process
            
        except Exception as e:
            raise LaunchError(f"Failed to launch with pip: {e}")
            
    @contextmanager
    def ephemeral_execution(self, args: Optional[List[str]] = None):
        """
        Context manager for ephemeral execution with automatic cleanup.
        
        Args:
            args: Arguments to pass to the server
            
        Yields:
            subprocess.Popen: The ephemeral process
        """
        if not self._check_uvx_available():
            raise UvxNotFoundError("uvx not available for ephemeral execution")
            
        process = None
        try:
            process = self.launch_with_uvx(args, ephemeral=True)
            yield process
        finally:
            if process:
                self._cleanup_ephemeral_process(process)
                
    def _cleanup_ephemeral_process(self, process: subprocess.Popen) -> None:
        """Clean up ephemeral process and temporary resources"""
        try:
            if process.poll() is None:  # Process is still running
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
        except Exception as e:
            self.console.print(f"⚠️  Warning: Could not clean up ephemeral process: {e}")
            
        # Clean up any temporary directories
        for temp_dir in self.temp_dirs:
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except Exception:
                pass  # Ignore cleanup errors
                
        self.temp_dirs.clear()
        
    def get_enhanced_server_info(self) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive information about the running server.
        
        Returns:
            Optional[Dict]: Enhanced server information or None if not running
        """
        base_info = self.get_server_info()
        if not base_info:
            return None
            
        enhanced_info = base_info.copy()
        enhanced_info.update({
            "launch_method": self.launch_config.method.value if self.launch_config else "unknown",
            "ephemeral": self.launch_config.ephemeral if self.launch_config else False,
            "python_package": self.python_package,
            "nodejs_package": self.nodejs_package,
            "available_methods": [method.value for method in self.available_methods],
            "platform": self.platform
        })
        
        return enhanced_info
        
    def launch_server(self, 
                     args: Optional[List[str]] = None,
                     env: Optional[Dict[str, str]] = None,
                     cwd: Optional[str] = None) -> subprocess.Popen:
        """
        Launch the Node.js MCP server.
        
        Args:
            args: Additional arguments to pass to the server
            env: Environment variables
            cwd: Working directory
            
        Returns:
            subprocess.Popen: The launched process
            
        Raises:
            LaunchError: If launch fails
        """
        if not self.node_info:
            self.detect_nodejs()
            
        # Find package installation
        package_path = self.find_package_installation()
        if not package_path:
            raise LaunchError(f"Package {self.nodejs_package} not found")
            
        # Build command
        main_script = Path(package_path) / "dist" / "index.js"
        if not main_script.exists():
            raise LaunchError(f"Main script not found: {main_script}")
            
        cmd = [self.node_info.path, str(main_script)]
        if args:
            cmd.extend(args)
            
        # Setup environment
        launch_env = os.environ.copy()
        if env:
            launch_env.update(env)
            
        # Launch process
        try:
            self.process = subprocess.Popen(
                cmd,
                env=launch_env,
                cwd=cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
            
            return self.process
            
        except Exception as e:
            raise LaunchError(f"Failed to launch server: {e}")
            
    def is_running(self) -> bool:
        """Check if the server process is running"""
        if not self.process:
            return False
            
        return self.process.poll() is None
        
    def stop_server(self, timeout: int = 10) -> bool:
        """
        Stop the server process gracefully.
        
        Args:
            timeout: Timeout in seconds for graceful shutdown
            
        Returns:
            bool: True if stopped successfully
        """
        if not self.process:
            return True
            
        if not self.is_running():
            return True
            
        try:
            # Try graceful shutdown
            self.process.terminate()
            try:
                self.process.wait(timeout=timeout)
                return True
            except subprocess.TimeoutExpired:
                # Force kill if graceful shutdown fails
                self.process.kill()
                self.process.wait(timeout=5)
                return True
                
        except Exception:
            return False
        finally:
            self.process = None
            
    def get_server_info(self) -> Optional[Dict[str, Any]]:
        """
        Get information about the running server.
        
        Returns:
            Optional[Dict]: Server information or None if not running
        """
        if not self.is_running():
            return None
            
        try:
            proc = psutil.Process(self.process.pid)
            return {
                "pid": proc.pid,
                "status": proc.status(),
                "cpu_percent": proc.cpu_percent(),
                "memory_info": proc.memory_info()._asdict(),
                "create_time": proc.create_time(),
                "cmdline": proc.cmdline()
            }
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return None
            
    def __enter__(self):
        """Context manager entry"""
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup process and resources"""
        self.stop_server()
        
        # Clean up temporary directories
        for temp_dir in self.temp_dirs:
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except Exception:
                pass  # Ignore cleanup errors
                
        self.temp_dirs.clear()