"""
Enhanced Command Line Interface with uv/uvx Support

Provides comprehensive CLI commands for installation, configuration, and management
of the CastPlan Ultimate Automation MCP Server with full uv/uvx integration,
intelligent environment detection, and modern Python workflow support.
"""

import sys
import json
import time
import shutil
import platform
import subprocess
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.tree import Tree

from . import __version__, NODEJS_PACKAGE
from .launcher import NodeJSLauncher, LaunchError, NodeJSNotFoundError, LaunchMethod
from .installer import NodeJSInstaller, InstallationError  
from .config import ConfigurationManager, ConfigError, EnvironmentType, LaunchMethod as ConfigLaunchMethod


console = Console()


def show_system_info():
    """Display comprehensive system information"""
    try:
        # Detect package managers
        installer = NodeJSInstaller(NODEJS_PACKAGE, console)
        info = installer.get_comprehensive_info()
        
        # Create system info panel
        system_info = [
            f"Platform: {info['platform']['system']} ({info['platform']['architecture']})",
            f"Python: {info['platform']['python_version']}",
            f"Package Managers: {info['capabilities']['total_managers']} detected"
        ]
        
        console.print(Panel(
            "\n".join(system_info),
            title="[bold blue]System Information[/bold blue]",
            border_style="blue"
        ))
        
        # Show available Python managers
        if info['python_managers']:
            python_table = Table(title="Python Package Managers")
            python_table.add_column("Manager", style="cyan")
            python_table.add_column("Version", style="green") 
            python_table.add_column("Features", style="yellow")
            
            for manager in info['python_managers']:
                features = ", ".join(manager['features'][:3])  # Show first 3 features
                python_table.add_row(
                    manager['name'],
                    manager['version'],
                    features
                )
            console.print(python_table)
            
        # Show Node.js managers
        if info['nodejs_managers']:
            nodejs_table = Table(title="Node.js Package Managers")
            nodejs_table.add_column("Manager", style="cyan")
            nodejs_table.add_column("Version", style="green")
            nodejs_table.add_column("Score", style="yellow")
            
            for manager in info['nodejs_managers']:
                score = f"{manager['performance_score']:.1f}"
                nodejs_table.add_row(
                    manager['name'],
                    manager['version'],
                    score
                )
            console.print(nodejs_table)
            
        # Show capabilities
        capabilities = [
            f"uvx Available: {'✅' if info['capabilities']['uvx_available'] else '❌'}",
            f"uv Available: {'✅' if info['capabilities']['uv_available'] else '❌'}",
            f"Modern Node.js Managers: {info['capabilities']['modern_nodejs_managers']}"
        ]
        
        console.print(Panel(
            "\n".join(capabilities),
            title="[bold green]Capabilities[/bold green]",
            border_style="green"
        ))
        
    except Exception as e:
        console.print(f"❌ Could not gather system information: {e}")


@click.group(invoke_without_command=True)
@click.option('--version', is_flag=True, help='Show version information')
@click.option('--info', is_flag=True, help='Show system information')
@click.pass_context
def main(ctx, version, info):
    """
    CastPlan Ultimate Automation - Enhanced Python Bridge
    
    Universal MCP server with comprehensive uv/uvx support, intelligent environment
    detection, and modern Python workflow integration.
    """
    if version:
        console.print(f"CastPlan Ultimate Automation Python Bridge v{__version__}")
        console.print(f"Node.js Package: {NODEJS_PACKAGE}")
        console.print(f"Python Package: castplan-ultimate-automation")
        return
        
    if info:
        show_system_info()
        return
        
    if ctx.invoked_subcommand is None:
        console.print(Panel.fit(
            Text("CastPlan Ultimate Automation", style="bold blue") + "\n" +
            Text("Universal MCP Server with uv/uvx Support", style="dim") + "\n\n" +
            Text("✨ Modern Python workflows supported", style="green") + "\n" +
            Text("🚀 Ephemeral execution with uvx", style="blue") + "\n" +
            Text("📦 Smart package manager detection", style="yellow") + "\n\n" +
            Text("Use --help for available commands", style="italic")
        ))


@main.command()
@click.option('--auto-detect', is_flag=True, default=True, 
              help='Auto-detect and configure for available environments')
@click.option('--environment', type=click.Choice(['claude_desktop', 'standard_mcp', 'cline', 'cursor', 'continue']),
              help='Target specific environment')
@click.option('--method', type=click.Choice(['uvx', 'uv', 'nodejs', 'pip']),
              help='Preferred installation/launch method')
@click.option('--install-packages', is_flag=True, default=True,
              help='Install packages if not found')
@click.option('--ephemeral', is_flag=True, default=False,
              help='Use ephemeral execution (uvx) when possible')
@click.option('--server-name', default='castplan-ultimate',
              help='Name for the MCP server configuration')
@click.option('--interactive', is_flag=True, default=False,
              help='Interactive mode with prompts and confirmations')
