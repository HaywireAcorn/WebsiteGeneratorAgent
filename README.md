# WebsiteBuilder

An AI agent that builds responsive websites from plain-English prompts. Describe the site you want, and the agent plans it, then uses tools to write the HTML, CSS and JavaScript files for you.

Built with [LangChain](https://docs.langchain.com/) and [LangGraph](https://langchain-ai.github.io/langgraph/).

## Note

It is recommended that you use the _*uv*_ python module as your project manager

## Features

- **Prompt to website:** describe a site and get a working `main.html`, `styles.css` and `scripts.js`
- **Tool calling:** the agent writes and reads files through tools instead of just printing code
- **Agent loop:** the model calls tools, sees the results, and keeps going until the job is done
- **Conversation memory:** ask for changes in follow-up messages ("make the header darker")
- **Consistent, responsive output:** the system prompt asks for a consistent color palette and responsive layouts

## How it works

```
        ┌──────────┐   tool calls?   ┌───────────┐
START → │ llm_call │ ──── yes ─────→ │ tool_node │
        └──────────┘ ←────────────── └───────────┘
              │ no
              ↓
             END
```

1. Your message goes to the model together with the system prompt and the conversation so far.
2. If the model asks to use a tool (for example, writing a file), `tool_node` runs it and sends the result back to the model.
3. This repeats until the model replies without requesting a tool, and that reply is printed.

## Project structure

```
WebsiteBuilder/
├── main.py        # LangGraph graph (nodes, edges) and the chat loop
├── agent.py       # Model setup and tool definitions
├── workspace/     # Generated websites are written here
└── README.md
```

## Getting started

### Requirements

- Python 3.10 or newer
- An API key for your model provider

Never commit your API key to the repository.

### Run

Type a message at the `Enter Message:` prompt, for example:

```
Enter Message: Build a landing page for a coffee shop with a menu section and a contact form
```

When the agent finishes, open `workspace/main.html` in your browser.

## Example prompts

- "A portfolio site for a photographer with a gallery section"
- "A single-page landing page for a mobile app, dark theme"
- "Add a pricing section with three tiers" (as a follow-up)
- "Change the color palette to blue and white" (as a follow-up)

## Notes

- The agent is instructed to generate only three files: `main.html`, `styles.css` and `scripts.js`.
- Generated code is written to disk by the agent, so review it before publishing it anywhere.
- A recursion limit caps how many steps the agent can take in one turn, so it cannot loop forever.

## Roadmap

- [ ] Screenshot tool (Playwright) so the agent can check its own layout and fix problems
- [ ] Planning step where you approve the pages and style before any code is written
- [ ] Web interface with a live preview (NiceGUI)
- [ ] Support for multi-page sites

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## License

Add a license of your choice (for example [MIT](https://choosealicense.com/licenses/mit/)) and name it here.
