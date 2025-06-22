# Blog Templates

This directory contains templates for creating consistent blog posts for the Super.js project.

## Templates

### Release Template (`release-template.md`)

Use this template when announcing new releases of Super.js.

#### How to Use

1. **Copy the template**:
   ```bash
   cp release-template.md ../YYYY-MM-DD-super-js-X-X-X-released.md
   ```

2. **Update the frontmatter**:
   ```yaml
   ---
   slug: super-js-X-X-X-released
   title: Super.js X.X.X Released - [Brief Description]
   authors: [superjs-team]
   tags: [announcement, release, typescript, compiler]
   ---
   ```

3. **Replace placeholders**:
   - `X.X.X` with the actual version number
   - `[Brief Description]` with a short description
   - `[descriptions]` with actual content
   - Update all code examples and migration steps

4. **Add real content**:
   - Actual features and improvements
   - Real breaking changes (if any)
   - Actual performance metrics
   - Real community contributions
   - Current roadmap items

#### Required Sections

Every release blog post should include:

- [ ] **What's New**: Detailed feature descriptions with code examples
- [ ] **Breaking Changes**: Any breaking changes with migration steps
- [ ] **Performance Improvements**: Quantified performance gains
- [ ] **Migration Guide**: Step-by-step upgrade instructions
- [ ] **What's Next**: Roadmap and future plans
- [ ] **Community Contributions**: Credit to contributors
- [ ] **Resources**: Links to documentation and resources
- [ ] **Get Started**: Installation and usage instructions
- [ ] **Feedback**: Ways for users to provide feedback

#### Best Practices

1. **Be Specific**: Include actual code examples and metrics
2. **Be Honest**: Don't overhype features or hide breaking changes
3. **Be Helpful**: Provide clear migration steps and resources
4. **Be Grateful**: Thank contributors and the community
5. **Be Consistent**: Follow the established format and tone

## Creating Other Blog Posts

For non-release blog posts, you can create new templates or use the release template as a starting point. Common blog post types include:

- **Feature Announcements**: New features before release
- **Tutorial Posts**: Step-by-step guides
- **Community Spotlights**: Highlighting contributors
- **Technical Deep Dives**: Detailed technical explanations
- **Project Updates**: General project news

## Template Maintenance

- Keep templates up to date with current project structure
- Update links and references as needed
- Review and improve templates based on feedback
- Ensure templates reflect current best practices

## Example Usage

```bash
# Create a new release blog post
cp templates/release-template.md ../2024-02-01-super-js-0-3-0-released.md

# Edit the new file
vim ../2024-02-01-super-js-0-3-0-released.md

# Test locally
npm start

# Commit and push
git add ../2024-02-01-super-js-0-3-0-released.md
git commit -m "Add release blog post for 0.3.0"
git push
``` 