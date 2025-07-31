"""
Node.js Package Installer

Handles automatic installation of the Node.js MCP server package with comprehensive
uv/uvx compatibility. Supports multiple package managers with intelligent fallback,
auto-detection, and cross-platform optimization.
"""

import os
import sys
import subprocess
import shutil
import platform
import json
import tempfile
import time
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple, Union
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.tree import Tree
from packaging import version

from .launcher import NodeJSLauncher, NodeJSNotFoundError


class InstallationError(Exception):
    """Base exception for installation errors"""
    pass


@dataclass
class PackageManager:
    """Information about a detected package manager"""
    name: str
    path: str
    version: str
    install_cmd: List[str]
    global_flag: str = "-g"
    priority: int = 0
    supports_uvx: bool = False
    performance_score: float = 1.0
    reliability_score: float = 1.0
    features: List[str] = field(default_factory=list)
    
@dataclass 
class PythonManager:
    """Information about detected Python package managers (uv/uvx)"""
    name: str
    path: str
    version: str
    supports_nodejs: bool
    install_cmd: List[str]
    run_cmd: List[str]
    priority: int
    features: List[str] = field(default_factory=list)
    
@dataclass
class InstallationPlan:
    """Comprehensive installation plan with fallback strategies"""
    primary_manager: Union[PackageManager, PythonManager]
    fallback_managers: List[Union[PackageManager, PythonManager]]
    installation_type: str  # 'global', 'local', 'uvx', 'ephemeral'
    estimated_time: int  # seconds
    disk_usage: int  # bytes
    success_probability: float  # 0.0 to 1.0


