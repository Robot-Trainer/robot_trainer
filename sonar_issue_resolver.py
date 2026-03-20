import os
import subprocess
import requests
import time
import sys
import re

from dotenv import load_dotenv

load_dotenv()

# Configuration - Ensure these are set in your environment
SONAR_URL = os.environ.get("SONAR_HOST_URL", "http://localhost:9000").rstrip("/")
SONAR_TOKEN = os.environ.get("SONAR_TOKEN")
PROJECT_KEY = os.environ.get("SONAR_PROJECT_KEY")


def run_command(cmd, log=True):
    if log:
        print(f"Executing: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0 and log:
        print(f"Command failed with error: {result.stderr}")
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
    }
    response = requests.get(url, params=params, auth=(SONAR_TOKEN, ""))
    response.raise_for_status()
    issues = response.json().get("issues", [])
    return issues[0] if issues else None


def wait_for_analysis_completion():
    """Polls the SonarQube CE task status dynamically."""
    report_path = ".scannerwork/report-task.txt"
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
    with open(report_path, "r") as f:
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


def run_analysis():
    print("Initiating SonarQube analysis...")
    # Run the scanner
    run_command(
        f"sonar-scanner -Dsonar.host.url={SONAR_URL} -Dsonar.token={SONAR_TOKEN}"
    )
    return wait_for_analysis_completion()


def invoke_claude_code(message):
    """Correctly invokes the Claude code with workspace context."""
    repo_root = os.getcwd()
    # Using --agent main and --workspace to ensure the agent has repository access
    cmd = f'ollama launch claude --model gpt-oss:20b --yes -- -p "{message}" --add-dir "{repo_root}" --effort max'
    return run_command(cmd)


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50]


def main():
    pk = get_project_key()
    if not pk or not SONAR_TOKEN:
        print("Error: SONAR_TOKEN or Project Key (sonar.projectKey) is missing.")
        sys.exit(1)

    # Initial analysis to get the current state
    run_analysis()
    issue = fetch_top_issue(pk)
    if not issue:
        print("No open issues found in SonarQube.")
        return

    issue_id = issue["key"]
    description = issue["message"]
    # Extract file path from component string (e.g., project:src/main.py -> src/main.py)
    file_path = issue.get("component", "").split(":")[-1]
    severity = issue.get("severity", "UNKNOWN")

    print(f"Selected High Priority Issue: [{severity}] {description} in {file_path}")

    # Create new Git branch
    branch_name = f"fix/{slugify(description)}-{issue_id[:8]}"
    run_command(f"git checkout -b {branch_name}")

    for attempt in range(1, 4):
        print(f"\n--- Attempt {attempt} of 3 ---")

        # Step 1: Fix the issue
        print("Asking Claude Code to resolve the issue...")
        fix_msg = f"In the current repository, resolve this SonarQube {severity} issue in '{file_path}': {description}. Use your file tools to modify the code."
        invoke_claude_code(fix_msg)

        # Step 2: Tests and Linters
        print("Asking Claude Code to run tests and linters...")
        test_msg = "Run the project's tests and linters. If they fail, fix the issues until they pass."
        invoke_claude_code(test_msg)

        # Step 3: Verify the fix (AI check)
        print("Asking Claude Code to verify the fix...")
        verify_msg = f"Verify that the issue '{description}' in '{file_path}' is no longer present. If it still exists, apply a final correction."
        invoke_claude_code(verify_msg)

        # Step 4: Commit/Amend changes
        if attempt == 1:
            run_command("git add .")
            run_command(
                f'git commit -m "Fix {severity} SonarQube issue: {description}"'
            )
        else:
            run_command("git add .")
            run_command("git commit --amend --no-edit")

        # Step 5: Final Verification via SonarQube
        if run_analysis():
            current_issue = fetch_top_issue(pk)
            # If the issue ID is no longer in the list, it's resolved
            if not current_issue or current_issue["key"] != issue_id:
                print("SUCCESS: Issue has been resolved and verified by SonarQube.")
                return
            else:
                print(f"RETRY: Issue {issue_id} is still present in analysis.")
        else:
            print("SonarQube analysis failed to complete successfully.")

    print("FAILED: Could not resolve the issue after 3 attempts.")
    sys.exit(1)


if __name__ == "__main__":
    main()
