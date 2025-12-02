from rich.console import Console
from rich.theme import Theme
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.layout import Layout
from datetime import datetime

# Palantir / Cyberpunk Theme
custom_theme = Theme({
    "info": "cyan",
    "warning": "yellow",
    "error": "bold red",
    "critical": "bold white on red",
    "success": "bold green",
    "ai": "magenta",
    "data": "blue",
    "timestamp": "dim white"
})

console = Console(theme=custom_theme)

class ARESConsole:
    @staticmethod
    def startup():
        console.clear()
        console.print(Panel.fit(
            "[bold cyan]ARES AUTONOMOUS CONTROL SYSTEM[/bold cyan]\n"
            "[dim]v2.0.4 | SYSTEM INITIALIZED[/dim]\n"
            "[bold white]CONNECTED TO NTSB DATABASE[/bold white]",
            border_style="cyan",
            title="[bold]BOOT SEQUENCE[/bold]",
            subtitle="[dim]AUTHORIZED PERSONNEL ONLY[/dim]"
        ))

    @staticmethod
    def log_ai_thought(agent: str, thought: str):
        time = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        console.print(f"[{time}] [bold magenta]{agent.upper()}[/bold magenta] ➤ [italic cyan]{thought}[/italic cyan]")

    @staticmethod
    def log_risk_match(callsign: str, risk_type: str, confidence: float):
        console.print(Panel(
            f"[bold white]AIRCRAFT:[/bold white] {callsign}\n"
            f"[bold white]RISK PROFILE:[/bold white] {risk_type}\n"
            f"[bold white]CONFIDENCE:[/bold white] {confidence*100}%",
            title="[bold red]⚠️ SAFETY VIOLATION DETECTED[/bold red]",
            border_style="red"
        ))

    @staticmethod
    def log_transmission(callsign: str, message: str):
        time = datetime.now().strftime("%H:%M:%S")
        console.print(f"[{time}] [bold green]TX ➤ {callsign}[/bold green]: {message}")

    @staticmethod
    def log_system(message: str, level: str = "info"):
        time = datetime.now().strftime("%H:%M:%S")
        console.print(f"[{time}] [{level}]{message}[/{level}]")

logger = ARESConsole()
