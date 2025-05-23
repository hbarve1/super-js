const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

function updateVersion(type) {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const [major, minor, patch] = packageJson.version.split('.').map(Number);

        let newVersion;
        switch (type) {
            case 'major':
                newVersion = `${major + 1}.0.0`;
                break;
            case 'minor':
                newVersion = `${major}.${minor + 1}.0`;
                break;
            case 'patch':
                newVersion = `${major}.${minor}.${patch + 1}`;
                break;
            default:
                throw new Error('Invalid version type. Use: major, minor, or patch');
        }

        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`Version updated to ${newVersion}`);
        return newVersion;
    } catch (error) {
        console.error('Error updating version:', error.message);
        process.exit(1);
    }
}

const type = process.argv[2];
if (!type) {
    console.error('Please specify version type: major, minor, or patch');
    process.exit(1);
}

updateVersion(type); 