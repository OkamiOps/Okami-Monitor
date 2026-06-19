## 2024-05-24 - [Command Injection via Insecure Path Interpolation]
**Vulnerability:** Command injection risk in `shellPath` function within `hermesCollector.js` due to unquoted interpolation of user-controlled path suffixes (e.g. `~/${userInput}`).
**Learning:** Even when handling seemingly innocent configuration values like "home directory paths" (`~/.hermes`), slicing and string concatenation without proper shell quoting can directly lead to remote code execution when those paths are embedded into SSH commands.
**Prevention:** Always use rigorous shell quoting utilities (like `shellQuote`) for all parts of a dynamically constructed path, and rely on safe parameterization or safe string wrappers when concatenating environment variables like `$HOME` with user input.