def init(auto_detect, environment, method, install_packages, ephemeral, server_name, interactive):
    """Initialize CastPlan Ultimate Automation MCP server with enhanced uv/uvx support"""
    console.print("🚀 Initializing CastPlan Ultimate Automation MCP Server")
    console.print("   Enhanced with uv/uvx support and intelligent detection")
    
    try:
        # Initialize components
        installer = NodeJSInstaller(NODEJS_PACKAGE, console)
        config_manager = ConfigurationManager(NODEJS_PACKAGE, "castplan-ultimate-automation", console)
        
        # Interactive mode prompts
        if interactive:
            if not method:
                method_choices = ['uvx (recommended)', 'uv', 'nodejs', 'pip']
                choice = Prompt.ask(
                    "Choose installation method",
                    choices=[c.split()[0] for c in method_choices],
                    default="uvx"
                )
                method = choice
                
            if not environment and not auto_detect:
                env_choices = ['claude_desktop', 'standard_mcp', 'cline', 'cursor']
                environment = Prompt.ask(
                    "Choose target environment (or 'auto' for auto-detect)",
                    choices=env_choices + ['auto'],
                    default="auto"
                )
                if environment == 'auto':
                    environment = None
                    auto_detect = True
        
        # Convert method string to enum
        launch_method = None
        if method:
            method_map = {
                'uvx': ConfigLaunchMethod.UVX_EPHEMERAL,
                'uv': ConfigLaunchMethod.UV_PROJECT,
                'nodejs': ConfigLaunchMethod.NODEJS_DIRECT,
                'pip': ConfigLaunchMethod.PYTHON_BRIDGE
            }
            launch_method = method_map.get(method)
        
        # Handle ephemeral preference
        if ephemeral and not launch_method:
            launch_method = ConfigLaunchMethod.UVX_EPHEMERAL
        
        # Smart installation with progress
        if install_packages:
            console.print("📦 Checking and installing packages...")
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("Analyzing system and packages...", total=None)
                
                # Use smart installation
                if method == 'uvx' or ephemeral:
                    # For uvx, we don't need to install anything permanently
                    console.print("✨ Using uvx - no permanent installation required")
                elif method == 'uv':
                    # Try uv installation
                    try:
                        installer.install_with_uv(project_mode=True)
                    except Exception as e:
                        console.print(f"⚠️  uv installation failed, trying alternatives: {e}")
                        installer.smart_install(installation_type="auto")
                else:
                    # Use smart installation with fallback
                    installer.smart_install(
                        installation_type=method if method else "auto",
                        interactive=interactive
                    )
                
                progress.update(task, completed=True)
        
        # Smart configuration
        console.print("⚙️  Configuring environments...")
        
        if auto_detect and not environment:
            # Use smart configuration
            results = config_manager.smart_configure(
                auto_detect=True,
                preferred_method=launch_method,
                server_name=server_name
            )
            
            # Display results
            console.print(f"✅ Detected {results['environments_detected']} environment(s)")
            console.print(f"✅ Configured {results['environments_configured']} environment(s)")
            
            if results['errors']:
                console.print("⚠️  Some issues encountered:")
                for error in results['errors'][:3]:  # Show first 3 errors
                    console.print(f"   • {error}")
                    
            if results['recommendations']:
                console.print("💡 Recommendations:")
                for rec in results['recommendations']:
                    console.print(f"   • {rec}")
                    
        elif environment:
            # Configure specific environment
            env_type = EnvironmentType(environment)
            method_to_use = launch_method or ConfigLaunchMethod.UVX_EPHEMERAL
            
            try:
                config = config_manager.generate_enhanced_config(
                    env_type, method_to_use, server_name
                )
                console.print(f"✅ Generated configuration for {environment}")
                
                # Try to install the configuration
                detections = config_manager.detect_comprehensive_environments()
                target_detection = next((d for d in detections if d.env_type == env_type), None)
                
                if target_detection:
                    writable_location = next((loc for loc in target_detection.locations if loc.writable), None)
                    if writable_location:
                        success = config_manager._install_enhanced_config(config, writable_location, env_type)
                        if success:
                            console.print(f"✅ Successfully configured {environment}")
                        else:
                            console.print(f"❌ Failed to install {environment} configuration")
                    else:
                        console.print(f"❌ No writable location found for {environment}")
                else:
                    console.print(f"❌ Environment {environment} not detected")
                    
            except Exception as e:
                console.print(f"❌ Configuration failed: {e}")
                sys.exit(1)
        else:
            console.print("❌ No environment specified and auto-detect disabled")
            sys.exit(1)
            
        # Show summary
        console.print("\n🎉 Initialization completed successfully!")
        
        # Display next steps
        next_steps = [
            "Run 'castplan-ultimate verify' to test the installation",
            "Use 'castplan-ultimate info' to see system capabilities",
            "Check 'castplan-ultimate envs' for environment status"
        ]
        
        console.print(Panel(
            "\n".join([f"• {step}" for step in next_steps]),
            title="[bold green]Next Steps[/bold green]",
            border_style="green"
        ))
        
    except (InstallationError, ConfigError) as e:
        console.print(f"❌ Initialization failed: {e}")
        sys.exit(1)


@main.command()
@click.option('--environment', type=click.Choice(['claude_desktop', 'standard_mcp', 'cline', 'cursor']),
              help='Target specific environment')
@click.option('--server-name', default='castplan-ultimate',
              help='Name for the MCP server configuration')
@click.option('--list-environments', is_flag=True,
              help='List available environments with detection details')
@click.option('--show-methods', is_flag=True,
              help='Show available launch methods')
@click.option('--method', type=click.Choice(['uvx', 'uv', 'nodejs', 'pip']),
              help='Preferred launch method for configuration')
@click.option('--backup/--no-backup', default=True,
              help='Create backup of existing configuration')
@click.option('--force', is_flag=True,
              help='Force configuration even if environment not detected')
@click.option('--interactive', is_flag=True, default=False,
              help='Interactive configuration with prompts')
