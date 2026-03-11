---
name: github-projects
description: "GitHub Projects automation and management — create projects, add items, manage fields, and automate project workflows using the GitHub CLI."
metadata:
  {
    "openclaw":
      {
        "emoji": "📋",
        "requires": { "bins": ["gh"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gh",
              "bins": ["gh"],
              "label": "Install GitHub CLI (brew)",
            },
            {
              "id": "apt",
              "kind": "apt",
              "package": "gh",
              "bins": ["gh"],
              "label": "Install GitHub CLI (apt)",
            },
          ],
      },
  }
