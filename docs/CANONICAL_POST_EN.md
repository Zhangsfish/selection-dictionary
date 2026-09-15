# I made a minimal selection dictionary for ChatGPT / Claude / Gemini, and open-sourced the AI adaptation guide too

Recently, I had a very small pain point.

I use AI tools such as ChatGPT and Claude a lot. When they answer questions in Chinese, they often mix in some English. Sometimes I can roughly understand the whole sentence but do not know one of the words; other times, there is a short sentence I do not understand.

Opening an immersive or whole-page translation tool for such a small thing has always felt heavy and troublesome to me.

So I asked Codex to make a very small Chrome extension for me, called Selection Dictionary.

What it does now is simple:

Double-click or select an English word, and it immediately shows a Chinese definition and phonetic notation. Select a sentence or a short paragraph, and it uses Chrome's built-in local translation. Click the speaker to hear the English pronunciation.

Word lookup uses a local dictionary and does not need an API. The project also has no account system, server of its own, or analytics. What matters most to me is that it is very fast and solves only the one thing I actually need.

The project is here:

https://github.com/Zhangsfish/selection-dictionary

My main reason for releasing it is not to turn it into a product, and I do not care much about stars, likes, or user numbers.

I increasingly feel that, with the arrival of AI coding agents, the way software is produced for many small and personal needs may change.

In the past, when you had a need, you either found an existing product and put up with its extra features, or developed something from scratch yourself.

In the future, it may look more like this: you tell an AI what you want, it first searches GitHub and the web for something that already solves 70%–90% of the problem, and then modifies the remaining part on top of that.

So in addition to publishing the source code, I specifically organized AGENTS.md, ADAPTATION_GUIDE.md, architecture documentation, tests, and verification records. The purpose is that when the next coding agent—ChatGPT, Codex, Claude Code, or something similar—gets this repo, it does not need to research selection listeners, popups, concurrent cancellation, the local dictionary, and browser tests all over again.

If you happen to have exactly the same problem as I do, you can use it directly.

If your need differs only slightly—for example, you want Japanese instead, want to support another website, replace the dictionary, change the UI, or simply turn it into another similar small tool—I recommend that you do not start from scratch:

Give this GitHub link directly to your AI and tell it to modify this project.

The fewer solved problems we solve again, the fewer tokens we burn.
