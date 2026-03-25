import os
import subprocess
import requests
import time
import sys
import re
import json
import shlex
import tempfile
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Configuration - Ensure these are set in your environment
SONAR_URL = os.environ.get("SONAR_HOST_URL", "http://localhost:9000").rstrip("/")
SONAR_TOKEN = os.environ.get("SONAR_TOKEN")
PROJECT_KEY = os.environ.get("SONAR_PROJECT_KEY")
COPILOT_CLI_TEMPLATE = os.environ.get(
    "COPILOT_CLI_TEMPLATE", 'copilot --prompt-file "{prompt_file}"'
)
MAX_ATTEMPTS = int(os.environ.get("SONAR_FIX_MAX_ATTEMPTS", "3"))


def _safe_json(value):
    try:
        return json.dumps(value, indent=2, sort_keys=True)
    except Exception:
        return str(value)


def run_command(cmd, log=True, cwd=None, check=False):
    if log:
        printable = cmd if isinstance(cmd, str) else shlex.join(cmd)
        scope = f" (cwd={cwd})" if cwd else ""
        print(f"Executing{scope}: {printable}")

    result = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, cwd=cwd)

    if result.returncode != 0 and log:
        print(f"Command failed with error: {result.stderr}")
    if check and result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Command failed")
    return result


def get_project_key():
    if PROJECT_KEY:
        return PROJECT_KEY
    if os.path.exists("sonar-project.properties"):
        with open("sonar-project.properties", "r") as f:
            for line in f:
                if line.startswith("sonar.projectKey="):
                    return line.split("=")[1].strip()
    return None


def fetch_top_issue(project_key):
    url = f"{SONAR_URL}/api/issues/search"
    # Sort by severity (BLOCKER, CRITICAL, MAJOR, etc.)
    params = {
        "componentKeys": project_key,
        "resolved": "false",
        "s": "SEVERITY",
        "asc": "false",
        "ps": 1,
        "additionalFields": "_all",
    }
    response = requests.get(url, params=params, auth=(SONAR_TOKEN, ""))
    response.raise_for_status()
    issues = response.json().get("issues", [])
    return issues[0] if issues else None


def fetch_issue_by_key(issue_key):
    url = f"{SONAR_URL}/api/issues/search"
    params = {
        "issues": issue_key,
        "resolved": "false",
        "additionalFields": "_all",
    }
    response = requests.get(url, params=params, auth=(SONAR_TOKEN, ""))
    response.raise_for_status()
    issues = response.json().get("issues", [])
    return issues[0] if issues else None


def fetch_component_coverage(component_key):
    url = f"{SONAR_URL}/api/measures/component"
    params = {
        "component": component_key,
        "metricKeys": "coverage",
    }
    response = requests.get(url, params=params, auth=(SONAR_TOKEN, ""))
    if response.status_code != 200:
        return None
    payload = response.json()
    measures = payload.get("component", {}).get("measures", [])
    for measure in measures:
        if measure.get("metric") == "coverage":
            return measure.get("value")
    return None


