# 2026-04-14 Lefthook Docker Build Review

## 背景

Docker 构建时 `simple-git-hooks` 会在 `bun install` 的 prepare 阶段安装 Git hook，容器里没有 `.git` 和 `git`，会产生无意义的 `git: not found` 噪音。切换到 Lefthook 后，如果不调整 Docker install 参数，项目级 `prepare: lefthook install` 仍会在 builder 阶段执行，并因为容器里没有 `git` 而失败。

同一轮排查里还看到 `bun install` 偶发 tarball integrity 校验失败；即使串行化 builder/runner install 后，单个无缓存 install 仍可能因为 Docker 内较高网络并发碰到随机包下载失败。

## 调整

- 将 Git hook 工具从 `simple-git-hooks` 切到 `lefthook`。
- 新增 `lefthook.yml`，pre-commit 运行 `bun run lint:fix`，并启用 `stage_fixed` 保持格式化结果进入提交。
- `package.json` 的 `prepare` 改为 `lefthook install`，本地 `bun install` 会安装 Lefthook hook。
- Dockerfile 的 builder install 改为 `bun install --frozen-lockfile --ignore-scripts --network-concurrency=8`，避免在容器里运行项目级 prepare，并降低 registry 下载并发。
- production 依赖阶段保留 `--ignore-scripts --no-cache`，同时加 `--network-concurrency=8`。

## 验证

- `bun install`
- `bunx lefthook run pre-commit --all-files`
- `bun test tests/start-options.test.ts`
- `bun run lint`
- `bun run typecheck`
- `docker compose build --no-cache --progress=plain`
- `docker compose up -d`
- `docker inspect --format 'status={{.State.Status}} restarting={{.State.Restarting}} exit={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} restarts={{.RestartCount}} started={{.State.StartedAt}}' copilot-api-copilot-api-1`
