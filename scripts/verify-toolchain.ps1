<#!
.SYNOPSIS
Checks the project-local GenLayer v0.6 release family before profiling or deployment.

.DESCRIPTION
Run after `.venv` and `node_modules` have been installed. This script does not
deploy a contract, access an account, or transmit a transaction.
#>

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath ".venv\Scripts\python.exe")) {
    throw "Missing .venv. Run: python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

if (-not (Test-Path -LiteralPath "node_modules\genlayer")) {
    throw "Missing local GenLayer CLI. Run: npm install"
}

& .\.venv\Scripts\python.exe -c @'
from importlib.metadata import version

expected = {
    "genlayer-py": "0.19.0rc2",
    "genlayer-test": "0.30.0rc2",
    "genvm-linter": "0.11.1rc2",
}
for package, required in expected.items():
    installed = version(package)
    if installed != required:
        raise SystemExit(f"{package}: expected {required}, found {installed}")
    print(f"{package}: {installed}")
'@

$cliVersion = (& npm run --silent genlayer -- --version).Trim()
if ($cliVersion -ne "0.40.0-rc.3") {
    throw "genlayer CLI: expected 0.40.0-rc.3, found $cliVersion"
}
Write-Output "genlayer CLI: $cliVersion"
Write-Output "Toolchain verification passed."

