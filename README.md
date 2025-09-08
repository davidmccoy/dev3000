# dev3000

Captures your web app's complete development timeline - server logs, browser events, console messages, network requests, and automatic screenshots - in a unified, timestamped feed for AI debugging.

## Quick Start

```bash
pnpm install -g dev3000
dev3000
```

![dev3000 CLI](cli.jpg)

**You can also connect claude code to the mcp-server to have it issue commands to the browser.**

```bash
claude mcp add dev3000 http://localhost:3684/api/mcp/mcp
```

## What it does

Creates a comprehensive log of your development session that AI assistants can easily understand. When you have a bug or issue, Claude can see your server output, browser console, network requests, and screenshots all in chronological order.

The tool monitors your app in a real browser and captures:

- Server logs and console output
- Browser console messages and errors
- Network requests and responses
- Automatic screenshots on navigation, errors, and key events
- Visual timeline at `http://localhost:3684/logs`

![dev3000 Logs Viewer](logs.jpg)

## AI Integration

Give Claude your log file for instant debugging:

```
Read /tmp/dev3000.log
```

Logs are automatically saved with timestamps in `/var/log/dev3000/` (or temp directory) and rotated to keep the 10 most recent per project. The current session is always symlinked to `/tmp/dev3000.log` for easy access.

Or use the MCP server at `http://localhost:3684/api/mcp/mcp` for advanced querying:

- `read_consolidated_logs` - Get recent logs with filtering
- `search_logs` - Regex search with context
- `get_browser_errors` - Extract browser errors by time period
- `execute_browser_action` - Control the browser (click, navigate, screenshot, evaluate, scroll, type)

## Options

```bash
dev3000 [options]

  -p, --port <port>             Your app's port (default: 3000)
  --mcp-port <port>             MCP server port (default: 3684)
  -s, --script <script>         Package.json script to run (default: dev)
  --server-command <command>    Custom server command (overrides --script)
  --profile-dir <dir>           Chrome profile directory (persists cookies/login state)
  --framework <framework>       Framework for error detection (default: auto)
                                Options: rails, nextjs, django, express, auto
  --process-manager <manager>   Process manager for output parsing (default: auto)
                                Options: foreman, docker-compose, pm2, standard, auto
  --debug                       Enable debug logging to console
```

Examples:

```bash
# Custom port for Vite
dev3000 --port 5173

# Persistent login state
dev3000 --profile-dir ./chrome-profile

# Rails app with Foreman (auto-detected)
dev3000 --server-command "bin/dev"

# Node.js app using Foreman
dev3000 --server-command "foreman start" --framework express

# Rails app using Docker Compose
dev3000 --server-command "docker-compose up" --framework rails --process-manager docker-compose
```

---

_Made by [elsigh](https://github.com/elsigh)_
