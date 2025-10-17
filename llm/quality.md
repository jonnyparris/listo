Adhere to the following code quality guidelines:

## Development:
- Local dev: npm run dev
- Build: npm run build
- Deploy: npm run deploy

## Testing:
- Unit tests for handlers and utilities
- Integration tests for Durable Object interactions
- Test commands: npm test, npm run test:watch

## Coding Standards:
- Use TypeScript with strict mode
- Follow RESTful API patterns
- validate all user input
- Add error handling and logging enough for you to debug and fix yourself

## Architecture:
- Keep handlers in separate files under /src/handlers/
- Use middleware pattern for auth/logging
- Store configuration in wrangler.jsonc

## Cloudflare Specific:
- Use Durable Objects for stateful operations
- Leverage KV for caching when appropriate
- Keep memory usage minimal

## Transparent working:
- update any todo items as you complete them
- add and update any helpful rules or hints to a @llms/rules.md in this folder as you learn more about this project and my preferences
- make descriptive git commits as you complete bitesize chunks of new functionality

## UI Validation
- deploy and then check UI output using the browser rendering mcp tool available to you