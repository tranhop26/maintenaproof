"""Shared direct-mode test helpers."""

import sys
from pathlib import Path

import pytest
from gltest.direct import loader as direct_loader


_locked_message_files = []
_original_inject_message = direct_loader._inject_message_to_fd0


def _inject_message_windows_safe(vm):
    try:
        _original_inject_message(vm)
    except PermissionError as error:
        if error.filename:
            _locked_message_files.append(error.filename)


direct_loader._inject_message_to_fd0 = _inject_message_windows_safe


@pytest.fixture(autouse=True)
def reset_runner_sdk_namespace(direct_vm):
    """Let direct_deploy load the runner-pinned SDK instead of the client SDK.

    gltest 0.29 creates its first address before loading the runner and can leave
    the unrelated client-side ``genlayer`` namespace cached on Python 3.14.
    """
    for module_name in list(sys.modules):
        if module_name == "genlayer" or module_name.startswith("genlayer."):
            sys.modules.pop(module_name, None)
    yield


@pytest.fixture
def direct_deploy(direct_vm):
    """Load each contract against its pinned runner SDK at call time."""

    def deploy(contract_path, *args, sdk_version=None, **kwargs):
        for module_name in list(sys.modules):
            if module_name == "genlayer" or module_name.startswith("genlayer."):
                sys.modules.pop(module_name, None)
        return direct_loader.deploy_contract(
            Path(contract_path), direct_vm, *args, sdk_version=sdk_version, **kwargs
        )

    return deploy


def to_hex(address):
    if hasattr(address, "as_hex"):
        return address.as_hex
    from genlayer.py.types import Address

    return Address(address).as_hex
