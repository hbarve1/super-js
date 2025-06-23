# Documentation Versioning

This document explains how versioning works in the Super.js documentation and how to manage different versions.

## Overview

The Super.js documentation uses Docusaurus's built-in versioning system to maintain documentation for different releases. This allows users to:

- View documentation for specific versions
- Access historical documentation
- Understand feature differences between versions
- Maintain backward compatibility information

## Version Structure

```
docs/
├── docs/                    # Current/latest documentation
├── versioned_docs/         # Versioned documentation
│   ├── version-0.2.0/      # Version 0.2.0 docs
│   ├── version-0.1.0/      # Version 0.1.0 docs
│   └── version-0.0.1/      # Version 0.0.1 docs
├── versioned_sidebars/     # Version-specific sidebars
│   ├── version-0.2.0-sidebars.json
│   ├── version-0.1.0-sidebars.json
│   └── version-0.0.1-sidebars.json
├── versions.json           # List of all versions
└── docusaurus.config.ts    # Version configuration
```

## Version Types

### Current Version (`docs/`)
- Contains the latest development documentation
- Shows features that are in development
- Marked as "unreleased" in the version dropdown
- URL: `/docs/`

### Stable Versions (`versioned_docs/version-X.Y.Z/`)
- Contains documentation for specific releases
- Shows features available in that exact version
- Marked as "unmaintained" for older versions
- URL: `/docs/X.Y.Z/`

## Managing Versions

### Creating a New Version

1. **Use the automated script** (recommended):
   ```bash
   cd docs
   node scripts/create-version.js 0.3.0
   ```

2. **Manual process**:
   - Copy current docs to `versioned_docs/version-X.Y.Z/`
   - Create sidebar configuration in `versioned_sidebars/`
   - Update `versions.json`
   - Update `docusaurus.config.ts`

### Updating Version Configuration

Edit `docusaurus.config.ts` to add new versions:

```typescript
versions: {
  current: {
    label: '0.3.0',
    path: '0.3.0',
    banner: 'unreleased',
  },
  '0.2.0': {
    label: '0.2.0',
    path: '0.2.0',
    banner: 'unmaintained',
  },
  // ... other versions
}
```

### Version Banners

- `'unreleased'`: Current development version
- `'unmaintained'`: Older versions no longer maintained
- `'maintained'`: Actively maintained versions

## Version-Specific Content

### What to Version

- **Language Reference**: Syntax and features available in that version
- **Examples**: Code examples that work with that version
- **Type System**: Type features available in that version
- **Tooling**: CLI commands and tools available
- **Changelog**: Release notes for that version

### What Not to Version

- **Blog posts**: Usually remain current
- **Community links**: Should stay up-to-date
- **External resources**: Links to GitHub, etc.

## Best Practices

### 1. Version-Specific Features

When documenting features, clearly indicate version availability:

```markdown
## Conditional Types

> **Available in**: 0.2.0+

Conditional types allow you to create types that depend on other types...
```

### 2. Breaking Changes

Document breaking changes clearly:

```markdown
## Migration from 0.1.0

### Breaking Changes

- Generic constraint syntax updated
- Decorator implementation changed
- Some utility types behavior modified
```

### 3. Feature Deprecation

Mark deprecated features:

```markdown
## Old Syntax (Deprecated)

> **Deprecated in**: 0.2.0
> **Removed in**: 0.3.0

The old syntax is still supported but will be removed in future versions...
```

### 4. Version Compatibility

Always test documentation with the actual version:

```bash
# Test with specific version
npm install -g superjs@0.2.0
superjs --version
```

## URL Structure

- Current: `/docs/intro`
- Version 0.2.0: `/docs/0.2.0/intro`
- Version 0.1.0: `/docs/0.1.0/intro`
- Version 0.0.1: `/docs/0.0.1/intro`

## Version Dropdown

The version dropdown appears in the header and allows users to:

- Switch between different versions
- See which version is current
- Access historical documentation
- Understand version differences

## Maintenance

### Regular Tasks

1. **Update current docs**: Keep latest features documented
2. **Create new versions**: When releasing new versions
3. **Archive old versions**: Mark very old versions as unmaintained
4. **Test version links**: Ensure all internal links work

### Version Lifecycle

1. **Development**: Features documented in current version
2. **Release**: Current becomes a numbered version
3. **Maintenance**: Bug fixes and minor updates
4. **Deprecation**: Mark as unmaintained
5. **Archive**: Remove from active versions

## Troubleshooting

### Common Issues

1. **Version dropdown not showing**: Check `docusaurus.config.ts` configuration
2. **Broken internal links**: Update version-specific links
3. **Missing sidebar**: Ensure sidebar file exists and is correct
4. **Version not appearing**: Check `versions.json` and config

### Debugging

```bash
# Check version structure
ls -la versioned_docs/
ls -la versioned_sidebars/

# Validate JSON files
node -e "console.log(JSON.parse(require('fs').readFileSync('versions.json')))"

# Test version creation
node scripts/create-version.js test-version
```

## Resources

- [Docusaurus Versioning Guide](https://docusaurus.io/docs/versioning)
- [Versioning Best Practices](https://docusaurus.io/docs/versioning#versioning-best-practices)
- [Managing Versions](https://docusaurus.io/docs/versioning#managing-versions) 