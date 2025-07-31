# Contributing to CastPlan MCP Server

First off, thank you for considering contributing to CastPlan MCP! 🎉

CastPlan MCP is a universal MCP server designed to work with all LLM clients and package managers. We appreciate all contributions that help make this project better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. By participating, you are expected to uphold these values:

- **Be respectful** and inclusive in your language and actions
- **Be collaborative** and help others learn and grow
- **Be constructive** when giving feedback
- **Be patient** with newcomers and those learning

## 🤝 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/castplan/automation-mcp/issues) to avoid duplicates.

When filing a bug report, please include:
- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (OS, Node.js version, package manager, LLM client)
- **Screenshots or logs** if applicable

### 💡 Suggesting Enhancements

Enhancement suggestions are welcome! Please:
- Check existing [feature requests](https://github.com/castplan/automation-mcp/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
- Clearly describe the feature and its benefits
- Consider the scope and impact on existing functionality
- Provide mockups or examples if helpful

### 🔧 Code Contributions

We welcome code contributions! Areas where help is especially appreciated:

- **Platform compatibility** improvements
- **LLM client integrations** for new or emerging clients
- **Package manager support** enhancements
- **Performance optimizations**
- **Test coverage** improvements
- **Documentation** updates
- **Bug fixes** and stability improvements

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher (or yarn/pnpm)
- **Python** 3.8+ (for Python bridge development)
- **Git** for version control

### Local Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/automation-mcp.git
   cd automation-mcp
   ```

2. **Install dependencies**:
   ```bash
   # Node.js dependencies
   npm install
   
   # Python bridge dependencies (optional)
   cd python-bridge
   pip install -e .[dev]
   cd ..
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

5. **Start development mode**:
   ```bash
   npm run dev
   ```

### Project Structure

```
castplan-mcp/
├── src/                    # TypeScript source code
│   ├── services/          # Core services (BMAD, Docs, Hooks)
│   ├── tools/             # MCP tools implementation (tools, resources)
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration management
│   └── cli.ts             # CLI entry point  
├── python-bridge/          # Python wrapper
│   ├── src/castplan_automation/
│   └── tests/
├── dist/                   # Compiled JavaScript
├── scripts/               # Build and deployment scripts
├── __tests__/             # Test files
└── docs/                  # Documentation
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure tests pass**: `npm test`
2. **Check linting**: `npm run lint` (if available)
3. **Build successfully**: `npm run build`
4. **Update documentation** if needed
5. **Follow commit message conventions** (see below)

### Commit Message Format

We use conventional commits for clear history:

```
type(scope): brief description

Longer description if needed

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(cli): add support for new --config flag
fix(python-bridge): resolve uv installation issues
docs(readme): update installation instructions
```

### Pull Request Guidelines

1. **Create feature branch** from `main`
2. **Make focused changes** - one feature/fix per PR
3. **Write clear PR description** with:
   - What changes were made
   - Why the changes were needed
   - How the changes were tested
   - Any breaking changes or migration notes
4. **Request review** from maintainers
5. **Address feedback** constructively
6. **Keep PR updated** with main branch if needed

## 🎨 Style Guidelines

### TypeScript/JavaScript

- **Use TypeScript** for all new code
- **Follow existing patterns** in the codebase
- **Prefer explicit types** over `any`
- **Use meaningful variable names**
- **Add JSDoc comments** for public APIs
- **Keep functions focused** and single-purpose

### Python

- **Follow PEP 8** style guidelines
- **Use type hints** for function signatures
- **Write docstrings** for modules, classes, and functions
- **Use meaningful variable names**
- **Keep imports organized** (standard → third-party → local)

### General Guidelines

- **Use consistent indentation** (2 spaces for JS/TS, 4 for Python)
- **No trailing whitespace**
- **End files with newline**
- **Keep lines under 100 characters** when reasonable
- **Use descriptive commit messages**

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testNamePattern="specific test"

# Run with coverage
npm run test:coverage

# Python bridge tests
cd python-bridge && python -m pytest
```

### Writing Tests

- **Write tests** for new functionality
- **Update tests** when modifying existing code
- **Use descriptive test names** that explain what is being tested
- **Test both success and error cases**
- **Mock external dependencies** appropriately

### Test Structure

```typescript
describe('Feature Name', () => {
  describe('when condition', () => {
    it('should behave in expected way', async () => {
      // Arrange
      const input = setupTestInput();
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

## 📚 Documentation

### Documentation Standards

- **Keep docs up-to-date** with code changes
- **Use clear, concise language**
- **Include examples** where helpful
- **Test documentation** by following instructions
- **Consider all user levels** (beginner to advanced)

### Documentation Types

- **README.md**: Overview and quick start
- **INSTALLATION.md**: Detailed installation instructions
- **Code comments**: Explain complex logic
- **JSDoc/docstrings**: API documentation
- **CHANGELOG.md**: Track version changes

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

### High Priority
- **New LLM client integrations** (Bolt, Windsurf, etc.)
- **Package manager improvements** (better error handling, detection)
- **Cross-platform testing** and compatibility fixes
- **Performance optimizations** for large projects
- **Test coverage** improvements

### Medium Priority
- **CLI enhancements** (better help, more commands)
- **Configuration validation** and error messages
- **Documentation improvements** and examples
- **Developer experience** improvements

### Low Priority
- **Code refactoring** for maintainability
- **Build process** optimizations
- **Additional utility functions**
- **Code style** and formatting improvements

## 🚀 Getting Help

If you need help with contributing:

- **GitHub Discussions**: [Ask questions](https://github.com/castplan/automation-mcp/discussions)
- **GitHub Issues**: [Report problems](https://github.com/castplan/automation-mcp/issues)
- **Email**: [support@castplan.dev](mailto:support@castplan.dev)

## 🎉 Recognition

Contributors will be:
- **Listed** in our README
- **Credited** in release notes
- **Thanked** in our community channels
- **Invited** to help shape the project's future

---

**Thank you for contributing to CastPlan MCP! Together, we're building something amazing for the entire AI development community.** 🚀