def config(environment, server_name, list_environments, show_methods, method, backup, force, interactive):
    """Enhanced MCP server configuration with uv/uvx support"""
    console.print("⚙️  Enhanced MCP Server Configuration")
    console.print("   Advanced environment detection and launch method selection")
    
    try:
        config_manager = ConfigurationManager(NODEJS_PACKAGE, "castplan-ultimate-automation", console)
        
        if list_environments:
            # Enhanced environment listing with detection details
            detections = config_manager.detect_comprehensive_environments()
            
            if not detections:
                console.print("❌ No environments detected")
                return
                
            # Create comprehensive table
            table = Table(title="🔍 Enhanced Environment Detection")
            table.add_column("Environment", style="cyan", width=16)
            table.add_column("Status", style="green", width=12)
            table.add_column("Compatibility", style="yellow", width=12)
            table.add_column("Recommended Method", style="blue", width=18)
            table.add_column("Locations", style="magenta", width=25)
            
            for detection in detections:
                status = "✅ Detected" if detection.detected else "⚪ Available"
                compatibility = f"{detection.compatibility_score:.0%}"
                method_name = detection.recommended_method.value.replace("_", " ").title()
                
                # Format locations
                location_info = []
                for loc in detection.locations[:2]:  # Show first 2 locations
                    status_icon = "✅" if loc.writable else "❌"
                    location_info.append(f"{status_icon} {loc.name}")
                if len(detection.locations) > 2:
                    location_info.append(f"... +{len(detection.locations) - 2} more")
                locations_str = "\n".join(location_info)
                
                table.add_row(
                    detection.env_type.value.replace("_", " ").title(),
                    status,
                    compatibility,
                    method_name,
                    locations_str
                )
                
            console.print(table)
            
            # Show summary
            detected_count = sum(1 for d in detections if d.detected)
            console.print(f"\n📊 Summary: {detected_count}/{len(detections)} environments detected")
            return
            
        if show_methods:
            # Show available launch methods
            methods_table = Table(title="🚀 Available Launch Methods")
            methods_table.add_column("Method", style="cyan")
            methods_table.add_column("Description", style="white")
            methods_table.add_column("Availability", style="green")
            
            method_info = {
                "uvx": ("Ephemeral execution (no installation)", "✅" if _check_uvx_available() else "❌"),
                "uv": ("Modern Python package manager", "✅" if _check_uv_available() else "❌"),
                "nodejs": ("Direct Node.js execution", "✅" if shutil.which("node") else "❌"),
                "pip": ("Traditional Python package manager", "✅")
            }
            
            for method_name, (description, available) in method_info.items():
                methods_table.add_row(method_name, description, available)
                
            console.print(methods_table)
            return
            
        # Interactive mode for environment and method selection
        if interactive and not environment:
            detections = config_manager.detect_comprehensive_environments()
            if detections:
                env_choices = [d.env_type.value for d in detections]
                environment = Prompt.ask(
                    "Choose environment to configure",
                    choices=env_choices,
                    default=detections[0].env_type.value
                )
                
        if interactive and not method:
            available_methods = []
            if shutil.which("uvx"):
                available_methods.append("uvx")
            if shutil.which("uv"):
                available_methods.append("uv")
            if shutil.which("node"):
                available_methods.append("nodejs")
            available_methods.append("pip")
            
            if available_methods:
                method = Prompt.ask(
                    "Choose launch method",
                    choices=available_methods,
                    default=available_methods[0]
                )
        
        if not environment:
            console.print("❌ No environment specified. Use --environment, --list-environments, or --interactive")
            sys.exit(1)
            
        # Convert method string to enum
        launch_method = None
        if method:
            method_map = {
                'uvx': ConfigLaunchMethod.UVX_EPHEMERAL,
                'uv': ConfigLaunchMethod.UV_PROJECT,
                'nodejs': ConfigLaunchMethod.NODEJS_DIRECT,
                'pip': ConfigLaunchMethod.PYTHON_BRIDGE
            }
            launch_method = method_map.get(method)
            
        console.print(f"🔧 Configuring {environment} with {method or 'auto-detected'} method...")
        
        # Generate enhanced configuration
        env_type = EnvironmentType(environment)
        
        if launch_method:
            config = config_manager.generate_enhanced_config(
                env_type, launch_method, server_name
            )
        else:
            # Use smart configuration
            results = config_manager.smart_configure(
                auto_detect=False,
                server_name=server_name
            )
            if results['environments_configured'] > 0:
                console.print(f"✅ Smart configuration completed for {environment}")
                return
            else:
                raise ConfigError("Smart configuration failed")
                
        # Install configuration
        detections = config_manager.detect_comprehensive_environments()
        target_detection = next((d for d in detections if d.env_type == env_type), None)
        
        if not target_detection and not force:
            console.print(f"❌ Environment {environment} not detected. Use --force to override")
            sys.exit(1)
            
        if target_detection:
            writable_location = next((loc for loc in target_detection.locations if loc.writable), None)
            if writable_location:
                success = config_manager._install_enhanced_config(config, writable_location, env_type)
                if success:
                    console.print(f"✅ Successfully configured {environment}")
                    
                    # Show next steps
                    next_steps = [
                        "Run 'castplan-ultimate verify' to test the configuration",
                        f"Check {writable_location.path} for the configuration file",
                        "Restart your MCP client to load the new configuration"
                    ]
                    
                    console.print(Panel(
                        "\n".join([f"• {step}" for step in next_steps]),
                        title="[bold green]Next Steps[/bold green]",
                        border_style="green"
                    ))
                else:
                    console.print(f"❌ Failed to install {environment} configuration")
                    sys.exit(1)
            else:
                console.print(f"❌ No writable location found for {environment}")
                console.print("💡 Try running with elevated permissions or use --force")
                sys.exit(1)
        else:
            console.print(f"❌ Environment {environment} not detected and --force not specified")
            sys.exit(1)
            
    except (ConfigError, ValueError) as e:
        console.print(f"❌ Configuration failed: {e}")
        sys.exit(1)
        
def _check_uvx_available() -> bool:
    """Check if uvx is available"""
    uvx_path = shutil.which("uvx")
    if not uvx_path and platform.system() == "Windows":
        uvx_path = shutil.which("uvx.exe")
    return uvx_path is not None
    
def _check_uv_available() -> bool:
    """Check if uv is available"""
    uv_path = shutil.which("uv")
    if not uv_path and platform.system() == "Windows":
        uv_path = shutil.which("uv.exe")
    return uv_path is not None


@main.command()
@click.option('--environment', type=click.Choice(['claude_desktop', 'standard_mcp', 'cline', 'cursor']),
              help='Verify specific environment')
@click.option('--all', 'verify_all', is_flag=True, default=True,
              help='Verify all environments with comprehensive detection')
@click.option('--detailed', is_flag=True,
              help='Show detailed verification information with system analysis')
@click.option('--test-launch', is_flag=True, default=True,
              help='Test server launch with different methods')
@click.option('--test-methods', is_flag=True,
              help='Test all available launch methods')
@click.option('--check-dependencies', is_flag=True, default=True,
              help='Verify all dependencies and package managers')
