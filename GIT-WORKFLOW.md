# Git 工作流与安全制度

> **适用对象**: 人类开发者 + AI 协作者

---

## 快速参考卡

| 操作 | 命令 | 说明 |
|------|------|------|
| 💾 备份当前工作 | `git save` | 自动提交全部文件，带时间戳 |
| ⏪ 软回滚 | `git undo` | 撤销最近一次 commit，保留文件 |
| ⏮️ 硬回滚 | `git hard-undo` | 完全丢弃最近一次 commit |
| 📸 临时快照 | `git snap` | 保存到 stash，不创建 commit |
| 📋 查看历史 | `git log` | 最近 30 条提交，图形化 |
| 🩺 代码检查 | `git health` | 手动触发 b→o 损坏检测 |
| 🔧 修复损坏 | `git fix-b2o` | 自动修复 b→o 字符损坏 |

---

## 工作流程

### 日常开发

```bash
# === 每次开始工作前 ===
git save          # 创建备份点

# === 工作中频繁提交 ===
git add -A
git commit -m "feat: 做了什么改动"

# === 遇到问题？ ===
git diff          # 查看未暂存的修改
git status        # 查看当前状态
git log       # 查看最近提交

# === 搞砸了？ ===
git undo          # 撤销提交，文件保留
# 或者
git hard-undo     # 完全丢弃
```

### AI 协作开发

```bash
# === AI 开始工作 ===
# AI 会自动执行：
git save          # 创建备份点

# === AI 修改代码 ===
# AI 每完成一个独立改动就会提交：
git add -A && git commit -m "feat: 描述"

# === AI 完成工作 ===
# AI 会执行：
cd client && npx vite build   # 构建验证
git health                     # 代码检查
git save                       # 最终备份
```

### 紧急回滚

```bash
# 情况1：最近一次 commit 有问题，想撤销但保留代码
git undo

# 情况2：最近一次 commit 完全搞砸了，想回到之前的状态
git hard-undo

# 情况3：整个项目想恢复到某个历史版本
git log                          # 找到目标 commit hash
git reset --hard <commit-hash>       # ⚠️ 会丢弃所有后续修改！

# 情况4：只想恢复某个文件
git checkout <commit-hash> -- path/to/file
```

---

## b→o 字符损坏应急处理

### 发生场景
运行了某个脚本，将所有 `b` 字符替换成了 `o`。

### 症状
- CSS 变量 `--bg-color` 变成了 `--og-color`
- `scrollbar` 变成了 `scrolloar`
- `clipboard` 变成了 `clipooard`
- `Object.keys` 变成了 `Ooject.keys`
- 等等...

### 处理流程

```bash
# 1. 自动修复（覆盖所有已知损坏模式）
git fix-b2o

# 2. 检查是否还有遗漏
git health

# 3. 构建验证
cd client && npx vite build

# 4. 提交修复
git add -A && git commit -m "fix: 修复 b→o 字符损坏"
```

### 手动修复（如果自动脚本不完整）
```bash
# 全局搜索损坏模式
grep -rn "scrolloar\|oehavior\|clipooard\|falloack\|githuo" client/src/

# 编辑 .git/fix-b2o-corruption.sh 添加新模式
# 然后重新运行 git fix-b2o
```

---

## 分支策略

```bash
# 默认在 master 分支开发
git branch                    # 查看当前分支

# 大功能可以创建分支
git checkout -b feature/xxx   # 创建并切换到新分支
git checkout master           # 切回 master
git merge feature/xxx         # 合并分支
git branch -d feature/xxx     # 删除已合并的分支
```

---

## Resources/ 目录管理

```
Resources/ 由用户手动管理，内容经常变动：
  - AI 不读取、不修改 Resources/ 下的文件
  - Resources/ 已在 .gitignore 中排除
  - 如需备份 Resources/，请使用 Syncthing 或其他同步工具
  - 例外: Resources/public/level/ 保留在版本控制中
```

---

## Git Hook 说明

### pre-commit（提交前自动运行）
```
检查项：
  ✓ b→o 字符损坏检测（9 种常见模式）
  ✓ debugger 语句检测
  ✓ 大文件检测（>500KB 警告）

如果检查不通过：
  → 修复问题后重新提交
  → 或使用 git commit --no-verify 跳过检查
```

---

## 别名详解

```bash
# git save
#   = git add -A && git commit -m "💾 savepoint: 2026-06-23 14:30:00"
#   一键备份所有修改

# git undo
#   = git reset --soft HEAD~1
#   撤销最近 commit，修改回到暂存区（git add 状态）

# git hard-undo
#   = git reset --hard HEAD~1
#   完全丢弃最近 commit 的所有修改

# git snap
#   = git stash push -u -m "snapshot: 2026-06-23 14:30:00"
#   临时保存修改到 stash（无 commit 记录）
#   恢复: git stash pop

# git log
#   = git log --oneline --graph --decorate -30
#   图形化显示最近 30 条提交

# git health
#   = bash .git/hooks/pre-commit
#   手动运行代码检查

# git fix-b2o
#   = bash .git/fix-b2o-corruption.sh
#   自动修复 b→o 损坏
```
