#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node create-version.js <version>');
  console.error('Example: node create-version.js 0.3.0');
  process.exit(1);
}

const docsDir = path.join(__dirname, '..');
const versionedDocsDir = path.join(docsDir, 'versioned_docs');
const versionedSidebarsDir = path.join(docsDir, 'versioned_sidebars');

// Create version directory
const versionDir = path.join(versionedDocsDir, `version-${version}`);
if (!fs.existsSync(versionDir)) {
  fs.mkdirSync(versionDir, { recursive: true });
  console.log(`Created version directory: ${versionDir}`);
}

// Copy current docs to version directory
const currentDocsDir = path.join(docsDir, 'docs');
if (fs.existsSync(currentDocsDir)) {
  const copyRecursive = (src, dest) => {
    if (fs.statSync(src).isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(file => {
        copyRecursive(path.join(src, file), path.join(dest, file));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  copyRecursive(currentDocsDir, versionDir);
  console.log(`Copied current docs to version ${version}`);
}

// Create sidebar for the version
const sidebarContent = {
  [`version-${version}-docs`]: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction"
    },
    {
      type: "doc",
      id: "language-reference",
      label: "Language Reference"
    },
    {
      type: "doc",
      id: "examples",
      label: "Examples"
    },
    {
      type: "doc",
      id: "type-system",
      label: "Type System"
    },
    {
      type: "doc",
      id: "tooling",
      label: "Tooling"
    },
    {
      type: "category",
      label: "Changelog",
      items: [
        "changelog",
        `changelog/${version}`
      ]
    }
  ]
};

const sidebarFile = path.join(versionedSidebarsDir, `version-${version}-sidebars.json`);
fs.writeFileSync(sidebarFile, JSON.stringify(sidebarContent, null, 2));
console.log(`Created sidebar configuration: ${sidebarFile}`);

// Update versions.json
const versionsFile = path.join(docsDir, 'versions.json');
let versions = [];
if (fs.existsSync(versionsFile)) {
  versions = JSON.parse(fs.readFileSync(versionsFile, 'utf8'));
}

if (!versions.includes(version)) {
  versions.unshift(version); // Add to beginning
  fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));
  console.log(`Updated versions.json`);
}

console.log(`\nVersion ${version} created successfully!`);
console.log(`\nNext steps:`);
console.log(`1. Update docusaurus.config.ts to add the new version`);
console.log(`2. Create changelog entry for version ${version}`);
console.log(`3. Update version-specific documentation as needed`);
console.log(`4. Test the version dropdown in the documentation`); 