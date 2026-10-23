# Contributing

Thanks for helping Telugu creators. Support is best-effort.

## Where to start
- Pick an open problem from the end of [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and mention its number in an
  issue before larger work.
- Small fixes (Telugu spellings in examples, docs, tests) can go straight to a pull request.

## Rules that keep the toolkit trustworthy
1. **Never commit real footage, transcripts, voices, faces, or anyone's private data.** Use synthetic examples
   (invented sentences), like `examples/`.
2. **No secrets** (API keys, tokens, passwords) and no machine-specific paths.
3. **Captions keep the spoken words**: corrections fix spelling and mishearing only, never rephrase.
4. **Fail closed**: new validators refuse ambiguous or unapproved input instead of guessing.
5. **Tests first** for behaviour changes: `npm test` must pass (Node ≥ 20).
6. Do not vendor third-party code, models, fonts or binaries; add run-time dependencies to
   [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licence of contributions
By contributing you agree that your contribution is released under the MIT License of this repository.