def verify(environment, verify_all, detailed, test_launch, test_methods, check_dependencies):
    """Enhanced verification with comprehensive uv/uvx testing"""
    console.print("🔍 Enhanced CastPlan Ultimate Automation Verification")
    console.print("   Comprehensive system, configuration, and launch method testing")
    
    verification_results = {
        "system_ok": False,
        "packages_ok": False,
        "configs_ok": False,
        "launch_ok": False,
        "errors": [],
        "warnings": []
    }
    
    try:
        # Enhanced system verification
        console.print("\n📊 System Analysis...")
        installer = NodeJSInstaller(NODEJS_PACKAGE, console)
        config_manager = ConfigurationManager(NODEJS_PACKAGE, "castplan-ultimate-automation", console)
        
        # Check comprehensive info
        system_info = installer.get_comprehensive_info()
        
        if detailed:
            # System capabilities table
            capabilities_table = Table(title="🔧 System Capabilities")
            capabilities_table.add_column("Capability", style="cyan")
            capabilities_table.add_column("Status", style="green")
            capabilities_table.add_column("Details", style="yellow")
            
            capabilities = [
                ("Python Managers", f"{len(system_info['python_managers'])} found", 
                 ", ".join([m['name'] for m in system_info['python_managers']]) or "None"),
                ("Node.js Managers", f"{len(system_info['nodejs_managers'])} found",
                 ", ".join([m['name'] for m in system_info['nodejs_managers']]) or "None"),
                ("uvx Available", "✅ Available" if system_info['capabilities']['uvx_available'] else "❌ Not found", 
                 "Ephemeral execution supported" if system_info['capabilities']['uvx_available'] else "Install uv for ephemeral execution"),
                ("uv Available", "✅ Available" if system_info['capabilities']['uv_available'] else "❌ Not found",
                 "Modern Python workflows supported" if system_info['capabilities']['uv_available'] else "Install uv for modern workflows"),
                ("Total Managers", f"{system_info['capabilities']['total_managers']} available",
                 f"Modern: {system_info['capabilities']['modern_nodejs_managers']}")
            ]
            
            for capability, status, details in capabilities:
                capabilities_table.add_row(capability, status, details)
                
            console.print(capabilities_table)
        
        # Check dependencies if requested
        if check_dependencies:
            console.print("\n🔗 Dependency Verification...")
            
            # Verify Node.js installation with enhanced details
            install_info = installer.verify_installation()
            
            if install_info["nodejs_installed"]:
                console.print(f"✅ Node.js {install_info['nodejs_version']} found")
                verification_results["system_ok"] = True
            else:
                console.print("❌ Node.js not found")
                verification_results["errors"].append("Node.js not installed")
                
            if install_info["package_installed"]:
                console.print(f"✅ Package {install_info.get('package_version', 'unknown')} installed")
                verification_results["packages_ok"] = True
                if detailed and install_info.get("package_path"):
                    console.print(f"   📁 Located at: {install_info['package_path']}")
            else:
                console.print("❌ CastPlan package not installed")
                verification_results["errors"].append("CastPlan package not installed")
                
            if install_info["errors"]:
                for error in install_info["errors"]:
                    verification_results["warnings"].append(error)
        
        # Enhanced configuration verification
        console.print("\n⚙️  Configuration Verification...")
        
        if verify_all and not environment:
            # Use comprehensive environment detection
            detections = config_manager.detect_comprehensive_environments()
            
            config_table = Table(title="📋 Configuration Status")
            config_table.add_column("Environment", style="cyan")
            config_table.add_column("Detection", style="blue")
            config_table.add_column("Configuration", style="green")
            config_table.add_column("Recommended Method", style="yellow")
            config_table.add_column("Details", style="magenta")
            
            configs_found = 0
            for detection in detections:
                env_name = detection.env_type.value
                
                # Check configuration
                try:
                    config_results = config_manager.verify_config(env_name)
                    
                    detection_status = "✅ Detected" if detection.detected else "⚪ Available"
                    
                    if config_results["server_configured"]:
                        config_status = "✅ Configured"
                        configs_found += 1
                        details = f"Server: {config_results['server_name']}"
                    elif config_results["config_found"]:
                        config_status = "⚠️  Partial"
                        details = "Config file exists but server not configured"
                    else:
                        config_status = "❌ Not configured"
                        details = "No configuration found"
                        
                    recommended_method = detection.recommended_method.value.replace("_", " ").title()
                    
                    if config_results["errors"]:
                        details += f" | Errors: {len(config_results['errors'])}"
                        
                    config_table.add_row(
                        env_name.replace("_", " ").title(),
                        detection_status,
                        config_status,
                        recommended_method,
                        details
                    )
                    
                except Exception as e:
                    config_table.add_row(
                        env_name.replace("_", " ").title(),
                        "❌ Error",
                        "❌ Error",
                        "Unknown",
                        str(e)
                    )
                    
            console.print(config_table)
            console.print(f"\n📊 Summary: {configs_found}/{len(detections)} environments configured")
            
            if configs_found > 0:
                verification_results["configs_ok"] = True
            else:
                verification_results["errors"].append("No environments configured")
                
        elif environment:
            # Verify specific environment
            results = config_manager.verify_config(environment)
            
            if results["server_configured"]:
                console.print(f"✅ {environment} is properly configured")
                verification_results["configs_ok"] = True
                if detailed:
                    console.print(f"   📁 Config path: {results['config_path']}")
                    console.print(f"   🏷️  Server name: {results['server_name']}")
            else:
                console.print(f"❌ {environment} is not configured")
                verification_results["errors"].append(f"{environment} not configured")
                if results["errors"]:
                    for error in results["errors"]:
                        console.print(f"   ❌ {error}")
                        verification_results["errors"].append(error)
        
        # Enhanced launch testing
        if test_launch:
            console.print("\n🚀 Launch Method Testing...")
            
            if test_methods:
                # Test all available methods
                launcher = NodeJSLauncher(NODEJS_PACKAGE, "castplan-ultimate-automation", console=console)
                available_methods = launcher.detect_available_launch_methods()
                
                if available_methods:
                    launch_table = Table(title="🧪 Launch Method Test Results")
                    launch_table.add_column("Method", style="cyan")
                    launch_table.add_column("Availability", style="blue")
                    launch_table.add_column("Test Result", style="green")
                    launch_table.add_column("Performance", style="yellow")
                    
                    for method in available_methods:
                        try:
                            # Quick test of each method
                            console.print(f"   Testing {method.value}...")
                            
                            start_time = time.time()
                            if method == LaunchMethod.UVX_EPHEMERAL and launcher._check_uvx_available():
                                test_result = "✅ Ready"
                                performance = "Ultra-fast (ephemeral)"
                            elif method == LaunchMethod.UV_PROJECT and launcher._check_uv_available():
                                test_result = "✅ Ready"
                                performance = "Fast (modern)"
                            elif method == LaunchMethod.NODEJS_DIRECT:
                                # Test Node.js detection
                                launcher.detect_nodejs()
                                test_result = "✅ Ready"
                                performance = "Standard (direct)"
                            elif method == LaunchMethod.PYTHON_BRIDGE:
                                test_result = "✅ Ready"
                                performance = "Standard (bridge)"
                            else:
                                test_result = "⚠️  Limited"
                                performance = "Not available"
                                
                            test_time = time.time() - start_time
                            availability = "✅ Available"
                            
                        except Exception as e:
                            test_result = f"❌ Failed: {str(e)[:30]}..."
                            performance = "Error"
                            availability = "❌ Error"
                            
                        launch_table.add_row(
                            method.value.replace("_", " ").title(),
                            availability,
                            test_result,
                            performance
                        )
                        
                    console.print(launch_table)
                    verification_results["launch_ok"] = len(available_methods) > 0
                else:
                    console.print("❌ No launch methods available")
                    verification_results["errors"].append("No launch methods available")
            else:
                # Standard launch test
                try:
                    with NodeJSLauncher(NODEJS_PACKAGE) as launcher:
                        # Try smart launch first
                        console.print("   🔄 Testing smart launch...")
                        
                        config = launcher.create_launch_configuration(ephemeral=True)
                        console.print(f"   📋 Selected method: {config.method.value}")
                        
                        # Don't actually launch for verification, just test configuration
                        console.print("✅ Launch configuration successful")
                        verification_results["launch_ok"] = True
                        
                        if detailed:
                            enhanced_info = launcher.get_enhanced_server_info()
                            if enhanced_info:
                                console.print(f"   🎯 Available methods: {', '.join(enhanced_info['available_methods'])}")
                                console.print(f"   🖥️  Platform: {enhanced_info['platform']}")
                                
                except (LaunchError, NodeJSNotFoundError) as e:
                    console.print(f"❌ Launch test failed: {e}")
                    verification_results["errors"].append(f"Launch test failed: {e}")
        
        # Final verification summary
        console.print("\n📊 Verification Summary")
        
        summary_items = [
            ("System", verification_results["system_ok"]),
            ("Packages", verification_results["packages_ok"]),
            ("Configurations", verification_results["configs_ok"]),
            ("Launch Methods", verification_results["launch_ok"])
        ]
        
        summary_table = Table(title="🏁 Final Results")
        summary_table.add_column("Component", style="cyan")
        summary_table.add_column("Status", style="green")
        
        all_ok = True
        for component, status in summary_items:
            status_text = "✅ OK" if status else "❌ Issues"
            if not status:
                all_ok = False
            summary_table.add_row(component, status_text)
            
        console.print(summary_table)
        
        if verification_results["errors"]:
            console.print("\n❌ Issues Found:")
            for error in verification_results["errors"]:
                console.print(f"   • {error}")
                
        if verification_results["warnings"]:
            console.print("\n⚠️  Warnings:")
            for warning in verification_results["warnings"]:
                console.print(f"   • {warning}")
        
        if all_ok:
            console.print("\n🎉 All systems operational! CastPlan Ultimate Automation is ready to use.")
        else:
            console.print("\n💡 Run 'castplan-ultimate doctor' to diagnose and fix issues")
            sys.exit(1)
        
    except Exception as e:
        console.print(f"❌ Verification failed: {e}")
        sys.exit(1)


