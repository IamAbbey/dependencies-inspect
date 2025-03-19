from poetry.console.application import Application
from poetry.console.commands.command import Command
from poetry.plugins.application_plugin import ApplicationPlugin

from poetry_plugin_inspect.command import InspectPackageCommand


class InspectApplicationPlugin(ApplicationPlugin):
    @property
    def commands(self) -> list[type[Command]]:
        return [InspectPackageCommand]

    def activate(self, application: Application) -> None:
        super().activate(application=application)