def wait_for_analysis_completion(scan_dir):
    """Polls the SonarQube CE task status dynamically."""
    report_path = Path(scan_dir) / ".scannerwork" / "report-task.txt"
    if not os.path.exists(report_path):
        print("Waiting for report-task.txt to be generated...")
        for _ in range(10):
            if os.path.exists(report_path):
                break
            time.sleep(1)
        else:
            print(
                "Error: .scannerwork/report-task.txt not found. Analysis might have failed."
            )
            return False

    # Extract the Task ID from the scanner report
    task_id = None
    with open(report_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("ceTaskId="):
                task_id = line.split("=")[1].strip()
                break

    if not task_id:
        print("Could not find ceTaskId in report-task.txt.")
        return False

    print(f"Analysis submitted. Task ID: {task_id}. Polling for completion...")
    while True:
        url = f"{SONAR_URL}/api/ce/task?id={task_id}"
        resp = requests.get(url, auth=(SONAR_TOKEN, ""))
        resp.raise_for_status()
        status = resp.json().get("task", {}).get("status")

        if status in ["SUCCESS", "FAILED", "CANCELED"]:
            print(f"Analysis finished with status: {status}")
            return status == "SUCCESS"

        print(f"Current status: {status}. Waiting 5 seconds...")
        time.sleep(5)


def run_analysis(scan_dir):
    print("Initiating SonarQube analysis...")
    # Run the scanner
    result = run_command(
        [
            "npx",
            "sonar-scanner",
            f"-Dsonar.host.url={SONAR_URL}",
            f"-Dsonar.token={SONAR_TOKEN}",
        ],
        cwd=scan_dir,
    )
    if result.returncode != 0:
        return False
    return wait_for_analysis_completion(scan_dir)


def invoke_copilot_cli(prompt, repo_root, working_dir):
    """Invokes GitHub Copilot CLI with a single comprehensive prompt."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    ) as temp_prompt:
        temp_prompt.write(prompt)
        prompt_file = temp_prompt.name

    try:
        rendered_cmd = COPILOT_CLI_TEMPLATE.format(
            prompt=prompt,
            prompt_file=prompt_file,
            repo_root=repo_root,
            cwd=working_dir,
        )
        return run_command(rendered_cmd, cwd=working_dir)
    finally:
        try:
            os.remove(prompt_file)
        except OSError:
            pass


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50]


def issue_files(issue):
    files = set()
    component = issue.get("component", "")
    if ":" in component:
        files.add(component.split(":", 1)[1])

    for location in issue.get("flows", []):
        for flow_location in location.get("locations", []):
            flow_component = flow_location.get("component", "")
            if ":" in flow_component:
                files.add(flow_component.split(":", 1)[1])

    for secondary in issue.get("secondaryLocations", []):
        secondary_component = secondary.get("component", "")
        if ":" in secondary_component:
            files.add(secondary_component.split(":", 1)[1])

    return sorted(files)


def get_repo_root():
    result = run_command(["git", "rev-parse", "--show-toplevel"], check=True)
    return result.stdout.strip()


def get_current_branch(repo_root):
    result = run_command(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo_root, check=True
    )
    return result.stdout.strip()


def create_worktree(repo_root, branch_name):
    worktrees_root = Path(repo_root) / ".worktrees"
    worktrees_root.mkdir(parents=True, exist_ok=True)
    worktree_dir = worktrees_root / branch_name.replace("/", "-")

    if worktree_dir.exists():
        raise RuntimeError(
            f"Worktree path already exists: {worktree_dir}. Remove it or choose a different branch."
        )

    run_command(
        ["git", "worktree", "add", "-b", branch_name, str(worktree_dir), "HEAD"],
        cwd=repo_root,
        check=True,
    )
    return str(worktree_dir)


def run_quality_gates(worktree_dir):
    quality = {}
    quality["unit"] = run_command(["npm", "run", "test"], cwd=worktree_dir)
    quality["playwright"] = run_command(
        ["npm", "run", "test:playwright"], cwd=worktree_dir
    )
    quality["lint"] = run_command(["npm", "run", "lint"], cwd=worktree_dir)
    return quality


def all_gates_passed(quality):
    return all(result.returncode == 0 for result in quality.values())


def summarize_quality(quality):
    lines = []
    for name, result in quality.items():
        status = "PASS" if result.returncode == 0 else "FAIL"
        tail_stdout = "\n".join(result.stdout.splitlines()[-20:])
        tail_stderr = "\n".join(result.stderr.splitlines()[-20:])
        lines.append(
            f"{name}: {status}\nstdout_tail:\n{tail_stdout}\nstderr_tail:\n{tail_stderr}"
        )
    return "\n\n".join(lines)


def build_single_prompt(project_key, issue, coverage_value, attempt, quality_summary):
    files = issue_files(issue)
    files_text = "\n".join(f"- {path}" for path in files) if files else "- Unknown"
    return f"""
You are GitHub Copilot CLI running inside a git worktree for project '{project_key}'.

Objective:
Resolve this SonarQube issue while preserving behavior and passing quality gates.

Issue details:
- key: {issue.get('key')}
- severity: {issue.get('severity')}
- type: {issue.get('type')}
- rule: {issue.get('rule')}
- message: {issue.get('message')}
- component: {issue.get('component')}
- line: {issue.get('line')}
- current file coverage (if available): {coverage_value}

Related files/functions from Sonar issue metadata:
{files_text}

Attempt number: {attempt}

Required workflow:
1) Add or improve tests for issue-related files/functions so coverage for these files is at least 95%.
2) Fix the Sonar issue itself.
3) Keep all existing and new tests passing.
4) Ensure lint passes with no new issues.

Execution constraints:
- Prefer minimal, targeted changes.
- Do not weaken tests or disable lint/rules.
- Use project conventions.

Current quality gate outputs from the latest run:
{quality_summary}