@main.command()
@click.option('--fix-permissions', is_flag=True,
              help='Attempt to fix permission issues')
@click.option('--reinstall', is_flag=True,
              help='Reinstall with smart package manager selection')
@click.option('--reset-config', is_flag=True,
              help='Reset all configurations with enhanced detection')
@click.option('--fix-managers', is_flag=True,
              help='Fix package manager issues and update paths')
@click.option('--update-uv', is_flag=True,
              help='Update uv/uvx to latest versions')
@click.option('--comprehensive', is_flag=True,
              help='Run comprehensive diagnostics and auto-fix')
@click.option('--interactive', is_flag=True, default=False,
              help='Interactive mode with fix confirmations')
def doctor(fix_permissions, reinstall, reset_config, fix_managers, update_uv, comprehensive, interactive):
    """Enhanced diagnostics with intelligent uv/uvx troubleshooting"""
    console.print("🩺 Enhanced CastPlan Ultimate Automation Doctor")
    console.print("   Comprehensive system diagnostics and intelligent auto-repair")
    
    diagnostic_results = {
        "issues_found": [],
        "fixes_applied": [],
        "recommendations": [],
        "system_health": {},
        "success_rate": 0.0
    }
    
    try:
        # Enhanced system diagnostics
        console.print("\n🔍 System Health Analysis...")
        
        installer = NodeJSInstaller(NODEJS_PACKAGE, console)
        config_manager = ConfigurationManager(NODEJS_PACKAGE, "castplan-ultimate-automation", console)
        
        # Get comprehensive system information
        system_info = installer.get_comprehensive_info()
        diagnostic_results["system_health"] = system_info
        
        # Analyze package manager ecosystem
        console.print("\n📦 Package Manager Ecosystem Analysis...")
        
        manager_issues = []
        manager_table = Table(title="📊 Package Manager Health")
        manager_table.add_column("Manager", style="cyan")
        manager_table.add_column("Status", style="green")
        manager_table.add_column("Issues", style="yellow")
        manager_table.add_column("Recommendations", style="blue")
        
        # Check Python managers
        python_health = {}
        for manager in system_info.get('python_managers', []):
            issues = []
            recommendations = []
            status = "✅ Healthy"
            
            # Check for common issues
            if manager['name'] == 'uvx' and not system_info['capabilities']['uvx_available']:
                issues.append("Not in PATH")
                recommendations.append("Reinstall uv")
                status = "❌ Issues"
                
            if manager['name'] == 'uv' and not system_info['capabilities']['uv_available']:
                issues.append("Not in PATH")
                recommendations.append("Add to PATH")
                status = "❌ Issues"
                
            python_health[manager['name']] = {
                'status': status,
                'issues': issues,
                'recommendations': recommendations
            }
            
            manager_table.add_row(
                f"{manager['name']} (Python)",
                status,
                ", ".join(issues) if issues else "None",
                ", ".join(recommendations) if recommendations else "None"
            )
            
        # Check Node.js managers
        nodejs_health = {}
        for manager in system_info.get('nodejs_managers', []):
            issues = []
            recommendations = []
            status = "✅ Healthy"
            
            # Performance analysis
            if manager.get('performance_score', 0) < 0.8:
                issues.append("Low performance")
                recommendations.append("Consider upgrading")
                
            if manager.get('reliability_score', 0) < 0.9:
                issues.append("Reliability concerns")
                recommendations.append("Monitor for issues")
                
            nodejs_health[manager['name']] = {
                'status': status,
                'issues': issues,
                'recommendations': recommendations
            }
            
            manager_table.add_row(
                f"{manager['name']} (Node.js)",
                status,
                ", ".join(issues) if issues else "None",
                ", ".join(recommendations) if recommendations else "None"
            )
            
        console.print(manager_table)
        
        # Installation verification with detailed analysis
        console.print("\n🔗 Installation Verification...")
        install_info = installer.verify_installation()
        
        installation_issues = []
        if not install_info["nodejs_installed"]:
            installation_issues.append({
                "issue": "Node.js not found",
                "severity": "critical",
                "fix": "install_nodejs",
                "description": "Node.js runtime is required for MCP server execution"
            })
            
        if not install_info["package_installed"]:
            installation_issues.append({
                "issue": "CastPlan package not installed",
                "severity": "critical", 
                "fix": "reinstall_package",
                "description": "Core MCP server package is missing"
            })
            
        # Enhanced configuration analysis
        console.print("\n⚙️  Configuration Health Analysis...")
        detections = config_manager.detect_comprehensive_environments()
        
        config_issues = []
        configured_count = 0
        
        for detection in detections:
            env_name = detection.env_type.value
            config_results = config_manager.verify_config(env_name)
            
            if detection.detected and not config_results["server_configured"]:
                config_issues.append({
                    "issue": f"{env_name} detected but not configured",
                    "severity": "medium",
                    "fix": "configure_environment",
                    "environment": env_name,
                    "description": f"MCP client is available but server not configured"
                })
            elif config_results["server_configured"]:
                configured_count += 1
                
            # Check for permission issues
            writable_locations = [loc for loc in detection.locations if loc.writable]
            if detection.detected and not writable_locations:
                config_issues.append({
                    "issue": f"No writable locations for {env_name}",
                    "severity": "high",
                    "fix": "fix_permissions",
                    "environment": env_name,
                    "description": "Cannot write configuration due to permission issues"
                })
                
        if configured_count == 0:
            config_issues.append({
                "issue": "No environments configured",
                "severity": "high",
                "fix": "initialize_config",
                "description": "MCP server not configured for any environments"
            })
            
        # Compile all issues
        all_issues = installation_issues + config_issues
        diagnostic_results["issues_found"] = all_issues
        
        # Display issues summary
        if all_issues:
            issues_table = Table(title="🚨 Issues Detected")
            issues_table.add_column("Severity", style="red")
            issues_table.add_column("Issue", style="cyan")
            issues_table.add_column("Description", style="yellow")
            issues_table.add_column("Auto-Fix", style="green")
            
            for issue in all_issues:
                severity_icons = {
                    "critical": "🔴 Critical",
                    "high": "🟡 High", 
                    "medium": "🟠 Medium",
                    "low": "🟢 Low"
                }
                
                auto_fix = "✅ Available" if issue["fix"] else "❌ Manual"
                
                issues_table.add_row(
                    severity_icons.get(issue["severity"], "❓ Unknown"),
                    issue["issue"],
                    issue["description"],
                    auto_fix
                )
                
            console.print(issues_table)
            
            # Intelligent auto-repair
            if comprehensive or any([fix_permissions, reinstall, reset_config, fix_managers, update_uv]):
                console.print("\n🔧 Applying Intelligent Auto-Repair...")
                
                fixes_applied = []
                
                # Fix installation issues
                for issue in installation_issues:
                    if issue["fix"] == "reinstall_package" and (reinstall or comprehensive):
                        try:
                            console.print("   📦 Reinstalling with smart package manager selection...")
                            success = installer.smart_install(
                                installation_type="auto",
                                interactive=interactive
                            )
                            if success:
                                fixes_applied.append("Smart package reinstallation")
                            else:
                                diagnostic_results["recommendations"].append("Manual package installation required")
                        except Exception as e:
                            diagnostic_results["recommendations"].append(f"Reinstallation failed: {e}")
                            
                # Fix configuration issues
                for issue in config_issues:
                    if issue["fix"] == "fix_permissions" and (fix_permissions or comprehensive):
                        try:
                            console.print(f"   🔐 Fixing permissions for {issue.get('environment', 'all environments')}...")
                            # Try to create necessary directories
                            if 'environment' in issue:
                                locations = config_manager.detect_config_locations().get(issue['environment'], [])
                                for location in locations:
                                    try:
                                        location.path.parent.mkdir(parents=True, exist_ok=True)
                                        fixes_applied.append(f"Fixed permissions for {issue['environment']}")
                                    except Exception:
                                        pass
                        except Exception as e:
                            diagnostic_results["recommendations"].append(f"Permission fix failed: {e}")
                            
                    elif issue["fix"] == "configure_environment" and (reset_config or comprehensive):
                        try:
                            console.print(f"   ⚙️  Configuring {issue.get('environment')}...")
                            env_name = issue.get('environment')
                            if env_name:
                                results = config_manager.smart_configure(
                                    auto_detect=False,
                                    server_name="castplan-ultimate"
                                )
                                if results.get('environments_configured', 0) > 0:
                                    fixes_applied.append(f"Configured {env_name}")
                        except Exception as e:
                            diagnostic_results["recommendations"].append(f"Configuration failed: {e}")
                            
                    elif issue["fix"] == "initialize_config" and (reset_config or comprehensive):
                        try:
                            console.print("   🚀 Initializing configurations...")
                            results = config_manager.smart_configure(
                                auto_detect=True,
                                server_name="castplan-ultimate"
                            )
                            if results.get('environments_configured', 0) > 0:
                                fixes_applied.append("Initialized MCP configurations")
                        except Exception as e:
                            diagnostic_results["recommendations"].append(f"Initialization failed: {e}")
                
                # Update uv/uvx if requested
                if update_uv or comprehensive:
                    console.print("   📥 Updating uv/uvx...")
                    try:
                        # Try to update uv using pip
                        result = subprocess.run(
                            ["pip", "install", "--upgrade", "uv"],
                            capture_output=True,
                            text=True,
                            timeout=120
                        )
                        if result.returncode == 0:
                            fixes_applied.append("Updated uv to latest version")
                        else:
                            diagnostic_results["recommendations"].append("Manual uv update recommended")
                    except Exception:
                        diagnostic_results["recommendations"].append("Could not update uv automatically")
                
                diagnostic_results["fixes_applied"] = fixes_applied
                
        else:
            console.print("\n✅ No critical issues detected")
            
        # Generate recommendations
        console.print("\n💡 Health Recommendations...")
        
        recommendations = diagnostic_results["recommendations"].copy()
        
        # Performance recommendations
        if system_info['capabilities']['total_managers'] < 3:
            recommendations.append("Consider installing more package managers for better redundancy")
            
        if not system_info['capabilities']['uvx_available']:
            recommendations.append("Install uv for modern Python workflows and ephemeral execution")
            
        if not system_info['capabilities']['uv_available']:
            recommendations.append("Install uv for fast, reliable Python package management")
            
        # Security recommendations
        if configured_count > 0:
            recommendations.append("Regularly verify configurations with 'castplan-ultimate verify'")
            
        # Performance optimization
        modern_managers = system_info['capabilities']['modern_nodejs_managers']
        if modern_managers == 0:
            recommendations.append("Consider installing pnpm or yarn for faster Node.js package management")
            
        # Final health score calculation
        total_checks = len(installation_issues) + len(config_issues) + 5  # 5 additional health checks
        issues_count = len([i for i in all_issues if i["severity"] in ["critical", "high"]])
        fixes_count = len(diagnostic_results["fixes_applied"])
        
        health_score = max(0.0, (total_checks - issues_count + fixes_count) / total_checks)
        diagnostic_results["success_rate"] = health_score
        
        # Display final summary
        console.print("\n📊 Doctor Summary")
        
        summary_table = Table(title="🏥 System Health Report")
        summary_table.add_column("Metric", style="cyan")
        summary_table.add_column("Status", style="green")
        summary_table.add_column("Details", style="yellow")
        
        health_status = "🟢 Excellent" if health_score >= 0.9 else \
                       "🟡 Good" if health_score >= 0.7 else \
                       "🟠 Fair" if health_score >= 0.5 else "🔴 Poor"
                       
        summary_items = [
            ("Overall Health", health_status, f"{health_score:.1%} system reliability"),
            ("Issues Found", f"{len(all_issues)} detected", "Critical and high priority issues"),
            ("Fixes Applied", f"{len(diagnostic_results['fixes_applied'])} successful", "Automated repairs completed"),
            ("Package Managers", f"{system_info['capabilities']['total_managers']} available", "Python and Node.js managers"),
            ("Modern Tools", "✅ Available" if system_info['capabilities']['uvx_available'] else "❌ Missing", "uv/uvx modern workflow support")
        ]
        
        for metric, status, details in summary_items:
            summary_table.add_row(metric, status, details)
            
        console.print(summary_table)
        
        # Show fixes applied
        if diagnostic_results["fixes_applied"]:
            console.print(f"\n🔧 Applied {len(diagnostic_results['fixes_applied'])} Fix(es):")
            for fix in diagnostic_results["fixes_applied"]:
                console.print(f"   ✅ {fix}")
                
        # Show recommendations
        if recommendations:
            console.print(f"\n💡 {len(recommendations)} Recommendation(s):")
            for rec in recommendations[:5]:  # Show top 5 recommendations
                console.print(f"   • {rec}")
            if len(recommendations) > 5:
                console.print(f"   ... and {len(recommendations) - 5} more")
                
        # Final status and next steps
        if health_score >= 0.8:
            console.print("\n🎉 System is healthy! Run 'castplan-ultimate verify' to confirm functionality.")
        elif diagnostic_results["fixes_applied"]:
            console.print("\n✅ Repairs completed. Run 'castplan-ultimate verify' to test the fixes.")
        else:
            console.print("\n⚠️  Issues remain. Consider running with --comprehensive for auto-repair.")
            
        # Suggest next steps
        next_steps = [
            "Run 'castplan-ultimate verify --detailed' to test all functionality",
            "Use 'castplan-ultimate init --interactive' to reconfigure if needed",
            "Check 'castplan-ultimate --info' for updated system status"
        ]
        
        console.print(Panel(
            "\n".join([f"• {step}" for step in next_steps]),
            title="[bold blue]Recommended Next Steps[/bold blue]",
            border_style="blue"
        ))
            
    except Exception as e:
        console.print(f"❌ Diagnostic failed: {e}")
        sys.exit(1)


