# Anchor patterns at the repository root

Every pattern matches from the repository root, so `*.lock` matches only root files and `**/*.lock` matches them at any depth. We chose this over `.gitignore` and CODEOWNERS semantics, where a pattern without a slash matches at any depth, because one rule with no special case is easier to predict and agrees with the product examples such as `docs/**` for the root docs directory. Changing this later would silently change the meaning of every saved rule.