Now make the code and test changes directly in this worktree.
""".strip()


def commit_changes(worktree_dir, issue):
    run_command(["git", "add", "-A"], cwd=worktree_dir, check=True)
    status = run_command(["git", "status", "--porcelain"], cwd=worktree_dir, check=True)
    if not status.stdout.strip():
        print("No changes to commit.")
        return False

    message = f"Fix {issue.get('severity', 'UNKNOWN')} Sonar issue {issue.get('key')}"
    run_command(["git", "commit", "-m", message], cwd=worktree_dir, check=True)
    return True


def detect_default_branch(worktree_dir):
    result = run_command(["git", "remote", "show", "origin"], cwd=worktree_dir)
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith("HEAD branch:"):
                return line.split(":", 1)[1].strip()
    return "main"


def push_and_create_pr(worktree_dir, branch_name, issue):
    base_branch = os.environ.get("PR_BASE_BRANCH") or detect_default_branch(worktree_dir)
    title = f"Fix Sonar issue {issue.get('key')}: {issue.get('message', '')[:80]}"
    body = (
        f"Automated fix for SonarQube issue {issue.get('key')}\\n\\n"
        f"- Severity: {issue.get('severity')}\\n"
        f"- Rule: {issue.get('rule')}\\n"
        f"- Component: {issue.get('component')}\\n"
        f"- Verification: npm run test, npm run test:playwright, npm run lint, Sonar re-scan"
    )

    run_command(["git", "push", "-u", "origin", branch_name], cwd=worktree_dir, check=True)
    pr_result = run_command(
        [
            "gh",
            "pr",
            "create",
            "--base",
            base_branch,
            "--head",
            branch_name,
            "--title",
            title,
            "--body",
            body,
        ],
        cwd=worktree_dir,
    )
    if pr_result.returncode != 0:
        print("Warning: Branch pushed but PR creation failed.")
        print(pr_result.stderr)
        return False

    print(pr_result.stdout.strip())
    return True


def mark_unresolvable(issue_key, reason):
    transitions = ["wontfix", "falsepositive"]
    for transition in transitions:
        response = requests.post(
            f"{SONAR_URL}/api/issues/do_transition",
            data={"issue": issue_key, "transition": transition},
            auth=(SONAR_TOKEN, ""),
        )
        if response.status_code == 204:
            requests.post(
                f"{SONAR_URL}/api/issues/add_comment",
                data={"issue": issue_key, "text": reason},
                auth=(SONAR_TOKEN, ""),
            )
            print(f"Marked issue {issue_key} as {transition}.")
            return True

    print(f"Could not transition issue {issue_key}.")
    return False


def main():
    pk = get_project_key()
    if not pk or not SONAR_TOKEN:
        print("Error: SONAR_TOKEN or Project Key (sonar.projectKey) is missing.")
        sys.exit(1)

    repo_root = get_repo_root()

    if not run_analysis(repo_root):
        print("Initial SonarQube analysis failed.")
        sys.exit(1)

    first_issue = fetch_top_issue(pk)
    if not first_issue:
        print("No open issues found in SonarQube.")
        return

    issue_id = first_issue.get("key")
    description = first_issue.get("message", "")
    branch_name = f"fix/{slugify(description)}-{issue_id[:8]}"

    print(
        "Selected initial highest priority issue:\n"
        + _safe_json(
            {
                "key": issue_id,
                "severity": first_issue.get("severity"),
                "message": description,
                "component": first_issue.get("component"),
            }
        )
    )

    worktree_dir = create_worktree(repo_root, branch_name)
    print(f"Created worktree at: {worktree_dir}")

    last_issue = first_issue
    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n--- Attempt {attempt} of {MAX_ATTEMPTS} ---")

        if not run_analysis(worktree_dir):
            print("SonarQube analysis failed in worktree.")
            continue

        current_issue = fetch_top_issue(pk)
        if not current_issue:
            print("No open issues remain. Preparing PR.")
            if commit_changes(worktree_dir, last_issue):
                push_and_create_pr(worktree_dir, branch_name, last_issue)
            return

        last_issue = current_issue
        coverage = fetch_component_coverage(current_issue.get("component", ""))
        baseline_quality = run_quality_gates(worktree_dir)
        prompt = build_single_prompt(
            project_key=pk,
            issue=current_issue,
            coverage_value=coverage,
            attempt=attempt,
            quality_summary=summarize_quality(baseline_quality),
        )

        print("Invoking GitHub Copilot CLI with a single comprehensive prompt...")
        copilot_result = invoke_copilot_cli(prompt, repo_root, worktree_dir)
        if copilot_result.returncode != 0:
            print("Copilot CLI invocation failed for this attempt.")
            print(copilot_result.stderr)
            continue

        quality = run_quality_gates(worktree_dir)
        if not all_gates_passed(quality):
            print("Quality gates failed after Copilot changes; retrying another attempt.")
            print(summarize_quality(quality))
            continue

        if not run_analysis(worktree_dir):
            print("SonarQube analysis failed after changes.")
            continue

        unresolved = fetch_issue_by_key(current_issue.get("key"))
        if unresolved:
            print(f"Issue {current_issue.get('key')} still unresolved; will retry.")
            continue

        print(f"SUCCESS: Issue {current_issue.get('key')} resolved.")
        if commit_changes(worktree_dir, current_issue):
            push_and_create_pr(worktree_dir, branch_name, current_issue)
        else:
            print("No code changes were committed; skipping PR creation.")
        return

    reason = (
        f"Automated remediation failed after {MAX_ATTEMPTS} attempts. "
        "Issue marked unresolvable for manual triage."
    )
    issue_to_mark = last_issue.get("key") if last_issue else issue_id
    if issue_to_mark:
        mark_unresolvable(issue_to_mark, reason)
    print("FAILED: Could not resolve issue within attempt limit.")
    sys.exit(1)


if __name__ == "__main__":
    main()