class NodeJSInstaller:
    """
    Installs Node.js packages with automatic package manager detection.
    
    Provides intelligent package manager selection, version validation,
    and cross-platform installation with fallback strategies.
    """
    
    def __init__(self, 
                 nodejs_package: str = "@castplan/automation-mcp",
                 console: Optional[Console] = None):
        self.nodejs_package = nodejs_package
        self.console = console or Console()
        self.detected_managers: List[PackageManager] = []
        self.python_managers: List[PythonManager] = []
        self.installation_history: List[Dict[str, Any]] = []
        self.preferred_managers: List[str] = ["uvx", "uv", "pnpm", "yarn", "npm"]
        self.platform = platform.system().lower()
        self.temp_dir = None
        
    def detect_python_managers(self) -> List[PythonManager]:
        """
        Detect available Python package managers (uv/uvx) with Node.js support.
        
        Returns:
            List[PythonManager]: List of detected Python managers in priority order
        """
        python_managers_config = [
            {
                "name": "uvx",
                "executables": ["uvx", "uvx.exe"] if platform.system() == "Windows" else ["uvx"],
                "supports_nodejs": True,
                "install_cmd": ["--from", "git+https://github.com/Ghostseller/CastPlan_mcp.git", "castplan-mcp"],
                "run_cmd": ["castplan-mcp"],
                "priority": 100,
                "features": ["ephemeral", "isolated", "fast", "no-install"]
            },
            {
                "name": "uv", 
                "executables": ["uv", "uv.exe"] if platform.system() == "Windows" else ["uv"],
                "supports_nodejs": True,
                "install_cmd": ["add", "castplan-automation"], 
                "run_cmd": ["run", "castplan-mcp"],
                "priority": 90,
                "features": ["fast", "reliable", "modern", "lockfile"]
            },
            {
                "name": "pip",
                "executables": ["pip", "pip3"] + (["pip.exe"] if platform.system() == "Windows" else []),
                "supports_nodejs": True,
                "install_cmd": ["install", "castplan-automation"],
                "run_cmd": ["castplan-mcp"],
                "priority": 70,
                "features": ["universal", "stable", "fallback"]
            }
        ]
        
        detected = []
        
        for manager_config in python_managers_config:
            for executable in manager_config["executables"]:
                path = shutil.which(executable)
                if path:
                    try:
                        # Get version
                        result = subprocess.run(
                            [path, "--version"],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        if result.returncode == 0:
                            version_str = result.stdout.strip()
                            
                            manager = PythonManager(
                                name=manager_config["name"],
                                path=path,
                                version=version_str,
                                supports_nodejs=manager_config["supports_nodejs"],
                                install_cmd=manager_config["install_cmd"],
                                run_cmd=manager_config["run_cmd"],
                                priority=manager_config["priority"],
                                features=manager_config["features"]
                            )
                            detected.append(manager)
                            break  # Found this manager, move to next
                            
                    except (subprocess.TimeoutExpired, Exception):
                        continue  # Try next executable
                        
        # Sort by priority (highest first)
        return sorted(detected, key=lambda m: m.priority, reverse=True)
        
    def detect_package_managers(self) -> List[PackageManager]:
        """
        Detect available Node.js package managers with enhanced scoring.
        
        Returns:
            List[PackageManager]: List of detected package managers in priority order
        """
        managers_config = [
            {
                "name": "pnpm",
                "executables": ["pnpm", "pnpm.exe"] if platform.system() == "Windows" else ["pnpm"], 
                "install_cmd": ["add"],
                "global_flag": "-g",
                "priority": 95,
                "performance_score": 1.0,
                "reliability_score": 0.95,
                "features": ["fast", "efficient", "workspace", "lockfile"]
            },
            {
                "name": "yarn", 
                "executables": ["yarn", "yarn.exe"] if platform.system() == "Windows" else ["yarn"],
                "install_cmd": ["global", "add"],
                "global_flag": "",  # yarn uses 'global add' instead of -g
                "priority": 85,
                "performance_score": 0.9,
                "reliability_score": 0.9,
                "features": ["workspace", "offline", "deterministic"]
            },
            {
                "name": "npm",
                "executables": ["npm", "npm.exe"] if platform.system() == "Windows" else ["npm"],
                "install_cmd": ["install"],
                "global_flag": "-g",
                "priority": 80,
                "performance_score": 0.8,
                "reliability_score": 1.0,
                "features": ["universal", "stable", "registry"]
            },
            {
                "name": "bun",
                "executables": ["bun", "bun.exe"] if platform.system() == "Windows" else ["bun"],
                "install_cmd": ["add"],
                "global_flag": "-g",
                "priority": 90,
                "performance_score": 1.0,
                "reliability_score": 0.85,
                "features": ["ultra-fast", "all-in-one", "modern"]
            }
        ]
        
        detected = []
        
        for manager_config in managers_config:
            for executable in manager_config["executables"]:
                path = shutil.which(executable)
                if path:
                    try:
                        # Get version
                        result = subprocess.run(
                            [path, "--version"],
                            capture_output=True,
                            text=True,
                            timeout=10
                        )
                        if result.returncode == 0:
                            version_str = result.stdout.strip()
                            
                            manager = PackageManager(
                                name=manager_config["name"],
                                path=path,
                                version=version_str,
                                install_cmd=manager_config["install_cmd"],
                                global_flag=manager_config["global_flag"],
                                priority=manager_config["priority"],
                                performance_score=manager_config["performance_score"],
                                reliability_score=manager_config["reliability_score"],
                                features=manager_config["features"]
                            )
                            detected.append(manager)
                            break  # Found this manager, move to next
                            
                    except (subprocess.TimeoutExpired, Exception):
                        continue  # Try next executable
                        
        # Sort by priority and performance score
        detected = sorted(detected, key=lambda m: (m.priority, m.performance_score), reverse=True)
        self.detected_managers = detected
        return detected
        
    def check_nodejs_installation(self) -> bool:
        """
        Check if Node.js and the target package are already installed.
        
        Returns:
            bool: True if everything is properly installed
        """
        try:
            launcher = NodeJSLauncher(self.nodejs_package)
            launcher.detect_nodejs()
            
            # Check if package is installed
            package_path = launcher.find_package_installation()
            if package_path:
                self.console.print(f"✅ Package {self.nodejs_package} is already installed")
                return True
                
        except NodeJSNotFoundError as e:
            self.console.print(f"❌ Node.js check failed: {e}")
            
        return False
        
    def install_nodejs_package(self,
                              prefer_manager: Optional[str] = None,
                              global_install: bool = True,
                              force_reinstall: bool = False) -> bool:
        """
        Install the Node.js package using the best available package manager.
        
        Args:
            prefer_manager: Preferred package manager name
            global_install: Install globally vs locally
            force_reinstall: Force reinstallation even if already installed
            
        Returns:
            bool: True if installation succeeded
            
        Raises:
            InstallationError: If installation fails
        """
        # Check if already installed (unless force reinstall)
        if not force_reinstall and self.check_nodejs_installation():
            return True
            
        # Detect available package managers
        if not self.detected_managers:
            self.detect_package_managers()
            
        # Also detect Python managers for alternative installation paths
        if not self.python_managers:
            self.python_managers = self.detect_python_managers()
            
        if not self.detected_managers:
            raise InstallationError("No Node.js package managers found")
            
        # Select manager
        selected_manager = None
        if prefer_manager:
            for manager in self.detected_managers:
                if manager.name == prefer_manager:
                    selected_manager = manager
                    break
                    
        if not selected_manager:
            # Use first available (highest priority)
            selected_manager = self.detected_managers[0]
            
        self.console.print(f"🔧 Installing {self.nodejs_package} using {selected_manager.name}")
        
        # Build install command
        cmd = [selected_manager.path] + selected_manager.install_cmd
        
        if global_install and selected_manager.global_flag:
            if selected_manager.name == "yarn":
                # yarn already has 'global add' in install_cmd
                pass
            else:
                cmd.append(selected_manager.global_flag)
                
        cmd.append(self.nodejs_package)
        
        # Execute installation with progress
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console
            ) as progress:
                task = progress.add_task(f"Installing via {selected_manager.name}...", total=None)
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
                
                progress.update(task, completed=True)
                
            if result.returncode == 0:
                self.console.print(f"✅ Successfully installed {self.nodejs_package}")
                return True
            else:
                error_msg = result.stderr or result.stdout
                raise InstallationError(f"Installation failed: {error_msg}")
                
        except subprocess.TimeoutExpired:
            raise InstallationError("Installation timed out")
        except Exception as e:
            raise InstallationError(f"Installation error: {e}")
            
    def install_with_fallback(self,
                             managers_priority: Optional[List[str]] = None,
                             global_install: bool = True) -> bool:
        """
        Install with automatic fallback to other package managers.
        
        Args:
            managers_priority: List of manager names in priority order
            global_install: Install globally vs locally
            
        Returns:
            bool: True if any installation succeeded
        """
        if not managers_priority:
            managers_priority = ["npm", "yarn", "pnpm"] 
            
        # Detect managers
        if not self.detected_managers:
            self.detect_package_managers()
            
        # Order managers by priority
        ordered_managers = []
        for manager_name in managers_priority:
            for manager in self.detected_managers:
                if manager.name == manager_name:
                    ordered_managers.append(manager)
                    break
                    
        # Add any remaining detected managers
        for manager in self.detected_managers:
            if manager not in ordered_managers:
                ordered_managers.append(manager)
                
        if not ordered_managers:
            raise InstallationError("No package managers available")
            
        # Try each manager in order
        last_error = None
        for manager in ordered_managers:
            try:
                self.console.print(f"🔄 Trying installation with {manager.name}")
                success = self.install_nodejs_package(
                    prefer_manager=manager.name,
                    global_install=global_install
                )
                if success:
                    return True
                    
            except InstallationError as e:
                last_error = e
                self.console.print(f"❌ {manager.name} installation failed: {e}")
                continue
                
        # All managers failed
        raise InstallationError(f"All installation attempts failed. Last error: {last_error}")
        
    def verify_installation(self) -> Dict[str, Any]:
        """
        Verify the installation and return status information.
        
        Returns:
            Dict[str, Any]: Installation verification results
        """
        results = {
            "nodejs_installed": False,
            "nodejs_version": None,
            "package_installed": False,
            "package_path": None,
            "package_version": None,
            "managers_available": len(self.detected_managers),
            "errors": []
        }
        
        try:
            launcher = NodeJSLauncher(self.nodejs_package)
            node_info = launcher.detect_nodejs()
            
            results["nodejs_installed"] = True
            results["nodejs_version"] = node_info.version
            
            # Check package installation
            package_path = launcher.find_package_installation()
            if package_path:
                results["package_installed"] = True
                results["package_path"] = package_path
                
                # Try to get package version
                try:
                    package_json_path = Path(package_path) / "package.json"
                    if package_json_path.exists():
                        with open(package_json_path, 'r') as f:
                            package_data = json.load(f)
                            results["package_version"] = package_data.get("version")
                except Exception as e:
                    results["errors"].append(f"Could not read package version: {e}")
                    
        except NodeJSNotFoundError as e:
            results["errors"].append(f"Node.js not found: {e}")
        except Exception as e:
            results["errors"].append(f"Verification error: {e}")
            
        return results
        
    def get_installation_info(self) -> Dict[str, Any]:
        """
        Get comprehensive installation information.
        
        Returns:
            Dict[str, Any]: Installation environment information
        """
        if not self.detected_managers:
            self.detect_package_managers()
            
        return self.get_comprehensive_info()
        
    def create_installation_plan(self, 
                                prefer_manager: Optional[str] = None,
                                installation_type: str = "auto") -> InstallationPlan:
        """
        Create an intelligent installation plan with fallback strategies.
        
        Args:
            prefer_manager: Preferred package manager name
            installation_type: Installation type (auto, global, local, uvx, ephemeral)
            
        Returns:
            InstallationPlan: Comprehensive installation plan
        """
        # Detect managers if not already done
        if not self.detected_managers:
            self.detect_package_managers()
        if not self.python_managers:
            self.python_managers = self.detect_python_managers()
            
        all_managers = []
        
        # Add Python managers (uv/uvx) with higher priority for modern workflows
        for manager in self.python_managers:
            all_managers.append(manager)
            
        # Add Node.js managers
        for manager in self.detected_managers:
            all_managers.append(manager)
            
        if not all_managers:
            raise InstallationError("No package managers found")
            
        # Select primary manager
        primary_manager = None
        
        # Handle specific installation types
        if installation_type == "uvx" or installation_type == "ephemeral":
            # Prefer uvx for ephemeral installations
            for manager in self.python_managers:
                if manager.name == "uvx":
                    primary_manager = manager
                    break
        elif installation_type == "uv":
            # Prefer uv for project installations
            for manager in self.python_managers:
                if manager.name == "uv":
                    primary_manager = manager
                    break
        elif prefer_manager:
            # Look for preferred manager
            for manager in all_managers:
                if manager.name == prefer_manager:
                    primary_manager = manager
                    break
                    
        if not primary_manager:
            # Auto-select best available manager
            if installation_type == "auto":
                # Prefer modern Python managers for auto installation
                primary_manager = all_managers[0] if all_managers else None
            else:
                # Fallback to first available
                primary_manager = all_managers[0] if all_managers else None
                
        if not primary_manager:
            raise InstallationError("No suitable package manager found")
            
        # Create fallback list (excluding primary)
        fallback_managers = [m for m in all_managers if m != primary_manager]
        
        # Determine actual installation type
        if installation_type == "auto":
            if isinstance(primary_manager, PythonManager) and primary_manager.name == "uvx":
                actual_type = "ephemeral"
            elif isinstance(primary_manager, PythonManager) and primary_manager.name == "uv":
                actual_type = "local"
            else:
                actual_type = "global"
        else:
            actual_type = installation_type
            
        # Estimate installation metrics
        estimated_time = self._estimate_installation_time(primary_manager)
        disk_usage = self._estimate_disk_usage(actual_type)
        success_probability = self._calculate_success_probability(primary_manager, fallback_managers)
        
        return InstallationPlan(
            primary_manager=primary_manager,
            fallback_managers=fallback_managers,
            installation_type=actual_type,
            estimated_time=estimated_time,
            disk_usage=disk_usage,
            success_probability=success_probability
        )
        
    def _estimate_installation_time(self, manager: Union[PackageManager, PythonManager]) -> int:
        """Estimate installation time in seconds"""
        base_time = 30  # Base installation time
        
        if isinstance(manager, PythonManager):
            if manager.name == "uvx":
                return 5  # Very fast ephemeral installation
            elif manager.name == "uv":
                return 15  # Fast modern installer
        
        if isinstance(manager, PackageManager):
            if manager.name == "pnpm":
                return 20  # Fast with good caching
            elif manager.name == "yarn":
                return 25  # Moderately fast
            elif manager.name == "npm":
                return 35  # Slower but reliable
                
        return base_time
        
    def _estimate_disk_usage(self, installation_type: str) -> int:
        """Estimate disk usage in bytes"""
        if installation_type == "ephemeral":
            return 0  # No permanent disk usage
        elif installation_type == "local":
            return 50 * 1024 * 1024  # ~50MB for local installation
        else:
            return 100 * 1024 * 1024  # ~100MB for global installation
            
    def _calculate_success_probability(self, 
                                     primary: Union[PackageManager, PythonManager],
                                     fallbacks: List[Union[PackageManager, PythonManager]]) -> float:
        """Calculate success probability based on manager reliability"""
        if isinstance(primary, PythonManager):
            base_probability = 0.95 if primary.name in ["uvx", "uv"] else 0.9
        else:
            base_probability = primary.reliability_score
            
        # Increase probability based on number of fallbacks
        fallback_boost = min(len(fallbacks) * 0.02, 0.08)
        
        return min(base_probability + fallback_boost, 0.99)
        
    def install_with_uvx(self, 
                        args: Optional[List[str]] = None,
                        ephemeral: bool = True) -> bool:
        """
        Install using uvx for ephemeral execution.
        
        Args:
            args: Additional arguments to pass
            ephemeral: Use ephemeral installation (no persistent install)
            
        Returns:
            bool: True if installation/execution succeeded
        """
        uvx_manager = None
        for manager in self.python_managers:
            if manager.name == "uvx":
                uvx_manager = manager
                break
                
        if not uvx_manager:
            raise InstallationError("uvx not found")
            
        self.console.print(f"🚀 Running with uvx (ephemeral mode)")
        
        # Build uvx command
        cmd = [uvx_manager.path]
        
        if ephemeral:
            cmd.extend(["--from", "git+https://github.com/Ghostseller/CastPlan_mcp.git", "castplan-mcp"])
        else:
            cmd.extend(["castplan-automation"])
            
        if args:
            cmd.extend(args)
            
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console
            ) as progress:
                task = progress.add_task("Executing with uvx...", total=None)
                
                result = subprocess.run(
                    cmd,
                    capture_output=False,  # Allow direct output
                    text=True,
                    timeout=300
                )
                
                progress.update(task, completed=True)
                
            if result.returncode == 0:
                self.console.print("✅ uvx execution completed successfully")
                return True
            else:
                raise InstallationError(f"uvx execution failed with code {result.returncode}")
                
        except subprocess.TimeoutExpired:
            raise InstallationError("uvx execution timed out")
        except Exception as e:
            raise InstallationError(f"uvx execution error: {e}")
            
    def install_with_uv(self, 
                       project_mode: bool = True,
                       args: Optional[List[str]] = None) -> bool:
        """
        Install using uv for modern Python dependency management.
        
        Args:
            project_mode: Install in project mode vs global
            args: Additional arguments
            
        Returns:
            bool: True if installation succeeded
        """
        uv_manager = None
        for manager in self.python_managers:
            if manager.name == "uv":
                uv_manager = manager
                break
                
        if not uv_manager:
            raise InstallationError("uv not found")
            
        self.console.print(f"📦 Installing with uv {'(project mode)' if project_mode else '(global)'}")
        
        # Build uv command
        cmd = [uv_manager.path]
        
        if project_mode:
            cmd.extend(["add", "castplan-automation"])
        else:
            cmd.extend(["tool", "install", "castplan-automation"])
            
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                console=self.console
            ) as progress:
                task = progress.add_task("Installing with uv...", total=100)
                
                # Start installation
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Monitor progress
                while process.poll() is None:
                    progress.advance(task, 1)
                    time.sleep(0.1)
                    
                progress.update(task, completed=100)
                
                stdout, stderr = process.communicate()
                
            if process.returncode == 0:
                self.console.print("✅ uv installation completed successfully")
                return True
            else:
                error_msg = stderr or stdout
                raise InstallationError(f"uv installation failed: {error_msg}")
                
        except Exception as e:
            raise InstallationError(f"uv installation error: {e}")
            
    def smart_install(self, 
                     installation_type: str = "auto",
                     prefer_manager: Optional[str] = None,
                     interactive: bool = True) -> bool:
        """
        Intelligent installation with automatic tool selection and fallback.
        
        Args:
            installation_type: Installation type preference
            prefer_manager: Preferred package manager
            interactive: Allow interactive prompts
            
        Returns:
            bool: True if installation succeeded
        """
        # Create installation plan
        try:
            plan = self.create_installation_plan(prefer_manager, installation_type)
        except InstallationError as e:
            self.console.print(f"❌ Could not create installation plan: {e}")
            return False
            
        # Display installation plan if interactive
        if interactive:
            self._display_installation_plan(plan)
            
        # Execute installation plan
        return self._execute_installation_plan(plan)
        
    def _display_installation_plan(self, plan: InstallationPlan) -> None:
        """Display the installation plan to user"""
        panel_content = []
        
        # Primary manager info
        if isinstance(plan.primary_manager, PythonManager):
            manager_type = "Python Manager"
            features = ", ".join(plan.primary_manager.features)
        else:
            manager_type = "Node.js Manager"
            features = ", ".join(plan.primary_manager.features)
            
        panel_content.extend([
            f"[bold cyan]Primary Manager:[/bold cyan] {plan.primary_manager.name} ({manager_type})",
            f"[dim]Version:[/dim] {plan.primary_manager.version}",
            f"[dim]Features:[/dim] {features}",
            f"[dim]Installation Type:[/dim] {plan.installation_type}",
            f"[dim]Estimated Time:[/dim] {plan.estimated_time}s",
            f"[dim]Success Probability:[/dim] {plan.success_probability:.1%}",
        ])
        
        if plan.fallback_managers:
            panel_content.append(f"[dim]Fallbacks:[/dim] {len(plan.fallback_managers)} available")
            
        self.console.print(Panel(
            "\n".join(panel_content),
            title="[bold blue]Installation Plan[/bold blue]",
            border_style="blue"
        ))
        
    def _execute_installation_plan(self, plan: InstallationPlan) -> bool:
        """Execute the installation plan with fallback handling"""
        primary = plan.primary_manager
        
        # Try primary manager
        try:
            if isinstance(primary, PythonManager):
                if primary.name == "uvx":
                    return self.install_with_uvx()
                elif primary.name == "uv":
                    return self.install_with_uv()
                else:
                    # Use pip or other Python manager
                    return self._install_with_python_manager(primary)
            else:
                # Use Node.js package manager
                return self.install_nodejs_package(
                    prefer_manager=primary.name,
                    global_install=(plan.installation_type == "global")
                )
                
        except InstallationError as e:
            self.console.print(f"⚠️  Primary installation failed: {e}")
            
            # Try fallback managers
            for fallback in plan.fallback_managers:
                try:
                    self.console.print(f"🔄 Trying fallback: {fallback.name}")
                    
                    if isinstance(fallback, PythonManager):
                        if fallback.name == "uvx":
                            return self.install_with_uvx()
                        elif fallback.name == "uv":
                            return self.install_with_uv()
                        else:
                            return self._install_with_python_manager(fallback)
                    else:
                        return self.install_nodejs_package(
                            prefer_manager=fallback.name,
                            global_install=(plan.installation_type == "global")
                        )
                        
                except InstallationError as fallback_error:
                    self.console.print(f"❌ Fallback {fallback.name} failed: {fallback_error}")
                    continue
                    
            # All methods failed
            raise InstallationError("All installation methods failed")
            
        return False
        
    def _install_with_python_manager(self, manager: PythonManager) -> bool:
        """Install using a generic Python package manager"""
        cmd = [manager.path] + manager.install_cmd
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                self.console.print(f"✅ Installation with {manager.name} succeeded")
                return True
            else:
                error_msg = result.stderr or result.stdout
                raise InstallationError(f"Installation failed: {error_msg}")
                
        except subprocess.TimeoutExpired:
            raise InstallationError(f"Installation with {manager.name} timed out")
        except Exception as e:
            raise InstallationError(f"Installation with {manager.name} error: {e}")
            
    def get_comprehensive_info(self) -> Dict[str, Any]:
        """Get comprehensive installation environment information"""
        if not self.detected_managers:
            self.detect_package_managers()
        if not self.python_managers:
            self.python_managers = self.detect_python_managers()
            
        return {
            "platform": {
                "system": platform.system(),
                "version": platform.version(),
                "architecture": platform.architecture()[0],
                "python_version": platform.python_version()
            },
            "python_managers": [
                {
                    "name": manager.name,
                    "path": manager.path,
                    "version": manager.version,
                    "priority": manager.priority,
                    "features": manager.features,
                    "supports_nodejs": manager.supports_nodejs
                }
                for manager in self.python_managers
            ],
            "nodejs_managers": [
                {
                    "name": manager.name,
                    "path": manager.path,
                    "version": manager.version,
                    "priority": manager.priority,
                    "performance_score": manager.performance_score,
                    "reliability_score": manager.reliability_score,
                    "features": manager.features
                }
                for manager in self.detected_managers
            ],
            "environment": {
                "PATH": os.environ.get("PATH", ""),
                "NODE_PATH": os.environ.get("NODE_PATH", ""),
                "NPM_CONFIG_PREFIX": os.environ.get("NPM_CONFIG_PREFIX", ""),
                "UV_CACHE_DIR": os.environ.get("UV_CACHE_DIR", ""),
                "UV_CONFIG_FILE": os.environ.get("UV_CONFIG_FILE", "")
            },
            "capabilities": {
                "uvx_available": any(m.name == "uvx" for m in self.python_managers),
                "uv_available": any(m.name == "uv" for m in self.python_managers),
                "modern_nodejs_managers": len([m for m in self.detected_managers if m.name in ["pnpm", "yarn", "bun"]]),
                "total_managers": len(self.python_managers) + len(self.detected_managers)
            }
        }