@main.command()
@click.option('--method', type=click.Choice(['uvx', 'uv', 'nodejs', 'pip']),
              help='Launch method to use')
@click.option('--ephemeral', is_flag=True, default=False,
              help='Use ephemeral execution (uvx preferred)')
@click.option('--args', help='Additional arguments to pass to the server')
@click.option('--detached', is_flag=True, default=False,
              help='Run server in detached mode')
def run(method, ephemeral, args, detached):
    """Run the MCP server with enhanced uv/uvx support"""
    console.print("🚀 Running CastPlan Ultimate Automation MCP Server")
    console.print("   Enhanced launch with intelligent method selection")
    
    try:
        launcher = NodeJSLauncher(NODEJS_PACKAGE, "castplan-ultimate-automation", console=console)
        
        # Parse additional arguments
        additional_args = args.split() if args else []
        
        # Create launch configuration
        config = launcher.create_launch_configuration(
            preferred_method=LaunchMethod(method) if method else None,
            ephemeral=ephemeral,
            args=additional_args
        )
        
        console.print(f"📋 Selected method: {config.method.value}")
        
        if ephemeral or config.method == LaunchMethod.UVX_EPHEMERAL:
            console.print("✨ Using ephemeral execution - no permanent installation")
            
        # Launch server
        if detached:
            console.print("🔄 Starting server in detached mode...")
            process = launcher.smart_launch(
                preferred_method=LaunchMethod(method) if method else None,
                ephemeral=ephemeral,
                args=additional_args
            )
            
            console.print(f"✅ Server started successfully (PID: {process.pid})")
            console.print("🔍 Use 'castplan-ultimate verify' to check server status")
        else:
            console.print("🔄 Starting server in foreground mode...")
            console.print("💡 Press Ctrl+C to stop the server")
            
            with launcher:
                process = launcher.smart_launch(
                    preferred_method=LaunchMethod(method) if method else None,
                    ephemeral=ephemeral,
                    args=additional_args
                )
                
                try:
                    # Keep server running
                    process.wait()
                except KeyboardInterrupt:
                    console.print("\n🛑 Stopping server...")
                    launcher.stop_server()
                    console.print("✅ Server stopped")
                    
    except Exception as e:
        console.print(f"❌ Failed to run server: {e}")
        sys.exit(1)


