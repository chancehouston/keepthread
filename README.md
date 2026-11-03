# Keepthread

**Status: research. Nothing is built, released or distributed yet.**

Keepthread is a personal, experimental browser extension (Chrome first). It is designed to help a reader find the meaningful conversation in a long Reddit comment thread, cutting down repetition and spam-like noise while keeping the humor, the disagreement and the personality of the discussion.

The planned approach:

- It reads only the comments **already loaded** in the page you are viewing. It makes no extra requests and does no crawling.
- It runs a small language model **locally in the browser**. No browsing data leaves the machine.
- It writes a short TL;DR in which every point links to the comments it came from, and which keeps material disagreements and minority views.
- It recommends which exchanges to keep open, and applies those recommendations only through Reddit's own collapse controls, so you can undo every one of them with a click.

It judges conversational behavior, never opinions, and it does not claim to identify bots, propaganda or anyone's intent. It never posts, votes, moderates or touches ads.

## Documents

- [Charter](docs/charter.md): the vision, the boundaries and the first experiment.
- [Research spike](docs/research/README.md): the policy review, the model landscape and the page-structure findings that come before the first specification.

Development follows [Spec-Kit](https://github.com/github/spec-kit) (spec-driven development); see [CLAUDE.md](CLAUDE.md) for the project's conventions.

## Not affiliated with Reddit

Keepthread is an independent project. It is not affiliated with, endorsed by or sponsored by Reddit, Inc. "Reddit" is a trademark of Reddit, Inc., and is used here only to describe the site the extension works on.

## License

[MIT](LICENSE)
