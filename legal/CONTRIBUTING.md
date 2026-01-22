# Contributing to powersoft365hackathon

This repository is maintained by **KMT-team** for the powersoft365hackathon project.  
Our workflow is simple, collaborative, and beginner-friendly.  
Please follow the guidelines below when contributing.

---

## Branching

We use personal branches for all development work:

- `backEndKaterina`
- `backEndMarios`
- `frontEndThodoris`

Each member works on their own branch, pulls updates from others, and pushes changes back to their personal branch.  
This keeps everyone working on the same repo without blocking each other.

---

## Commit Messages

Commit messages should be:

- **Simple**
- **Descriptive**
- **Clear about what changed**

After pushing, share a short explanation in our Discord chat so the team stays aligned.

**Example:**
```
Updated guest login flow, fixed session creation
```

If you're stuck or unsure how to fix something, push your work with a message explaining the issue so others can help.

---

## Code Style

Our code should remain:

- **Simple**
- **Minimal**
- **Navigable**
- **Commented where needed**

**Tech stack:**

- Backend: Go
- Middleware: JavaScript
- Frontend: HTML + CSS
- Database: PostgreSQL

Write code that a beginner teammate can understand.

---

## Testing Before Pushing

Before pushing your changes:

1. Run your code locally
2. Test the feature you modified
3. Ensure nothing obvious breaks

If something breaks and you can't fix it:

1. Push anyway
2. Add a clear commit message explaining the issue
3. Let the team know so someone can help

---

## Security

Security is handled through:

- `.gitignore`
- Avoiding committing secrets or environment variables

**Do not push `.env` files, passwords, or tokens.**

---

## Collaboration & Communication

We collaborate by:

- Reaching out on Discord
- Calling when needed
- Meeting in person when helpful
- Sharing ideas openly
- Helping each other learn and solve problems

If you plan a new feature or change, communicate it early so the team stays aligned.

---

## Merging

We regularly merge the latest versions of all branches into our personal branches.  
This keeps everyone working with the most up-to-date code and avoids conflicts.