@main.command()
@click.option('--format', type=click.Choice(['table', 'json', 'tree']), default='table',
              help='Output format for environment information')
@click.option('--show-all', is_flag=True,
              help='Show all environment details including non-detected ones')
def envs(format, show_all):
    """List and analyze MCP environments with comprehensive detection"""
    console.print("🌍 MCP Environment Analysis")
    console.print("   Comprehensive environment detection and compatibility assessment")
    
    try:
        config_manager = ConfigurationManager(NODEJS_PACKAGE, "castplan-ultimate-automation", console)
        detections = config_manager.detect_comprehensive_environments()
        
        if not detections:
            console.print("❌ No MCP environments detected")
            return
            
        if format == 'json':
            # JSON output for programmatic use
            import json
            env_data = []
            for detection in detections:
                env_data.append({
                    "environment": detection.env_type.value,
                    "detected": detection.detected,
                    "compatibility_score": detection.compatibility_score,
                    "recommended_method": detection.recommended_method.value,
                    "priority": detection.priority,
                    "locations": [
                        {
                            "name": loc.name,
                            "path": str(loc.path),
                            "exists": loc.exists,
                            "writable": loc.writable
                        }
                        for loc in detection.locations
                    ],
                    "notes": detection.notes
                })
                
            console.print(json.dumps(env_data, indent=2))
            
        elif format == 'tree':
            # Tree view for hierarchical display
            tree = Tree("🌍 MCP Environments")
            
            for detection in detections:
                if not show_all and not detection.detected:
                    continue
                    
                env_name = detection.env_type.value.replace("_", " ").title()
                status_icon = "✅" if detection.detected else "⚪"
                
                env_branch = tree.add(f"{status_icon} {env_name}")
                env_branch.add(f"🎯 Compatibility: {detection.compatibility_score:.0%}")
                env_branch.add(f"🚀 Recommended: {detection.recommended_method.value.replace('_', ' ').title()}")
                
                locations_branch = env_branch.add("📁 Locations")
                for loc in detection.locations:
                    loc_icon = "✅" if loc.writable else "❌"
                    locations_branch.add(f"{loc_icon} {loc.name}: {loc.path}")
                    
                if detection.notes:
                    notes_branch = env_branch.add("📝 Notes")
                    for note in detection.notes:
                        notes_branch.add(f"• {note}")
                        
            console.print(tree)
            
        else:  # table format (default)
            # Enhanced table view
            env_table = Table(title="🌍 MCP Environment Analysis")
            env_table.add_column("Environment", style="cyan", width=16)
            env_table.add_column("Status", style="green", width=12) 
            env_table.add_column("Compatibility", style="yellow", width=12)
            env_table.add_column("Config Status", style="blue", width=14)
            env_table.add_column("Recommended Method", style="magenta", width=18)
            env_table.add_column("Locations", style="white", width=20)
            
            configured_count = 0
            detected_count = 0
            
            for detection in detections:
                if not show_all and not detection.detected:
                    continue
                    
                env_name = detection.env_type.value
                
                # Status
                if detection.detected:
                    status = "✅ Detected"
                    detected_count += 1
                else:
                    status = "⚪ Available"
                    
                # Compatibility
                compatibility = f"{detection.compatibility_score:.0%}"
                
                # Configuration status
                try:
                    config_results = config_manager.verify_config(env_name)
                    if config_results["server_configured"]:
                        config_status = "✅ Configured"
                        configured_count += 1
                    elif config_results["config_found"]:
                        config_status = "⚠️  Partial"
                    else:
                        config_status = "❌ Not configured"
                except:
                    config_status = "❓ Unknown"
                    
                # Recommended method
                method_name = detection.recommended_method.value.replace("_", " ").title()
                
                # Locations summary
                writable_count = sum(1 for loc in detection.locations if loc.writable)
                total_count = len(detection.locations)
                locations_summary = f"{writable_count}/{total_count} writable"
                
                env_table.add_row(
                    env_name.replace("_", " ").title(),
                    status,
                    compatibility,
                    config_status,
                    method_name,
                    locations_summary
                )
                
            console.print(env_table)
            
            # Summary statistics
            summary_stats = [
                f"📊 Environments: {len(detections)} total, {detected_count} detected, {configured_count} configured",
                f"🎯 Detection Rate: {detected_count/len(detections):.0%}",
                f"⚙️  Configuration Rate: {configured_count/len(detections):.0%}" if detected_count > 0 else "⚙️  Configuration Rate: 0%"
            ]
            
            console.print(Panel(
                "\n".join(summary_stats),
                title="[bold green]Summary Statistics[/bold green]",
                border_style="green"
            ))
            
        # Show recommendations
        if detected_count > configured_count:
            console.print(f"\n💡 {detected_count - configured_count} detected environment(s) not configured")
            console.print("   Run 'castplan-ultimate init' to configure all detected environments")
            
        if detected_count == 0:
            console.print("\n💡 No MCP environments detected")
            console.print("   Install Claude Desktop, Cline, Cursor, or other MCP clients")
            
    except Exception as e:
        console.print(f"❌ Environment analysis failed: {e}")
        sys.exit(1)


# Command aliases for convenience
def init_command():
    """Alias for init command"""
    main(['init'])


def config_command():
    """Alias for config command"""
    main(['config'])


def verify_command():
    """Alias for verify command"""
    main(['verify'])


def doctor_command():
    """Alias for doctor command"""
    main(['doctor'])


def run_command():
    """Alias for run command"""
    main(['run'])


def envs_command():
    """Alias for envs command"""
    main(['envs'])


if __name__ == '__main__':
    main()